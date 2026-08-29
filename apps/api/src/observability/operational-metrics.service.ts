import { Injectable } from '@nestjs/common';

export interface OperationalMetricsSnapshot {
  service: 'onedata-api';
  startedAt: string;
  uptimeSeconds: number;
  requestsTotal: number;
  responsesByClass: Record<string, number>;
}

@Injectable()
export class OperationalMetricsService {
  private readonly startedAt = new Date().toISOString();
  private requestsTotal = 0;
  private readonly responsesByClass = new Map<string, number>();

  recordResponse(statusCode: number): void {
    this.requestsTotal += 1;
    const statusClass = Number.isInteger(statusCode) && statusCode >= 100 && statusCode < 600
      ? `${Math.floor(statusCode / 100)}xx`
      : 'other';
    this.responsesByClass.set(
      statusClass,
      (this.responsesByClass.get(statusClass) ?? 0) + 1,
    );
  }

  snapshot(): OperationalMetricsSnapshot {
    return {
      service: 'onedata-api',
      startedAt: this.startedAt,
      uptimeSeconds: Math.max(0, Math.floor(process.uptime())),
      requestsTotal: this.requestsTotal,
      responsesByClass: Object.fromEntries(
        [...this.responsesByClass.entries()].sort(([left], [right]) => left.localeCompare(right)),
      ),
    };
  }
}
