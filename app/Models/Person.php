<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Person extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'persons';

    protected $fillable = [
        'title', 'first_name', 'last_name', 'position_name', 'position_group',
        'employment_start_date', 'government_service_start_date', 'employment_type',
        'status', 'source_system', 'source_id', 'source_updated_at', 'source_payload',
    ];

    protected function casts(): array
    {
        return [
            'employment_start_date' => 'date',
            'government_service_start_date' => 'date',
            'source_updated_at' => 'datetime',
            'source_payload' => 'array',
        ];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(TenantMembership::class);
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_memberships')
            ->withPivot(['membership_role', 'starts_on', 'ends_on', 'is_primary'])
            ->withTimestamps();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function currentMembership(): HasOne
    {
        return $this->hasOne(TenantMembership::class)->latestOfMany('starts_on');
    }

    public function displayName(): string
    {
        return trim(implode(' ', array_filter([$this->title, $this->first_name, $this->last_name])));
    }
}
