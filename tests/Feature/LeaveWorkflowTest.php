<?php

namespace Tests\Feature;

use App\Models\Affiliation;
use App\Models\ExternalIdMapping;
use App\Models\LeaveExportBatch;
use App\Models\LeaveRequest;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\TenantMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaveWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_leave_can_be_created_confirmed_and_snapshot_is_idempotent_in_dry_run(): void
    {
        [$user, $person, $tenant] = $this->makeScope();
        $this->actingAs($user);

        $response = $this->post('/leaves', [
            'person_id' => $person->id,
            'tenant_id' => $tenant->id,
            'leave_type' => 'SICK_LEAVE',
            'starts_on' => '2026-08-10',
            'ends_on' => '2026-08-11',
            'reason' => 'ทดสอบ workflow',
        ]);
        $response->assertRedirect('/leaves');

        $leave = LeaveRequest::query()->firstOrFail();
        $this->assertSame('DRAFT', $leave->status);
        $this->assertDatabaseHas('leave_revisions', [
            'leave_request_id' => $leave->id,
            'change_type' => 'CREATED',
        ]);

        $this->post('/leaves/'.$leave->id.'/confirm')->assertRedirect();
        $leave->refresh();
        $this->assertSame('CONFIRMED', $leave->status);
        $this->assertDatabaseHas('outbox_events', ['aggregate_id' => $leave->id, 'event_type' => 'leave.confirmed']);

        $this->post('/integrations/special/leave-snapshots', [
            'year' => 2026,
            'month' => 8,
        ])->assertRedirect();
        $batch = LeaveExportBatch::query()->firstOrFail();
        $this->assertSame('DRY_RUN', $batch->status);
        $this->assertSame(1, $batch->item_count);

        $this->post('/integrations/special/leave-snapshots', [
            'year' => 2026,
            'month' => 8,
        ])->assertRedirect();
        $this->assertSame(1, LeaveExportBatch::query()->count());
    }

    public function test_confirmed_leave_cannot_overlap_another_confirmed_leave(): void
    {
        [$user, $person, $tenant] = $this->makeScope();
        $this->actingAs($user);

        $makeLeave = fn (): LeaveRequest => LeaveRequest::create([
            'person_id' => $person->id,
            'tenant_id' => $tenant->id,
            'leave_type' => 'PERSONAL_LEAVE',
            'starts_on' => '2026-08-10',
            'ends_on' => '2026-08-10',
            'duration_days' => 1,
            'status' => 'DRAFT',
            'revision' => 1,
        ]);
        $first = $makeLeave();
        $second = $makeLeave();
        $this->post('/leaves/'.$first->id.'/confirm')->assertRedirect();
        $this->post('/leaves/'.$second->id.'/confirm')->assertSessionHasErrors('starts_on');
        $this->assertSame('DRAFT', $second->fresh()->status);
    }

    /** @return array{0: User, 1: Person, 2: Tenant} */
    private function makeScope(): array
    {
        $user = User::factory()->create(['role' => 'ADMIN']);
        $affiliation = Affiliation::create(['code' => 'YALA-PAO', 'name' => 'อบจ.ยะลา']);
        $tenant = Tenant::create([
            'affiliation_id' => $affiliation->id,
            'code' => 'HC-TEST',
            'name' => 'รพ.สต.ทดสอบ',
        ]);
        $person = Person::create([
            'first_name' => 'ผู้ทดสอบ',
            'last_name' => 'ระบบลา',
            'status' => 'ACTIVE',
        ]);
        TenantMembership::create([
            'tenant_id' => $tenant->id,
            'person_id' => $person->id,
            'starts_on' => '2026-01-01',
            'membership_role' => 'STAFF',
        ]);
        ExternalIdMapping::create([
            'system' => 'special_allowances',
            'entity_type' => 'person',
            'local_id' => $person->id,
            'external_id' => 'special-employee-1',
            'external_type' => 'employee',
        ]);

        return [$user, $person, $tenant];
    }
}
