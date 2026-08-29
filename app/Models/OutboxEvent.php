<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutboxEvent extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'event_type', 'aggregate_type', 'aggregate_id', 'payload', 'attempts',
        'available_at', 'processed_at', 'last_error',
    ];

    protected function casts(): array
    {
        return ['payload' => 'array', 'available_at' => 'datetime', 'processed_at' => 'datetime'];
    }
}
