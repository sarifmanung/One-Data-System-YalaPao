import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SpecialLeaveSnapshotPayload = {
  contract_version: string;
  period: string;
  period_year: number;
  period_month: number;
  snapshot_version: number;
  idempotency_key: string;
  source_cutoff: string;
  source_hash: string;
  employees: Array<{
    special_employee_id: string;
    leave_entries: Array<{
      one_data_leave_id: string;
      // These two fields are additive in contract v1.1. The checked-in
      // Special-Allowances DTO still accepts only the v1.0 shape, so the
      // adapter omits them when it is configured for v1.0.
      status?: 'PAPER_APPROVED';
      type: string;
      starts_on: string;
      ends_on: string;
      dates: string[];
      duration_days?: number;
      paper_decision_recorded_at?: string;
      revision: number;
    }>;
  }>;
};

export type SpecialLeaveSnapshotResponse = {
  status: 'applied' | 'duplicate';
  periodId: string;
  period: string;
  snapshotVersion: number;
  processedEmployees: number;
  processedLeaveEntries: number;
};

export class SpecialLeaveSnapshotError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null,
    readonly retryable: boolean,
    readonly response: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'SpecialLeaveSnapshotError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadGatewayException(`Special leave snapshot response field is invalid: ${field}`);
  }
  return value;
}

@Injectable()
export class SpecialLeaveSnapshotClient {
  constructor(private readonly config: ConfigService) {}

  async send(payload: SpecialLeaveSnapshotPayload): Promise<SpecialLeaveSnapshotResponse> {
    const baseUrl = this.config.get<string>('SPECIAL_ALLOWANCES_BASE_URL')?.trim();
    const integrationToken = this.config.get<string>('SPECIAL_ALLOWANCES_INTEGRATION_TOKEN')?.trim();
    if (!baseUrl || !integrationToken) {
      throw new ServiceUnavailableException('Special-Allowances leave snapshot integration is not configured.');
    }

    let response: Response;
    try {
      response = await fetch(new URL(
        `/internal/api/v1/periods/${payload.period}/leave-snapshot`,
        `${baseUrl.replace(/\/+$/, '')}/`,
      ), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${integrationToken}`,
          'idempotency-key': payload.idempotency_key,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs()),
      });
    } catch {
      throw new SpecialLeaveSnapshotError(
        'Special-Allowances leave snapshot endpoint is unreachable.',
        null,
        true,
      );
    }

    const body = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      throw new SpecialLeaveSnapshotError(
        this.errorMessage(body, `Special-Allowances returned HTTP ${response.status}.`),
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
        isRecord(body) ? body : null,
      );
    }

    return this.parseResponse(body);
  }

  private parseResponse(value: unknown): SpecialLeaveSnapshotResponse {
    if (!isRecord(value) || !isRecord(value.data)) {
      throw new BadGatewayException('Special leave snapshot response is invalid.');
    }

    const data = value.data;
    if (data.status !== 'applied' && data.status !== 'duplicate') {
      throw new BadGatewayException('Special leave snapshot response status is invalid.');
    }
    if (typeof data.periodId !== 'string' || data.periodId.length === 0) {
      throw new BadGatewayException('Special leave snapshot response periodId is invalid.');
    }
    if (typeof data.period !== 'string' || !/^\d{4}-\d{2}$/.test(data.period)) {
      throw new BadGatewayException('Special leave snapshot response period is invalid.');
    }

    return {
      status: data.status,
      periodId: data.periodId,
      period: data.period,
      snapshotVersion: numberValue(data.snapshotVersion, 'snapshotVersion'),
      processedEmployees: numberValue(data.processedEmployees, 'processedEmployees'),
      processedLeaveEntries: numberValue(data.processedLeaveEntries, 'processedLeaveEntries'),
    };
  }

  private errorMessage(value: unknown, fallback: string): string {
    if (!isRecord(value)) {
      return fallback;
    }
    for (const key of ['detail', 'message', 'error']) {
      const message = value[key];
      if (typeof message === 'string' && message.trim().length > 0) {
        return message.slice(0, 2_000);
      }
    }
    return fallback;
  }

  private timeoutMs(): number {
    const configured = Number(this.config.get<string>('SPECIAL_ALLOWANCES_TIMEOUT_MS', '10000'));
    if (!Number.isFinite(configured) || configured < 1_000) {
      return 10_000;
    }
    return Math.min(Math.floor(configured), 60_000);
  }

  contractVersion(): string {
    // The checked-in Special-Allowances DTO currently accepts 1.0. Keep this
    // configurable so the coordinated upstream contract can move to 1.1.
    return this.config.get<string>('SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION', '1.0').trim() || '1.0';
  }
}
