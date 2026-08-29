<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use App\Models\Person;
use App\Models\Tenant;
use App\Services\Platform\TenantAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly TenantAccess $tenantAccess) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $tenantIds = $this->tenantAccess->idsFor($user);
        $baseLeaves = LeaveRequest::query()->whereIn('tenant_id', $tenantIds);
        $people = Person::query()
            ->whereHas('memberships', fn ($query) => $query->whereIn('tenant_id', $tenantIds))
            ->get(['position_name', 'position_group', 'status']);
        $positionSummary = $people
            ->groupBy(fn (Person $person): string => $person->position_name
                ?: $this->positionLabel($person->position_group)
                ?: 'ไม่ระบุตำแหน่ง')
            ->map(fn ($group, $label): array => [
                'label' => $label,
                'count' => $group->count(),
                'percentage' => $people->count() > 0 ? (int) round($group->count() * 100 / $people->count()) : 0,
            ])
            ->sortByDesc('count')
            ->values()
            ->all();

        $leaveStatus = collect(['DRAFT', 'CONFIRMED', 'CANCELLED', 'VOID'])
            ->mapWithKeys(fn (string $status): array => [strtolower($status) => (clone $baseLeaves)->where('status', $status)->count()])
            ->all();
        $tenantCount = Tenant::query()->whereIn('id', $tenantIds)->where('status', 'ACTIVE')->count();

        return Inertia::render('Dashboard', [
            'dashboardContext' => [
                'tenant_count' => $tenantCount,
                'tenant_name' => $user->hasRole('ADMIN', 'PUBLIC_HEALTH_OFFICER')
                    ? 'ทุกหน่วยงานในสังกัด'
                    : $user->tenantMemberships()->orderBy('name')->value('name'),
            ],
            'stats' => [
                'people' => $people->count(),
                'draftLeaves' => (clone $baseLeaves)->where('status', 'DRAFT')->count(),
                'confirmedLeaves' => (clone $baseLeaves)->where('status', 'CONFIRMED')->count(),
                'todayLeaves' => (clone $baseLeaves)
                    ->where('status', 'CONFIRMED')
                    ->whereDate('starts_on', '<=', today())
                    ->whereDate('ends_on', '>=', today())
                    ->count(),
            ],
            'positionSummary' => $positionSummary,
            'leaveStatus' => $leaveStatus,
            'recentLeaves' => (clone $baseLeaves)
                ->with(['person', 'tenant'])
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (LeaveRequest $leave): array => [
                    'id' => $leave->id,
                    'person' => $leave->person?->displayName(),
                    'tenant' => $leave->tenant?->name,
                    'type' => $leave->leave_type,
                    'starts_on' => $leave->starts_on?->toDateString(),
                    'ends_on' => $leave->ends_on?->toDateString(),
                    'status' => $leave->status,
                ]),
        ]);
    }

    private function positionLabel(?string $positionGroup): ?string
    {
        return [
            'MEDICAL_DOCTOR_AND_DENTIST' => 'แพทย์และทันตแพทย์',
            'PHARMACIST' => 'เภสัชกร',
            'REGISTERED_NURSE' => 'พยาบาลวิชาชีพ',
            'ALLIED_HEALTH_PROFESSION' => 'วิชาชีพสาธารณสุขอื่น ๆ',
            'PRACTITIONER_BACHELOR' => 'ผู้ปฏิบัติงานระดับปริญญาตรี',
            'PRACTITIONER_SUB_BACHELOR' => 'ผู้ปฏิบัติงานต่ำกว่าปริญญาตรี',
        ][$positionGroup] ?? $positionGroup;
    }
}
