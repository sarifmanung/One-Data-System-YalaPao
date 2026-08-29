<?php

namespace App\Services\Platform;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Collection;

class TenantAccess
{
    public function idsFor(User $user): Collection
    {
        if ($user->hasRole('ADMIN', 'PUBLIC_HEALTH_OFFICER')) {
            return Tenant::query()->pluck('id');
        }

        return $user->tenantMemberships()->pluck('tenants.id');
    }

    public function assert(User $user, string $tenantId): void
    {
        abort_unless($user->canAccessTenant($tenantId), 403, 'ไม่มีสิทธิ์เข้าถึงหน่วยงานนี้');
    }

    public function canManagePeople(User $user): bool
    {
        return $user->hasRole('ADMIN', 'PUBLIC_HEALTH_OFFICER');
    }
}
