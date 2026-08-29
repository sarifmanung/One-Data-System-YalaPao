<?php

namespace App\Services\Governance;

use App\Models\AuditEvent;
use Illuminate\Support\Str;

class AuditService
{
    public function record(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?array $before = null,
        ?array $after = null,
        ?array $metadata = null,
        ?int $actorUserId = null,
        ?string $tenantId = null,
        ?string $affiliationId = null,
        ?string $correlationId = null,
    ): AuditEvent {
        return AuditEvent::create([
            'actor_user_id' => $actorUserId,
            'tenant_id' => $tenantId,
            'affiliation_id' => $affiliationId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'before' => $before,
            'after' => $after,
            'metadata' => $metadata,
            'correlation_id' => $correlationId ?: (string) Str::uuid(),
        ]);
    }
}
