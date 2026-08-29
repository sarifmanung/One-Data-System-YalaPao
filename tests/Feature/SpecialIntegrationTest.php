<?php

namespace Tests\Feature;

use App\Models\Affiliation;
use App\Models\ExternalIdMapping;
use App\Models\IntegrationDelivery;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\TenantMembership;
use App\Models\User;
use App\Services\Integrations\SpecialMasterDataSyncService;
use App\Services\Leave\LeaveRequestService;
use App\Services\Leave\LeaveSnapshotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SpecialIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_master_data_sync_imports_people_and_effective_membership_idempotently(): void
    {
        config([
            'services.special_allowances.base_url' => 'http://special.test',
            'services.special_allowances.integration_token' => 'integration-test-token',
        ]);

        Http::fake([
            'http://special.test/internal/api/v1/master-data/health-centers' => Http::response([
                'data' => [[
                    'id' => 'hc-1',
                    'name' => 'รพ.สต.ทดสอบ',
                    'areaKey' => 'YALA-HC-001',
                ]],
            ]),
            'http://special.test/internal/api/v1/master-data/employees' => Http::response([
                'data' => [[
                    'id' => 'employee-1',
                    'firstName' => 'ผู้ทดสอบ',
                    'lastName' => 'บุคลากร',
                    'positionGroup' => 'ข้าราชการ',
                    'effectivePositionGroup' => 'ข้าราชการ',
                    'startDate' => '2020-01-01',
                    'governmentServiceStartDate' => '2020-01-01',
                    'healthCenterStartDate' => '2026-01-01',
                    'healthCenterId' => 'hc-1',
                    'isActive' => true,
                    'updatedAt' => '2026-08-29T00:00:00+07:00',
                ]],
            ]),
            'http://special.test/internal/api/v1/master-data/users' => Http::response([
                'data' => [[
                    'id' => 'user-1',
                    'username' => 'staff.test',
                    'role' => 'HEALTH_CENTER_USER',
                    'healthCenterId' => 'hc-1',
                    'employeeId' => 'employee-1',
                    'isActive' => true,
                ]],
            ]),
        ]);

        $actor = User::factory()->create(['role' => 'ADMIN']);
        $service = app(SpecialMasterDataSyncService::class);

        $first = $service->sync($actor->id);
        $second = $service->sync($actor->id);

        $this->assertSame(1, $first['tenants']);
        $this->assertSame(1, $first['persons']);
        $this->assertSame(1, $first['users']);
        $this->assertSame(0, $first['unmapped_users']);
        $this->assertSame($first['affiliation_id'], $second['affiliation_id']);
        $this->assertDatabaseCount('tenants', 1);
        $this->assertDatabaseCount('persons', 1);
        $this->assertDatabaseCount('tenant_memberships', 1);
        $this->assertDatabaseHas('tenants', [
            'source_id' => 'hc-1',
            'code' => 'YALA-HC-001',
            'source_code' => 'YALA-HC-001',
        ]);
        $this->assertDatabaseHas('persons', [
            'source_id' => 'employee-1',
            'first_name' => 'ผู้ทดสอบ',
        ]);
        $this->assertDatabaseHas('external_id_mappings', [
            'entity_type' => 'person',
            'external_id' => 'employee-1',
        ]);
    }

    public function test_snapshot_posts_the_versioned_contract_and_records_acknowledgement(): void
    {
        config([
            'services.special_allowances.base_url' => 'http://special.test',
            'services.special_allowances.integration_token' => 'integration-test-token',
            'services.special_allowances.dry_run' => false,
        ]);

        Http::fake([
            'http://special.test/internal/api/v1/periods/2026-08/leave-snapshot' => Http::response([
                'data' => ['batch_id' => 'special-batch-1'],
            ]),
        ]);

        [$user, $person, $tenant] = $this->makeLeaveScope();
        $leaveService = app(LeaveRequestService::class);
        $leave = $leaveService->create([
            'person_id' => $person->id,
            'tenant_id' => $tenant->id,
            'leave_type' => 'SICK_LEAVE',
            'starts_on' => '2026-08-10',
            'ends_on' => '2026-08-10',
            'reason' => 'ทดสอบส่งข้อมูล',
        ], $user);
        $leave = $leaveService->transition($leave, 'CONFIRMED', $user);

        $snapshotService = app(LeaveSnapshotService::class);
        $batch = $snapshotService->prepare(2026, 8, $user);
        $batch = $snapshotService->send($batch, $user);

        $this->assertSame('ACKNOWLEDGED', $batch->status);
        $this->assertSame('special-batch-1', $batch->external_batch_id);
        $this->assertSame('ACKNOWLEDGED', IntegrationDelivery::query()->firstOrFail()->status);
        $this->assertSame('CONFIRMED', $leave->fresh()->status);

        Http::assertSent(function (HttpRequest $request): bool {
            $data = $request->data();

            return $request->url() === 'http://special.test/internal/api/v1/periods/2026-08/leave-snapshot'
                && $request->hasHeader('Authorization', 'Bearer integration-test-token')
                && $request->hasHeader('Idempotency-Key', (string) ($data['idempotency_key'] ?? ''))
                && ($data['contract_version'] ?? null) === '1.0'
                && ($data['period'] ?? null) === '2026-08'
                && ($data['snapshot_version'] ?? null) === 1
                && ($data['employees'][0]['special_employee_id'] ?? null) === 'special-employee-1'
                && ($data['employees'][0]['leave_entries'][0]['type'] ?? null) === 'SICK_LEAVE';
        });
    }

    /** @return array{0: User, 1: Person, 2: Tenant} */
    private function makeLeaveScope(): array
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
