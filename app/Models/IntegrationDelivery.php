<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationDelivery extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'batch_id', 'system', 'operation', 'status', 'attempt', 'request_id',
        'http_status', 'response_payload', 'error_message', 'started_at', 'finished_at',
    ];

    protected function casts(): array
    {
        return ['response_payload' => 'array', 'started_at' => 'datetime', 'finished_at' => 'datetime'];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LeaveExportBatch::class, 'batch_id');
    }
}
