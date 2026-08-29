<?php

namespace App\Services\Leave;

use App\Models\Affiliation;
use App\Models\ExternalIdMapping;
use App\Models\IntegrationDelivery;
use App\Models\LeaveExportBatch;
use App\Models\LeaveExportItem;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\Governance\AuditService;
use App\Services\Integrations\SpecialAllowancesClient;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class LeaveSnapshotService
{
    public function __construct(
        private readonly SpecialAllowancesClient $client,
        private readonly AuditService $audit,
    ) {}

    public function prepare(int $year, int $month, User $actor): LeaveExportBatch
    {
        if ($month < 1 || $month > 12) {
            throw ValidationException::withMessages(['month' => 'เดือนต้องอยู่ระหว่าง 1 ถึง 12']);
        }

        $affiliation = Affiliation::query()
            ->where('code', config('onedata.default_affiliation_code', 'YALA-PAO'))
            ->first();

        if (! $affiliation) {
            throw ValidationException::withMessages(['affiliation' => 'ยังไม่มีข้อมูลสังกัด กรุณา sync master data ก่อน']);
        }

        $periodStart = CarbonImmutable::create($year, $month, 1)->startOfDay();
        $periodEnd = $periodStart->endOfMonth();
        $tenantIds = $affiliation->tenants()->pluck('id');
        $leaves = LeaveRequest::query()
            ->with(['person', 'tenant'])
            ->whereIn('tenant_id', $tenantIds)
            ->where('status', 'CONFIRMED')
            ->whereDate('starts_on', '<=', $periodEnd)
            ->whereDate('ends_on', '>=', $periodStart)
            ->orderBy('person_id')
            ->orderBy('starts_on')
            ->get();

        $entries = [];
        $items = [];
        $unmappedPersonIds = [];

        foreach ($leaves as $leave) {
            $mapping = ExternalIdMapping::query()
                ->where('system', 'special_allowances')
                ->where('entity_type', 'person')
                ->where('local_id', $leave->person_id)
                ->first();

            $externalEmployeeId = $mapping?->external_id;
            if (! $externalEmployeeId) {
                $unmappedPersonIds[] = $leave->person_id;
            }

            $dates = $this->datesWithinPeriod($leave, $periodStart, $periodEnd);
            $durationDays = $leave->duration_days !== null
                ? (float) $leave->duration_days
                : (float) ($leave->starts_on->diffInDays($leave->ends_on) + 1);
            $entry = [
                'one_data_leave_id' => $leave->id,
                'external_employee_id' => $externalEmployeeId,
                'type' => $leave->leave_type,
                'starts_on' => $leave->starts_on->toDateString(),
                'ends_on' => $leave->ends_on->toDateString(),
                'dates' => $dates,
                'duration_days' => count($dates) === $leave->starts_on->diffInDays($leave->ends_on) + 1
                    ? $durationDays
                    : (float) count($dates),
                'revision' => (int) $leave->revision,
            ];

            $groupKey = $externalEmployeeId ?: 'unmapped:'.$leave->person_id;
            $entries[$groupKey] ??= [
                'special_employee_id' => $externalEmployeeId,
                'leave_entries' => [],
            ];
            $entries[$groupKey]['leave_entries'][] = $entry;

            $items[] = [
                'leave_request_id' => $leave->id,
                'person_id' => $leave->person_id,
                'external_employee_id' => $externalEmployeeId,
                'external_leave_type' => $leave->leave_type,
                'payload' => $entry,
            ];
        }

        $content = [
            'contract_version' => '1.0',
            'period' => sprintf('%04d-%02d', $year, $month),
            'period_year' => $year,
            'period_month' => $month,
            'employees' => array_values($entries),
            'unmapped_person_ids' => array_values(array_unique($unmappedPersonIds)),
        ];
        $sourceHash = hash('sha256', $this->canonicalJson($content));
        $idempotencyKey = 'leave-snapshot:'.$affiliation->id.':'.$year.'-'.$month.':'.$sourceHash;

        $existing = LeaveExportBatch::query()->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            return $existing->load('items');
        }

        return DB::transaction(function () use (
            $affiliation,
            $year,
            $month,
            $sourceHash,
            $idempotencyKey,
            $items,
            $actor,
        ): LeaveExportBatch {
            $version = ((int) LeaveExportBatch::query()
                ->where('affiliation_id', $affiliation->id)
                ->where('period_year', $year)
                ->where('period_month', $month)
                ->max('snapshot_version')) + 1;

            $batch = LeaveExportBatch::create([
                'affiliation_id' => $affiliation->id,
                'period_year' => $year,
                'period_month' => $month,
                'snapshot_version' => $version,
                'status' => 'PENDING',
                'idempotency_key' => $idempotencyKey,
                'source_cutoff' => now()->toIso8601String(),
                'source_hash' => $sourceHash,
                'item_count' => count($items),
            ]);

            foreach ($items as $item) {
                LeaveExportItem::create([
                    'batch_id' => $batch->id,
                    'leave_request_id' => $item['leave_request_id'],
                    'person_id' => $item['person_id'],
                    'external_employee_id' => $item['external_employee_id'],
                    'external_leave_type' => $item['external_leave_type'],
                    'payload' => $item['payload'],
                    'source_hash' => hash('sha256', $this->canonicalJson($item['payload'])),
                ]);
            }

            $this->audit->record(
                'leave_snapshot.prepared',
                'LeaveExportBatch',
                $batch->id,
                null,
                [
                    'period_year' => $year,
                    'period_month' => $month,
                    'snapshot_version' => $version,
                    'item_count' => count($items),
                    'source_hash' => $sourceHash,
                ],
                ['system' => 'special_allowances'],
                $actor->id,
                null,
                $affiliation->id,
            );

            return $batch->load('items');
        });
    }

    public function send(LeaveExportBatch $batch, User $actor): LeaveExportBatch
    {
        $batch->loadMissing('items');

        if ($batch->status === 'ACKNOWLEDGED') {
            return $batch;
        }

        $unmapped = $batch->items->whereNull('external_employee_id');
        $dryRun = (bool) config('services.special_allowances.dry_run', true);
        if ($unmapped->isNotEmpty() && ! $dryRun) {
            throw ValidationException::withMessages([
                'integration' => 'ยังจับคู่บุคลากรกับระบบ ฉ. ไม่ครบ จึงส่ง snapshot จริงไม่ได้',
            ]);
        }

        $requestId = (string) Str::uuid();
        $delivery = IntegrationDelivery::create([
            'batch_id' => $batch->id,
            'system' => 'special_allowances',
            'operation' => 'leave_snapshot',
            'status' => 'SENDING',
            'attempt' => ((int) $batch->deliveries()->max('attempt')) + 1,
            'request_id' => $requestId,
            'started_at' => now(),
        ]);

        if ($dryRun) {
            $batch->update([
                'status' => 'DRY_RUN',
                'response_payload' => [
                    'dry_run' => true,
                    'unmapped_items' => $unmapped->count(),
                    'request_id' => $requestId,
                ],
            ]);
            $delivery->update([
                'status' => 'DRY_RUN',
                'finished_at' => now(),
                'response_payload' => ['dry_run' => true, 'unmapped_items' => $unmapped->count()],
            ]);
            $this->audit->record(
                'leave_snapshot.dry_run',
                'LeaveExportBatch',
                $batch->id,
                null,
                ['status' => 'DRY_RUN', 'unmapped_items' => $unmapped->count()],
                ['system' => 'special_allowances'],
                $actor->id,
                null,
                $batch->affiliation_id,
            );

            return $batch->fresh(['items', 'deliveries']);
        }

        try {
            $response = $this->client->sendLeaveSnapshot($this->payload($batch));
            $externalBatchId = data_get($response, 'data.batch_id')
                ?? data_get($response, 'data.id')
                ?? data_get($response, 'batch_id')
                ?? data_get($response, 'id');

            $batch->update([
                'status' => 'ACKNOWLEDGED',
                'sent_at' => now(),
                'acknowledged_at' => now(),
                'external_batch_id' => $externalBatchId,
                'response_payload' => $response,
                'error_message' => null,
            ]);
            $delivery->update([
                'status' => 'ACKNOWLEDGED',
                'finished_at' => now(),
                'response_payload' => $response,
            ]);
            $this->audit->record(
                'leave_snapshot.acknowledged',
                'LeaveExportBatch',
                $batch->id,
                null,
                ['status' => 'ACKNOWLEDGED', 'external_batch_id' => $externalBatchId],
                ['system' => 'special_allowances'],
                $actor->id,
                null,
                $batch->affiliation_id,
            );
        } catch (\Throwable $exception) {
            $batch->update(['status' => 'FAILED', 'error_message' => $exception->getMessage()]);
            $delivery->update([
                'status' => 'FAILED',
                'finished_at' => now(),
                'error_message' => $exception->getMessage(),
            ]);
            $this->audit->record(
                'leave_snapshot.failed',
                'LeaveExportBatch',
                $batch->id,
                null,
                ['status' => 'FAILED', 'error' => $exception->getMessage()],
                ['system' => 'special_allowances'],
                $actor->id,
                null,
                $batch->affiliation_id,
            );

            throw $exception;
        }

        return $batch->fresh(['items', 'deliveries']);
    }

    /** @return array<string, mixed> */
    public function payload(LeaveExportBatch $batch): array
    {
        $batch->loadMissing('items');
        $employees = [];

        foreach ($batch->items as $item) {
            $key = $item->external_employee_id ?: 'unmapped:'.$item->person_id;
            $employees[$key] ??= [
                'special_employee_id' => $item->external_employee_id,
                'leave_entries' => [],
            ];
            $employees[$key]['leave_entries'][] = $item->payload;
        }

        return [
            'contract_version' => '1.0',
            'period' => sprintf('%04d-%02d', $batch->period_year, $batch->period_month),
            'period_year' => (int) $batch->period_year,
            'period_month' => (int) $batch->period_month,
            'snapshot_version' => (int) $batch->snapshot_version,
            'idempotency_key' => $batch->idempotency_key,
            'source_cutoff' => $batch->source_cutoff,
            'source_hash' => $batch->source_hash,
            'employees' => array_values($employees),
        ];
    }

    /** @return list<string> */
    private function datesWithinPeriod(LeaveRequest $leave, CarbonImmutable $periodStart, CarbonImmutable $periodEnd): array
    {
        $start = CarbonImmutable::parse($leave->starts_on->toDateString());
        $end = CarbonImmutable::parse($leave->ends_on->toDateString());
        $cursor = $start->greaterThan($periodStart) ? $start : $periodStart;
        $last = $end->lessThan($periodEnd) ? $end : $periodEnd;
        $dates = [];

        while ($cursor->lessThanOrEqualTo($last)) {
            $dates[] = $cursor->toDateString();
            $cursor = $cursor->addDay();
        }

        return $dates;
    }

    private function canonicalJson(array $value): string
    {
        $normalize = function (mixed $item) use (&$normalize): mixed {
            if (! is_array($item)) {
                return $item;
            }

            if (array_is_list($item)) {
                return array_map($normalize, $item);
            }

            ksort($item);
            foreach ($item as $key => $child) {
                $item[$key] = $normalize($child);
            }

            return $item;
        };

        $json = json_encode($normalize($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to canonicalize leave snapshot.');
        }

        return $json;
    }
}
