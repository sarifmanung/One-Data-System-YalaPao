import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import type {
  CurrentUser,
  LeaveExportBatchSummary,
  LeaveExportDeliverySummary,
} from '@onedata/contracts';
import { LEAVE_SNAPSHOT_MANAGE } from '@onedata/contracts';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../common/tenant/tenant-context';
import { hasOneDataPermission } from '../platform/auth/permissions';
import { SPECIAL_ALLOWANCES_SOURCE_SYSTEM } from '../people/special-master-data.client';
import type { PrepareLeaveSnapshotDto } from './dto/prepare-leave-snapshot.dto';
import {
  SpecialLeaveSnapshotClient,
  SpecialLeaveSnapshotError,
  type SpecialLeaveSnapshotPayload,
} from './special-leave-snapshot.client';

const MAX_DELIVERY_ATTEMPTS = 5;

const SPECIAL_LEAVE_TYPE_BY_ONE_DATA_CODE: Readonly<Record<string, string>> = {
  PERSONAL: 'PERSONAL_LEAVE',
  PERSONAL_LEAVE: 'PERSONAL_LEAVE',
  SICK: 'SICK_LEAVE',
  SICK_LEAVE: 'SICK_LEAVE',
  ANNUAL: 'VACATION_LEAVE',
  VACATION_LEAVE: 'VACATION_LEAVE',
  ABSENT: 'ABSENT',
  MATERNITY: 'MATERNITY_LEAVE',
  MATERNITY_LEAVE: 'MATERNITY_LEAVE',
  HAJJ: 'HAJJ_LEAVE',
  HAJJ_LEAVE: 'HAJJ_LEAVE',
  ORDAIN: 'ORDAIN_LEAVE',
  ORDAIN_LEAVE: 'ORDAIN_LEAVE',
};

type PeriodWindow = {
  period: string;
  year: number;
  month: number;
  startsOn: Date;
  endsOn: Date;
};

type SnapshotCore = Omit<SpecialLeaveSnapshotPayload, 'snapshot_version' | 'idempotency_key' | 'source_hash'>;

type BatchWithDeliveries = {
  id: string;
  affiliationId: string;
  period: string;
  periodYear: number;
  periodMonth: number;
  snapshotVersion: number;
  contractVersion: string;
  sourceCutoff: Date;
  sourceHash: string;
  idempotencyKey: string;
  payload: Prisma.JsonValue;
  status: string;
  processedEmployees: number;
  processedLeaveEntries: number;
  lastError: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deliveries: Array<{
    id: string;
    attempt: number;
    status: string;
    httpStatus: number | null;
    retryable: boolean;
    nextAttemptAt: Date | null;
    sentAt: Date | null;
    lastError: string | null;
    response: Prisma.JsonValue | null;
    createdAt: Date;
  }>;
};

function dateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function dateString(value: Date): string {
  return dateOnly(value).toISOString().slice(0, 10);
}

function nextDate(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + 1));
}

function periodWindow(period: string): PeriodWindow {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) {
    throw new BadRequestException('The period must use YYYY-MM format.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    period,
    year,
    month,
    startsOn: new Date(Date.UTC(year, month - 1, 1)),
    endsOn: new Date(Date.UTC(year, month, 0)),
  };
}

function parseCutoff(value?: string): Date {
  const cutoff = value ? new Date(value) : new Date();
  if (Number.isNaN(cutoff.getTime())) {
    throw new BadRequestException('sourceCutoff must be a valid ISO timestamp.');
  }
  return cutoff;
}

function eachDate(startsOn: Date, endsOn: Date): string[] {
  const dates: string[] = [];
  for (let cursor = dateOnly(startsOn); cursor <= endsOn; cursor = nextDate(cursor)) {
    dates.push(dateString(cursor));
  }
  return dates;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function sourceHash(value: SnapshotCore): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asSnapshotPayload(value: Prisma.JsonValue): SpecialLeaveSnapshotPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConflictException('The stored leave snapshot payload is invalid.');
  }
  return value as SpecialLeaveSnapshotPayload;
}

function asBatchStatus(value: string): LeaveExportBatchSummary['status'] {
  return value as LeaveExportBatchSummary['status'];
}

function asDeliveryStatus(value: string): LeaveExportDeliverySummary['status'] {
  return value as LeaveExportDeliverySummary['status'];
}

