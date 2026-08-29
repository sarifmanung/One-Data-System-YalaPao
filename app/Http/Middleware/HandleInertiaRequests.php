<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        if (app()->environment('testing')) {
            return null;
        }

        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $workspaceTenantQuery = Tenant::query()->where('status', 'ACTIVE');

        if ($user && ! $user->hasRole('ADMIN', 'PUBLIC_HEALTH_OFFICER')) {
            $workspaceTenantQuery->whereHas('users', fn ($query) => $query->where('users.id', $user->id));
        }

        $workspaceTenantCount = $user ? (clone $workspaceTenantQuery)->count() : 0;
        $workspaceTenant = $user
            ? $workspaceTenantQuery->orderBy('name')->first(['id', 'code', 'name'])
            : null;

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user?->only(['id', 'name', 'username', 'role', 'person_id']),
            ],
            'workspace' => [
                'tenant' => $workspaceTenant?->only(['id', 'code', 'name']),
                'tenant_count' => $workspaceTenantCount,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ]);
    }
}
