<?php

namespace App\Http\Controllers;

use App\Models\Person;
use App\Services\Platform\TenantAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PeopleController extends Controller
{
    public function __construct(private readonly TenantAccess $tenantAccess) {}

    public function index(Request $request): Response
    {
        $tenantIds = $this->tenantAccess->idsFor($request->user());
        $people = Person::query()
            ->whereHas('memberships', fn ($query) => $query->whereIn('tenant_id', $tenantIds))
            ->with(['memberships.tenant'])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(30)
            ->through(fn (Person $person): array => [
                'id' => $person->id,
                'name' => $person->displayName(),
                'position_name' => $person->position_name,
                'position_group' => $person->position_group,
                'status' => $person->status,
                'source_id' => $person->source_id,
                'memberships' => $person->memberships->map(fn ($membership): array => [
                    'tenant_id' => $membership->tenant_id,
                    'tenant_name' => $membership->tenant?->name,
                    'starts_on' => $membership->starts_on?->toDateString(),
                    'ends_on' => $membership->ends_on?->toDateString(),
                    'is_primary' => $membership->is_primary,
                ])->values(),
            ]);

        return Inertia::render('People/Index', [
            'people' => $people,
            'canSync' => $this->tenantAccess->canManagePeople($request->user()),
        ]);
    }
}
