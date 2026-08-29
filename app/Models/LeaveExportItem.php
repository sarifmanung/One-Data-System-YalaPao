<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveExportItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'batch_id', 'leave_request_id', 'person_id', 'external_employee_id',
        'external_leave_type', 'payload', 'source_hash',
    ];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LeaveExportBatch::class, 'batch_id');
    }

    public function leaveRequest(): BelongsTo
    {
        return $this->belongsTo(LeaveRequest::class);
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}
