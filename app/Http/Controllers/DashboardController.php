<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use App\Models\Person;
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

        return Inertia::render('Dashboard', [
            'stats' => [
                'people' => Person::query()->whereHas('memberships', fn ($query) => $query->whereIn('tenant_id', $tenantIds))->count(),
                'draftLeaves' => (clone $baseLeaves)->where('status', 'DRAFT')->count(),
                'confirmedLeaves' => (clone $baseLeaves)->where('status', 'CONFIRMED')->count(),
                'todayLeaves' => (clone $baseLeaves)
                    ->where('status', 'CONFIRMED')
                    ->whereDate('starts_on', '<=', today())
                    ->whereDate('ends_on', '>=', today())
                    ->count(),
            ],
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
}