@Injectable()
export class LeaveSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly special: SpecialLeaveSnapshotClient,
  ) {}

  async prepare(
    user: CurrentUser,
    context: TenantContext,
    input: PrepareLeaveSnapshotDto,
  ): Promise<LeaveExportBatchSummary> {
    this.assertManagePermission(user);
    const affiliationId = this.requireAffiliationWorkspace(context);
    const window = periodWindow(input.period);
    const cutoff = parseCutoff(input.sourceCutoff);
    const contractVersion = this.special.contractVersion();
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'PAPER_APPROVED',
        effectiveAt: { lte: cutoff },
        startsOn: { lte: window.endsOn },
        endsOn: { gte: window.startsOn },
        tenant: { affiliationId },
      },
      include: {
        employee: { select: { sourceSystem: true, sourceId: true } },
        leaveType: { select: { code: true } },
        paperResults: {
          where: { result: 'PAPER_APPROVED' },
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: { recordedAt: true },
        },
      },
      orderBy: [{ employeeId: 'asc' }, { startsOn: 'asc' }, { id: 'asc' }],
    });

    const employees = requests.map((request) => {
      const specialEmployeeId = request.employee.sourceSystem === SPECIAL_ALLOWANCES_SOURCE_SYSTEM
        ? request.employee.sourceId
        : null;
      if (!specialEmployeeId) {
        throw new BadRequestException(
          `Effective leave ${request.id} has no verified Special employee mapping.`,
        );
      }

      const type = SPECIAL_LEAVE_TYPE_BY_ONE_DATA_CODE[request.leaveType.code];
      if (!type) {
        throw new BadRequestException(
          `Leave type ${request.leaveType.code} is not mapped to the Special contract.`,
        );
      }

      const paperDecisionRecordedAt = request.paperResults[0]?.recordedAt;
      if (!paperDecisionRecordedAt) {
        throw new BadRequestException(`Effective leave ${request.id} has no paper decision timestamp.`);
      }

      const approvedDays = request.approvedDays?.toNumber() ?? 0;
      if (!Number.isFinite(approvedDays) || approvedDays <= 0 || approvedDays > 366) {
        throw new BadRequestException(`Effective leave ${request.id} has an invalid approved day value.`);
      }

      const startsOn = request.startsOn > window.startsOn ? request.startsOn : window.startsOn;
      const endsOn = request.endsOn < window.endsOn ? request.endsOn : window.endsOn;
      const baseEntry = {
        one_data_leave_id: request.id,
        type,
        starts_on: dateString(request.startsOn),
        ends_on: dateString(request.endsOn),
        dates: eachDate(startsOn, endsOn),
        duration_days: Number(approvedDays.toFixed(2)),
        revision: request.version,
      };
      const entry = contractVersion === '1.0'
        ? baseEntry
        : {
          ...baseEntry,
          status: 'PAPER_APPROVED' as const,
          paper_decision_recorded_at: paperDecisionRecordedAt.toISOString(),
        };

      return { specialEmployeeId, entry };
    });

    const grouped = new Map<string, SnapshotCore['employees'][number]['leave_entries']>();
    for (const item of employees) {
      const entries = grouped.get(item.specialEmployeeId) ?? [];
      entries.push(item.entry);
      grouped.set(item.specialEmployeeId, entries);
    }

    const groupedEmployees = [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([specialEmployeeId, leaveEntries]) => ({
        special_employee_id: specialEmployeeId,
        leave_entries: leaveEntries.sort((left, right) => left.one_data_leave_id.localeCompare(right.one_data_leave_id)),
      }));

    const core: SnapshotCore = {
      contract_version: contractVersion,
      period: window.period,
      period_year: window.year,
      period_month: window.month,
      source_cutoff: cutoff.toISOString(),
      employees: groupedEmployees,
    };
    const hash = sourceHash(core);
    const idempotencyKey = `leave-snapshot:${affiliationId}:${window.period}:${hash}`;

    const batchId = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.leaveExportBatch.findFirst({
        where: { affiliationId, period: window.period, sourceHash: hash },
        select: { id: true },
      });
      if (existing) {
        return existing.id;
      }

      const latest = await tx.leaveExportBatch.findFirst({
        where: { affiliationId, period: window.period },
        orderBy: { snapshotVersion: 'desc' },
        select: { snapshotVersion: true },
      });
      const snapshotVersion = (latest?.snapshotVersion ?? 0) + 1;
      const payload: SpecialLeaveSnapshotPayload = {
        ...core,
        snapshot_version: snapshotVersion,
        idempotency_key: idempotencyKey,
        source_hash: hash,
      };
      const batch = await tx.leaveExportBatch.create({
        data: {
          id: randomUUID(),
          affiliationId,
          period: window.period,
          periodYear: window.year,
          periodMonth: window.month,
          snapshotVersion,
          contractVersion,
          sourceCutoff: cutoff,
          sourceHash: hash,
          idempotencyKey,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: 'PREPARED',
          processedEmployees: groupedEmployees.length,
          processedLeaveEntries: requests.length,
          createdBy: user.id,
        },
        select: { id: true },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_SNAPSHOT_PREPARED',
          actorId: user.id,
          resourceType: 'LeaveExportBatch',
          resourceId: batch.id,
          tenantId: null,
          metadata: {
            affiliationId,
            period: window.period,
            snapshotVersion,
            sourceHash: hash,
            processedEmployees: groupedEmployees.length,
            processedLeaveEntries: requests.length,
          },
        },
      });
      return batch.id;
    });

    return this.getBatch(user, context, batchId);
  }

  async deliver(
    user: CurrentUser,
    context: TenantContext,
    batchId: string,
  ): Promise<LeaveExportBatchSummary> {
    this.assertManagePermission(user);
    const affiliationId = this.requireAffiliationWorkspace(context);
    const batch = await this.findBatch(affiliationId, batchId);
    if (batch.status === 'APPLIED' || batch.status === 'DUPLICATE') {
      return this.toSummary(batch);
    }
    if (batch.status === 'FAILED') {
      throw new ConflictException('This leave snapshot is not eligible for another delivery attempt.');
    }

    const latestDelivery = batch.deliveries[0];
    const now = new Date();
    if (latestDelivery?.nextAttemptAt && latestDelivery.nextAttemptAt > now) {
      throw new ConflictException(
        `The next delivery attempt is available after ${latestDelivery.nextAttemptAt.toISOString()}.`,
      );
    }
    const attempt = (latestDelivery?.attempt ?? 0) + 1;
    if (attempt > MAX_DELIVERY_ATTEMPTS) {
      throw new ConflictException('The maximum delivery attempts for this snapshot has been reached.');
    }

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leaveExportDelivery.create({
        data: {
          id: randomUUID(),
          batchId,
          attempt,
          status: 'SENDING',
        },
      });
      await tx.leaveExportBatch.update({
        where: { id: batchId },
        data: { status: 'DELIVERING', lastError: null },
      });
      return created;
    });

    const payload = asSnapshotPayload(batch.payload);
    try {
      const result = await this.special.send(payload);
      if (result.period !== batch.period || result.snapshotVersion !== batch.snapshotVersion) {
        throw new SpecialLeaveSnapshotError(
          'Special-Allowances acknowledged a different leave snapshot period or version.',
          502,
          false,
          result as unknown as Record<string, unknown>,
        );
      }
      const status = result.status === 'duplicate' ? 'DUPLICATE' : 'APPLIED';
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveExportDelivery.update({
          where: { id: delivery.id },
          data: {
            status,
            httpStatus: 200,
            retryable: false,
            nextAttemptAt: null,
            sentAt: new Date(),
            response: result as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.leaveExportBatch.update({
          where: { id: batchId },
          data: {
            status,
            processedEmployees: result.processedEmployees,
            processedLeaveEntries: result.processedLeaveEntries,
            lastError: null,
          },
        });
        await tx.auditEvent.create({
          data: {
            id: randomUUID(),
            action: 'LEAVE_SNAPSHOT_DELIVERED',
            actorId: user.id,
            resourceType: 'LeaveExportBatch',
            resourceId: batchId,
            tenantId: null,
            metadata: {
              status,
              attempt,
              period: batch.period,
              snapshotVersion: batch.snapshotVersion,
              processedEmployees: result.processedEmployees,
              processedLeaveEntries: result.processedLeaveEntries,
            },
          },
        });
      });
    } catch (error) {
      const failure = this.deliveryFailure(error);
      const retryable = failure.retryable && attempt < MAX_DELIVERY_ATTEMPTS;
      const nextAttemptAt = retryable ? new Date(Date.now() + this.retryDelayMs(attempt)) : null;
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveExportDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            httpStatus: failure.httpStatus,
            retryable,
            nextAttemptAt,
            lastError: failure.message,
          },
        });
        await tx.leaveExportBatch.update({
          where: { id: batchId },
          data: {
            status: retryable ? 'RETRYABLE_FAILURE' : 'FAILED',
            lastError: failure.message,
          },
        });
        await tx.auditEvent.create({
          data: {
            id: randomUUID(),
            action: 'LEAVE_SNAPSHOT_DELIVERY_FAILED',
            actorId: user.id,
            resourceType: 'LeaveExportBatch',
            resourceId: batchId,
            tenantId: null,
            metadata: {
              attempt,
              retryable,
              httpStatus: failure.httpStatus,
              period: batch.period,
              snapshotVersion: batch.snapshotVersion,
            },
          },
        });
      });

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof SpecialLeaveSnapshotError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }

    return this.getBatch(user, context, batchId);
  }

  async getBatch(
    user: CurrentUser,
    context: TenantContext,
    batchId: string,
  ): Promise<LeaveExportBatchSummary> {
    this.assertManagePermission(user);
    const affiliationId = this.requireAffiliationWorkspace(context);
    return this.toSummary(await this.findBatch(affiliationId, batchId));
  }

  private async findBatch(affiliationId: string, batchId: string): Promise<BatchWithDeliveries> {
    const batch = await this.prisma.leaveExportBatch.findFirst({
      where: { id: batchId, affiliationId },
      include: { deliveries: { orderBy: { attempt: 'desc' } } },
    });
    if (!batch) {
      throw new NotFoundException('Leave snapshot batch not found.');
    }
    return batch as BatchWithDeliveries;
  }

  private toSummary(batch: BatchWithDeliveries): LeaveExportBatchSummary {
    return {
      id: batch.id,
      affiliationId: batch.affiliationId,
      period: batch.period,
      snapshotVersion: batch.snapshotVersion,
      contractVersion: batch.contractVersion,
      status: asBatchStatus(batch.status),
      sourceCutoff: batch.sourceCutoff.toISOString(),
      sourceHash: batch.sourceHash,
      idempotencyKey: batch.idempotencyKey,
      processedEmployees: batch.processedEmployees,
      processedLeaveEntries: batch.processedLeaveEntries,
      lastError: batch.lastError,
      createdBy: batch.createdBy,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      deliveries: batch.deliveries.map((delivery) => ({
        id: delivery.id,
        attempt: delivery.attempt,
        status: asDeliveryStatus(delivery.status),
        httpStatus: delivery.httpStatus,
        retryable: delivery.retryable,
        nextAttemptAt: delivery.nextAttemptAt?.toISOString() ?? null,
        sentAt: delivery.sentAt?.toISOString() ?? null,
        lastError: delivery.lastError,
        response: asRecord(delivery.response),
        createdAt: delivery.createdAt.toISOString(),
      })),
    };
  }

  private deliveryFailure(error: unknown): {
    message: string;
    httpStatus: number | null;
    retryable: boolean;
  } {
    if (error instanceof SpecialLeaveSnapshotError) {
      return {
        message: error.message.slice(0, 2_000),
        httpStatus: error.httpStatus,
        retryable: error.retryable,
      };
    }
    if (error instanceof ServiceUnavailableException) {
      return { message: error.message, httpStatus: 503, retryable: false };
    }
    if (error instanceof BadGatewayException) {
      return { message: error.message, httpStatus: 502, retryable: false };
    }
    return {
      message: error instanceof Error ? error.message.slice(0, 2_000) : 'Leave snapshot delivery failed.',
      httpStatus: null,
      retryable: true,
    };
  }

  private retryDelayMs(attempt: number): number {
    return Math.min(3_600_000, 60_000 * (2 ** Math.max(0, attempt - 1)));
  }

  private assertManagePermission(user: CurrentUser): void {
    if (!hasOneDataPermission(user, LEAVE_SNAPSHOT_MANAGE)) {
      throw new ForbiddenException('The account cannot manage leave snapshots.');
    }
  }

  private requireAffiliationWorkspace(context: TenantContext): string {
    if (context.workspace.kind !== 'affiliation') {
      throw new BadRequestException('An affiliation workspace is required for a leave snapshot.');
    }
    return context.workspace.id;
  }
}
