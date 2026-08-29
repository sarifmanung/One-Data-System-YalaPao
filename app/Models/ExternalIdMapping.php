<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExternalIdMapping extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'system', 'entity_type', 'local_id', 'external_id', 'external_type', 'metadata',
    ];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}
