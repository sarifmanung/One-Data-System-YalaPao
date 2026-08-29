<?php

namespace App\Services\Integrations;

use App\Models\Affiliation;
use App\Models\ExternalIdMapping;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\TenantMembership;
use App\Services\Governance\AuditService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SpecialMasterDataSyncService
{
    public function __construct(
        private readonly SpecialAllowancesClient $client,
        private readonly AuditService $audit,
    ) {}

    /** @return array{affiliation_id: string, tenants: int, persons: int, users: int, unmapped_users: int} */
    public function sync(?int $actorUserId = null): array
    {
        $healthCenters = $this->client->healthCenters();
        $employees = $this->client->employees();
        $users = $this->client->users();

        if ($healthCenters === [] && $employees !== []) {
            throw new RuntimeException('Special-Allowances returned employees without health centers.');
        }

        $result = DB::transaction(function () use ($healthCenters, $employees, $users, $actorUserId): array {
            $affiliation = Affiliation::updateOrCreate(
                ['code' => config('onedata.default_affiliation_code', 'YALA-PAO')],
                [
                    'name' => 'องค์การบริหารส่วนจังหวัดยะลา',
                    'status' => 'ACTIVE',
                    'source_system' => 'special_allowances',
                    'source_id' => 'affiliation:yala-pao',
                    'source_payload' => ['source' => 'Special-Allowances'],
                ],
            );

            $tenantIds = [];
            foreach ($healthCenters as $index => $healthCenter) {
                $sourceId = $this->requiredId($healthCenter, 'health center', $index);
                $areaKey = $healthCenter['areaKey'] ?? $healthCenter['area_key'] ?? null;
                $sourceCode = $healthCenter['code']
                    ?? $healthCenter['number']
                    ?? (filled($areaKey) && ! in_array(strtoupper((string) $areaKey), [
                        'HARD_LEVEL_A',
                        'HARD_LEVEL_B',
                        'SPECIAL_LEVEL_2',
                    ], true) ? $areaKey : null)
                    ?? null;
                // Special-Allowances currently exposes areaKey as a rate area,
                // not as a unique health-center code. Fall back to the source
                // id so every tenant remains uniquely addressable.
                $tenantCode = $sourceCode !== null
                    ? (string) $sourceCode
                    : 'HC-'.substr(preg_replace('/[^A-Za-z0-9]/', '', $sourceId), -32);
                $sourceCode ??= $areaKey;
                $tenant = Tenant::updateOrCreate(
                    ['source_system' => 'special_allowances', 'source_id' => $sourceId],
                    [
                        'affiliation_id' => $affiliation->id,
                        'code' => $tenantCode,
                        'name' => (string) ($healthCenter['name'] ?? 'รพ.สต. '.($index + 1)),
                        'status' => 'ACTIVE',
                        'source_code' => $sourceCode !== null ? (string) $sourceCode : null,
                        'source_payload' => $healthCenter,
                    ],
                );
                $tenantIds[$sourceId] = $tenant;
                ExternalIdMapping::updateOrCreate(
                    ['system' => 'special_allowances', 'entity_type' => 'tenant', 'local_id' => $tenant->id],
                    ['external_id' => $sourceId, 'external_type' => 'health_center', 'metadata' => $healthCenter],
                );
            }

            $personIds = [];
            foreach ($employees as $index => $employee) {
                $sourceId = $this->requiredId($employee, 'employee', $index);
                $tenant = $tenantIds[(string) ($employee['healthCenterId'] ?? $employee['health_center_id'] ?? '')] ?? null;
                if (! $tenant) {
                    throw new RuntimeException('Employee references a health center that was not imported.');
                }

                $person = Person::updateOrCreate(
                    ['source_system' => 'special_allowances', 'source_id' => $sourceId],
                    [
                        'title' => $employee['title'] ?? $employee['nameTitle'] ?? null,
                        'first_name' => trim((string) ($employee['firstName'] ?? $employee['first_name'] ?? '')),
                        'last_name' => trim((string) ($employee['lastName'] ?? $employee['last_name'] ?? '')),
                        'position_name' => $employee['positionName'] ?? $employee['position_name'] ?? null,
                        'position_group' => $employee['effectivePositionGroup'] ?? $employee['effective_position_group']
                            ?? $employee['positionGroup'] ?? $employee['position_group'] ?? null,
                        'employment_start_date' => $this->date($employee['startDate'] ?? $employee['start_date']),
                        'government_service_start_date' => $this->date($employee['governmentServiceStartDate'] ?? $employee['government_service_start_date'] ?? null),
                        'employment_type' => $employee['employmentType'] ?? $employee['employment_type'] ?? null,
                        'status' => ($employee['isActive'] ?? $employee['is_active'] ?? true) ? 'ACTIVE' : 'INACTIVE',
                        'source_updated_at' => $this->dateTime($employee['updatedAt'] ?? $employee['updated_at']),
                        'source_payload' => $employee,
                    ],
                );
                $start = $this->date($employee['healthCenterStartDate'] ?? $employee['health_center_start_date'] ?? null)
                    ?? $this->date($employee['startDate'] ?? $employee['start_date'] ?? null)
                    ?? CarbonImmutable::today()->toDateString();
                $startDate = CarbonImmutable::parse($start);

                TenantMembership::query()
                    ->where('person_id', $person->id)
                    ->where('tenant_id', '!=', $tenant->id)
                    ->where('is_primary', true)
                    ->whereNull('ends_on')
                    ->whereDate('starts_on', '<', $startDate)
                    ->update([
                        'ends_on' => $startDate->subDay()->toDateString(),
                        'is_primary' => false,
                        'updated_at' => now(),
                    ]);

                $membership = TenantMembership::query()
                    ->where('tenant_id', $tenant->id)
                    ->where('person_id', $person->id)
                    ->whereDate('starts_on', $startDate)
                    ->first();
                $membership ??= new TenantMembership([
                    'tenant_id' => $tenant->id,
                    'person_id' => $person->id,
                    'starts_on' => $startDate->toDateString(),
                ]);
                $membership->fill([
                    'membership_role' => 'STAFF',
                    'is_primary' => true,
                    'source_system' => 'special_allowances',
                    'source_id' => $sourceId,
                    'source_payload' => [
                        'healthCenterId' => $employee['healthCenterId'] ?? $employee['health_center_id'] ?? null,
                        'healthCenterStartDate' => $startDate->toDateString(),
                    ],
                ]);
                $membership->save();
                ExternalIdMapping::updateOrCreate(
                    ['system' => 'special_allowances', 'entity_type' => 'person', 'local_id' => $person->id],
                    ['external_id' => $sourceId, 'external_type' => 'employee', 'metadata' => ['tenant_id' => $tenant->id]],
                );
                $personIds[$sourceId] = $person;
            }

            $unmappedUsers = 0;
            foreach ($users as $index => $externalUser) {
                $sourceId = $this->requiredId($externalUser, 'user', $index);
                $externalEmployeeId = $externalUser['employeeId'] ?? $externalUser['employee_id'] ?? null;
                $person = $externalEmployeeId ? ($personIds[(string) $externalEmployeeId] ?? null) : null;
                if (! $person) {
                    $unmappedUsers++;
                }
                ExternalIdMapping::updateOrCreate(
                    ['system' => 'special_allowances', 'entity_type' => 'user', 'local_id' => $person?->id ?? 'unmapped:'.$sourceId],
                    [
                        'external_id' => $sourceId,
                        'external_type' => 'user',
                        'metadata' => [
                            'username' => $externalUser['username'] ?? null,
                            'role' => $externalUser['role'] ?? null,
                            'special_employee_id' => $externalEmployeeId,
                            'health_center_id' => $externalUser['healthCenterId'] ?? $externalUser['health_center_id'] ?? null,
                            'mapped' => $person !== null,
                        ],
                    ],
                );
            }

            $summary = [
                'affiliation_id' => $affiliation->id,
                'tenants' => count($tenantIds),
                'persons' => count($personIds),
                'users' => count($users),
                'unmapped_users' => $unmappedUsers,
            ];

            $this->audit->record(
                'special.master_data.synced',
                'SpecialMasterData',
                $affiliation->id,
                null,
                $summary,
                ['source_system' => 'special_allowances'],
                $actorUserId,
                null,
                $affiliation->id,
            );

            return $summary;
        });

        return $result;
    }

    private function requiredId(array $record, string $type, int $index): string
    {
        $id = $record['id'] ?? $record['uuid'] ?? $record['sourceId'] ?? $record['source_id'] ?? null;
        if (blank($id)) {
            throw new RuntimeException(sprintf('Special-Allowances %s at index %d has no stable id.', $type, $index));
        }

        return (string) $id;
    }

    private function date(mixed $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        return CarbonImmutable::parse((string) $value)->toDateString();
    }

    private function dateTime(mixed $value): ?CarbonImmutable
    {
        return blank($value) ? null : CarbonImmutable::parse((string) $value);
    }
}
