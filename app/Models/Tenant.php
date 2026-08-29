<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'affiliation_id', 'code', 'name', 'status', 'source_system', 'source_id', 'source_code', 'source_payload',
    ];

    protected function casts(): array
    {
        return ['source_payload' => 'array'];
    }

    public function affiliation(): BelongsTo
    {
        return $this->belongsTo(Affiliation::class);
    }

    public function persons(): BelongsToMany
    {
        return $this->belongsToMany(Person::class, 'tenant_memberships')
            ->withPivot(['membership_role', 'starts_on', 'ends_on', 'is_primary'])
            ->withTimestamps();
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(TenantMembership::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_tenant_memberships')
            ->withPivot(['role', 'starts_on', 'ends_on'])
            ->withTimestamps();
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }
}
