<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveExportBatch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'affiliation_id', 'period_year', 'period_month', 'snapshot_version', 'status',
        'idempotency_key', 'source_cutoff', 'source_hash', 'item_count', 'sent_at',
        'acknowledged_at', 'external_batch_id', 'response_payload', 'error_message',
    ];

    protected function casts(): array
    {
        return [
            'response_payload' => 'array',
            'sent_at' => 'datetime',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function affiliation(): BelongsTo
    {
        return $this->belongsTo(Affiliation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(LeaveExportItem::class, 'batch_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(IntegrationDelivery::class, 'batch_id');
    }
}
