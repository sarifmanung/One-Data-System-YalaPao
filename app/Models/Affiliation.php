<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Affiliation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['code', 'name', 'status', 'source_system', 'source_id', 'source_payload'];

    protected function casts(): array
    {
        return ['source_payload' => 'array'];
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }
}
