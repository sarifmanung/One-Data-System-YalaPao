<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveRequest extends Model
{
    use HasFactory, HasUuids;

    public const TYPES = [
        'PERSONAL_LEAVE', 'SICK_LEAVE', 'VACATION_LEAVE', 'ABSENT',
        'MATERNITY_LEAVE', 'HAJJ_LEAVE', 'ORDAIN_LEAVE',
    ];

    public const STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED', 'VOID'];

    protected $fillable = [
        'person_id', 'tenant_id', 'leave_type', 'starts_on', 'ends_on', 'duration_days',
        'reason', 'status', 'revision', 'confirmed_at', 'confirmed_by', 'cancelled_at',
        'cancelled_by', 'cancellation_reason', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'duration_days' => 'decimal:1',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(LeaveRevision::class);
    }

    public function exportItems(): HasMany
    {
        return $this->hasMany(LeaveExportItem::class);
    }

    public function isEffective(): bool
    {
        return $this->status === 'CONFIRMED';
    }
}
