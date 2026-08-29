<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'is_active',
        'portal_user_id',
        'person_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $table = 'users';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    public function tenantMemberships(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'user_tenant_memberships')
            ->withPivot(['role', 'starts_on', 'ends_on'])
            ->withTimestamps();
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function canAccessTenant(string $tenantId): bool
    {
        if ($this->hasRole('ADMIN', 'PUBLIC_HEALTH_OFFICER')) {
            return true;
        }

        return $this->tenantMemberships()
            ->where('tenants.id', $tenantId)
            ->where(function ($query) {
                $query->whereNull('user_tenant_memberships.starts_on')
                    ->orWhereDate('user_tenant_memberships.starts_on', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('user_tenant_memberships.ends_on')
                    ->orWhereDate('user_tenant_memberships.ends_on', '>=', now());
            })
            ->exists();
    }
}
