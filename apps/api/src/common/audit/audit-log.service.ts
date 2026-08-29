import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface AuditEventInput {
  action: string;
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  createdAt: string;
}

/**
 * Foundation-only audit sink. It will be replaced by a durable append-only
 * store when the API gets its database module; mutations must still call this
 * service so the boundary remains stable.
 */
@Injectable()
export class AuditLogService {
  private readonly events: AuditEvent[] = [];
  private readonly maxEvents = 1_000;

  record(input: AuditEventInput): AuditEvent {
    const event: AuditEvent = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      metadata: input.metadata ? { ...input.metadata } : {},
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return event;
  }

  list(): readonly AuditEvent[] {
    return this.events;
  }
}
