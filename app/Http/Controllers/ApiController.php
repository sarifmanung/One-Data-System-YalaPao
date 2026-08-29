<?php

namespace App\Http\Controllers;

use App\Models\LeaveExportBatch;
use App\Models\LeaveRequest;
use App\Models\Person;
use App\Services\Integrations\SpecialMasterDataSyncService;
use App\Services\Leave\LeaveSnapshotService;
use App\Services\Platform\TenantAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApiController extends Controller
{
    public function __construct(
        private readonly TenantAccess $tenantAccess,
        private readonly SpecialMasterDataSyncService $masterDataSync,
        private readonly LeaveSnapshotService $snapshotService,
    ) {}

    public function health(): JsonResponse
    {
        try {
            DB::select('select 1');

            return response()->json([
                'status' => 'ok',
                'service' => 'one-data-system',
                'database' => 'ok',
                'timestamp' => now()->toIso8601String(),
            ])->header('X-API-Version', '1');
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'status' => 'degraded',
                'service' => 'one-data-system',
                'database' => 'unavailable',
            ], 503)->header('X-API-Version', '1');
        }
    }

    public function me(Request $request): JsonResponse
    {
        return $this->json(['data' => $request->user()->only(['id', 'name', 'username', 'role', 'person_id'])]);
    }

    public function people(Request $request): JsonResponse
    {
        $tenantIds = $this->tenantAccess->idsFor($request->user());
        $people = Person::query()
            ->whereHas('memberships', fn ($query) => $query->whereIn('tenant_id', $tenantIds))
            ->with(['memberships.tenant'])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Person $person): array => [
                'id' => $person->id,
                'name' => $person->displayName(),
                'position_name' => $person->position_name,
                'position_group' => $person->position_group,
                'status' => $person->status,
                'memberships' => $person->memberships->map(fn ($membership): array => [
                    'tenant_id' => $membership->tenant_id,
                    'tenant_name' => $membership->tenant?->name,
                    'starts_on' => $membership->starts_on?->toDateString(),
                    'ends_on' => $membership->ends_on?->toDateString(),
                ])->values(),
            ])->values();

        return $this->json(['data' => $people]);
    }

    public function leaves(Request $request): JsonResponse
    {
        $tenantIds = $this->tenantAccess->idsFor($request->user());
        $leaves = LeaveRequest::query()
            ->whereIn('tenant_id', $tenantIds)
            ->with(['person', 'tenant'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (LeaveRequest $leave): array => [
                'id' => $leave->id,
                'person_id' => $leave->person_id,
                'person_name' => $leave->person?->displayName(),
                'tenant_id' => $leave->tenant_id,
                'tenant_name' => $leave->tenant?->name,
                'leave_type' => $leave->leave_type,
                'starts_on' => $leave->starts_on?->toDateString(),
                'ends_on' => $leave->ends_on?->toDateString(),
                'duration_days' => $leave->duration_days,
                'status' => $leave->status,
                'revision' => $leave->revision,
            ]);

        return $this->json(['data' => $leaves]);
    }

    public function syncMasterData(Request $request): JsonResponse
    {
        $summary = $this->masterDataSync->sync($request->user()->id);

        return $this->json(['data' => $summary], 201);
    }

    public function createAndSendSnapshot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2200'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);
        $batch = $this->snapshotService->prepare((int) $data['year'], (int) $data['month'], $request->user());
        $batch = $this->snapshotService->send($batch, $request->user());

        return $this->json(['data' => $this->batchData($batch)], 201);
    }

    public function showSnapshot(Request $request, LeaveExportBatch $batch): JsonResponse
    {
        return $this->json(['data' => $this->batchData($batch, true)]);
    }

    public function sendSnapshot(Request $request, LeaveExportBatch $batch): JsonResponse
    {
        $batch = $this->snapshotService->send($batch, $request->user());

        return $this->json(['data' => $this->batchData($batch)]);
    }

    /** @param array<string, mixed> $data */
    private function json(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status)->header('X-API-Version', '1');
    }

    /** @return array<string, mixed> */
    private function batchData(LeaveExportBatch $batch, bool $includePayload = false): array
    {
        $batch->loadMissing(['items', 'deliveries']);
        $data = [
            'id' => $batch->id,
            'period' => sprintf('%04d-%02d', $batch->period_year, $batch->period_month),
            'snapshot_version' => $batch->snapshot_version,
            'status' => $batch->status,
            'item_count' => $batch->item_count,
            'source_hash' => $batch->source_hash,
            'idempotency_key' => $batch->idempotency_key,
            'error_message' => $batch->error_message,
            'deliveries' => $batch->deliveries->map(fn ($delivery): array => [
                'id' => $delivery->id,
                'status' => $delivery->status,
                'attempt' => $delivery->attempt,
                'request_id' => $delivery->request_id,
                'http_status' => $delivery->http_status,
                'error_message' => $delivery->error_message,
            ])->values(),
        ];

        if ($includePayload) {
            $data['payload'] = app(LeaveSnapshotService::class)->payload($batch);
        }

        return $data;
    }
}
