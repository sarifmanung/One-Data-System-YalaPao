<?php

namespace App\Services\Leave;

use App\Models\LeaveRequest;
use App\Models\LeaveRevision;
use App\Models\OutboxEvent;
use App\Models\TenantMembership;
use App\Models\User;
use App\Services\Governance\AuditService;
use App\Services\Platform\TenantAccess;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveRequestService
{
    public function __construct(
        private readonly TenantAccess $tenantAccess,
        private readonly AuditService $audit,
    ) {}

    public function create(array $data, User $actor): LeaveRequest
    {
        $startsOn = CarbonImmutable::parse((string) $data['starts_on'])->startOfDay();
        $endsOn = CarbonImmutable::parse((string) $data['ends_on'])->startOfDay();

        $this->assertAccess($actor, (string) $data['tenant_id']);
        $this->assertMembership(
            (string) $data['person_id'],
            (string) $data['tenant_id'],
            $startsOn,
            $endsOn,
        );

        $duration = $data['duration_days'] ?? $startsOn->diffInDays($endsOn) + 1;

        return DB::transaction(function () use ($data, $actor, $startsOn, $endsOn, $duration): LeaveRequest {
            $leave = LeaveRequest::create([
                'person_id' => $data['person_id'],
                'tenant_id' => $data['tenant_id'],
                'leave_type' => $data['leave_type'],
                'starts_on' => $startsOn->toDateString(),
                'ends_on' => $endsOn->toDateString(),
                'duration_days' => number_format((float) $duration, 1, '.', ''),
                'reason' => $data['reason'] ?? null,
                'status' => 'DRAFT',
                'revision' => 1,
                'metadata' => $data['metadata'] ?? null,
            ]);

            LeaveRevision::create([
                'leave_request_id' => $leave->id,
                'revision_no' => 1,
                'change_type' => 'CREATED',
                'snapshot' => $leave->toArray(),
                'created_by' => $actor->id,
            ]);

            $this->recordMutation($leave, 'leave.created', null, $actor, 'CREATED');

            return $leave->fresh(['person', 'tenant']);
        });
    }

    public function transition(LeaveRequest $leave, string $target, User $actor, ?string $reason = null): LeaveRequest
    {
        $this->assertAccess($actor, $leave->tenant_id);

        return DB::transaction(function () use ($leave, $target, $actor, $reason): LeaveRequest {
            $leave->refresh();
            $before = $leave->toArray();

            if ($target === 'CONFIRMED') {
                if ($leave->status !== 'DRAFT') {
                    throw ValidationException::withMessages(['status' => 'ใบลานี้ไม่อยู่ในสถานะรอยืนยัน']);
                }

                $overlap = LeaveRequest::query()
                    ->where('person_id', $leave->person_id)
                    ->where('status', 'CONFIRMED')
                    ->where('id', '!=', $leave->id)
                    ->whereDate('starts_on', '<=', $leave->ends_on)
                    ->whereDate('ends_on', '>=', $leave->starts_on)
                    ->exists();

                if ($overlap) {
                    throw ValidationException::withMessages([
                        'starts_on' => 'บุคลากรมีใบลาที่มีผลซ้อนทับในช่วงเวลานี้แล้ว',
                    ]);
                }

                $leave->fill([
                    'status' => 'CONFIRMED',
                    'confirmed_at' => now(),
                    'confirmed_by' => $actor->id,
                    'cancelled_at' => null,
                    'cancelled_by' => null,
                    'cancellation_reason' => null,
                ]);
            } elseif ($target === 'CANCELLED') {
                if ($leave->status !== 'CONFIRMED') {
                    throw ValidationException::withMessages(['status' => 'ยกเลิกได้เฉพาะใบลาที่มีผลแล้ว']);
                }

                $leave->fill([
                    'status' => 'CANCELLED',
                    'cancelled_at' => now(),
                    'cancelled_by' => $actor->id,
                    'cancellation_reason' => $reason,
                ]);
            } elseif ($target === 'VOID') {
                if (! in_array($leave->status, ['DRAFT', 'CANCELLED'], true)) {
                    throw ValidationException::withMessages(['status' => 'ใบลาที่มีผลแล้วต้องใช้การยกเลิก ไม่ใช่การลบ']);
                }

                $leave->fill([
                    'status' => 'VOID',
                    'cancellation_reason' => $reason,
                ]);
            } else {
                throw ValidationException::withMessages(['status' => 'ไม่รองรับการเปลี่ยนสถานะนี้']);
            }

            $leave->revision = (int) $leave->revision + 1;
            $leave->save();

            $changeType = match ($target) {
                'CONFIRMED' => 'CONFIRMED',
                'CANCELLED' => 'CANCELLED',
                default => 'VOIDED',
            };

            LeaveRevision::create([
                'leave_request_id' => $leave->id,
                'revision_no' => $leave->revision,
                'change_type' => $changeType,
                'snapshot' => $leave->toArray(),
                'created_by' => $actor->id,
            ]);

            $this->recordMutation($leave, 'leave.'.strtolower($target), $before, $actor, $changeType, $reason);

            return $leave->fresh(['person', 'tenant']);
        });
    }

    private function assertAccess(User $actor, string $tenantId): void
    {
        $this->tenantAccess->assert($actor, $tenantId);
    }

    private function assertMembership(
        string $personId,
        string $tenantId,
        CarbonImmutable $startsOn,
        CarbonImmutable $endsOn,
    ): void {
        $exists = TenantMembership::query()
            ->where('person_id', $personId)
            ->where('tenant_id', $tenantId)
            ->whereDate('starts_on', '<=', $endsOn)
            ->where(function ($query) use ($startsOn) {
                $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', $startsOn);
            })
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'person_id' => 'บุคลากรไม่ได้สังกัดหน่วยงานนี้ในช่วงเวลาที่ลา',
            ]);
        }
    }

    private function recordMutation(
        LeaveRequest $leave,
        string $eventType,
        ?array $before,
        User $actor,
        string $changeType,
        ?string $reason = null,
    ): void {
        $after = $leave->fresh()->toArray();
        $metadata = array_filter([
            'change_type' => $changeType,
            'reason' => $reason,
            'effective' => $leave->isEffective(),
        ], static fn (mixed $value): bool => $value !== null);

        $this->audit->record(
            $eventType,
            'LeaveRequest',
            $leave->id,
            $before,
            $after,
            $metadata,
            $actor->id,
            $leave->tenant_id,
            $leave->tenant->affiliation_id ?? null,
        );

        OutboxEvent::create([
            'event_type' => $eventType,
            'aggregate_type' => 'LeaveRequest',
            'aggregate_id' => $leave->id,
            'payload' => [
                'leave_request_id' => $leave->id,
                'person_id' => $leave->person_id,
                'tenant_id' => $leave->tenant_id,
                'status' => $leave->status,
                'revision' => $leave->revision,
            ],
            'available_at' => now(),
        ]);
    }
}
