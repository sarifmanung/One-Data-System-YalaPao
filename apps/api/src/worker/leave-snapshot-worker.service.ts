import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { CurrentUser, WorkspaceSummary } from '@onedata/contracts';
import { LEAVE_SNAPSHOT_MANAGE } from '@onedata/contracts';
import type { TenantContext } from '../common/tenant/tenant-context';
import { PrismaService } from '../database/prisma.service';
import { LeaveSnapshotService } from '../integration/leave-snapshot.service';

type WorkerMode = 'RETRY' | 'MONTHLY' | 'ALL';

export type LeaveSnapshotWorkerReport = {
  lockAcquired: boolean;
  retried: number;
  retryFailures: number;
  monthlyPrepared: number;
  monthlyDelivered: number;
  monthlySkipped: number;
  errors: Array<{ affiliationId: string | null; batchId?: string; message: string }>;
};

type AffiliationRow = {
  id: string;
  code: string;
  name: string;
};

type ApprovedScheduleRow = {
  id: string;
  affiliationId: string;
  cutoffDays: number;
  contractVersion: string;
  affiliation: AffiliationRow;
};

const WORKER_LOCK_NAME = 'onedata:leave-snapshot-worker';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_CUTOFF_DAYS = 3;

function previousMonthPeriod(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}

function periodEnd(period: string): Date {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) {
    throw new Error('ONEDATA_LEAVE_SNAPSHOT_PERIOD must use YYYY-MM format.');
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]), 0, 23, 59, 59, 999));
}

function monthlyCutoff(period: string, cutoffDays: number): Date {
  const end = periodEnd(period);
  return new Date(end.getTime() + cutoffDays * 86_400_000);
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message.slice(0, 2_000)
    : 'Leave snapshot worker task failed.';
}

@Injectable()
export class LeaveSnapshotWorkerService {
  private readonly logger = new Logger(LeaveSnapshotWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: LeaveSnapshotService,
    private readonly config: ConfigService,
  ) {}

  isEnabled(): boolean {
    return this.config.get<string>('ONEDATA_WORKER_ENABLED', 'false') === 'true';
  }

  intervalMs(): number {
    const configured = Number(this.config.get<string>('ONEDATA_WORKER_INTERVAL_MS', String(DEFAULT_INTERVAL_MS)));
    return Number.isFinite(configured) && configured >= 5_000
      ? Math.min(Math.floor(configured), 86_400_000)
      : DEFAULT_INTERVAL_MS;
  }

  async runOnce(): Promise<LeaveSnapshotWorkerReport> {
    const emptyReport = (): LeaveSnapshotWorkerReport => ({
      lockAcquired: false,
      retried: 0,
      retryFailures: 0,
      monthlyPrepared: 0,
      monthlyDelivered: 0,
      monthlySkipped: 0,
      errors: [],
    });

    const report = await this.withWorkerLock(async () => {
      const result = emptyReport();
      result.lockAcquired = true;
      const mode = this.mode();

      if (mode === 'RETRY' || mode === 'ALL') {
        await this.retryDueDeliveries(result);
      }
      if ((mode === 'MONTHLY' || mode === 'ALL')
        && this.config.get<string>('ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED', 'false') === 'true') {
        await this.prepareAndDeliverMonthly(result);
      }

      return result;
    });

    return report ?? emptyReport();
  }

  private async retryDueDeliveries(report: LeaveSnapshotWorkerReport): Promise<void> {
    const now = new Date();
    const candidates = await this.prisma.leaveExportBatch.findMany({
      where: {
        status: 'RETRYABLE_FAILURE',
        deliveries: {
          some: {
            status: 'FAILED',
            retryable: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: this.batchSize(),
      select: {
        id: true,
        affiliationId: true,
        deliveries: {
          orderBy: { attempt: 'desc' },
          take: 1,
          select: { nextAttemptAt: true },
        },
      },
    });
    const due = candidates.filter((batch) => {
      const nextAttemptAt = batch.deliveries[0]?.nextAttemptAt;
      return nextAttemptAt !== null && nextAttemptAt !== undefined && nextAttemptAt <= now;
    });

    for (const batch of due) {
      try {
        const affiliation = await this.affiliation(batch.affiliationId);
        await this.snapshots.deliver(
          this.workerUser(affiliation),
          this.affiliationContext(affiliation),
          batch.id,
        );
        report.retried += 1;
      } catch (error) {
        report.retryFailures += 1;
        report.errors.push({ affiliationId: batch.affiliationId, batchId: batch.id, message: errorMessage(error) });
      }
    }
  }

  private async prepareAndDeliverMonthly(report: LeaveSnapshotWorkerReport): Promise<void> {
    const now = new Date();
    const period = this.periodForRun();

    const schedules = await this.approvedSchedules();
    if (schedules.length === 0) {
      report.monthlySkipped += 1;
      return;
    }

    const configuredContractVersion = this.config.get<string>(
      'SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION',
      '1.0',
    ).trim() || '1.0';
    for (const schedule of schedules) {
      const affiliation = schedule.affiliation;
      if (schedule.contractVersion !== configuredContractVersion) {
        report.errors.push({
          affiliationId: affiliation.id,
          message: 'Approved snapshot schedule contract version does not match the configured Special contract.',
        });
        continue;
      }
      const existing = await this.prisma.leaveExportBatch.findFirst({
        where: { affiliationId: affiliation.id, period },
        select: { id: true, status: true },
      });
      if (existing) {
        report.monthlySkipped += 1;
        continue;
      }

      const user = this.workerUser(affiliation);
      const context = this.affiliationContext(affiliation);
      try {
        const scheduleCutoff = this.cutoffForRun(period, schedule.cutoffDays);
        if (now < scheduleCutoff) {
          report.monthlySkipped += 1;
          continue;
        }
        const batch = await this.snapshots.prepare(user, context, {
          period,
          sourceCutoff: scheduleCutoff.toISOString(),
        });
        report.monthlyPrepared += 1;
        await this.snapshots.deliver(user, context, batch.id);
        report.monthlyDelivered += 1;
      } catch (error) {
        report.errors.push({ affiliationId: affiliation.id, message: errorMessage(error) });
      }
    }
  }

  private async approvedSchedules(): Promise<ApprovedScheduleRow[]> {
    const configured = this.config.get<string>('ONEDATA_LEAVE_SNAPSHOT_AFFILIATION_ID')?.trim();
    return this.prisma.leaveSnapshotSchedule.findMany({
      where: {
        status: 'APPROVED',
        mode: 'MONTHLY_PREVIOUS_PERIOD',
        ...(configured ? { affiliationId: configured } : {}),
        affiliation: { status: 'ACTIVE' },
      },
      orderBy: { affiliationId: 'asc' },
      select: {
        id: true,
        affiliationId: true,
        cutoffDays: true,
        contractVersion: true,
        affiliation: { select: { id: true, code: true, name: true } },
      },
    });
  }

  private async affiliation(id: string): Promise<AffiliationRow> {
    const affiliation = await this.prisma.affiliation.findFirst({
      where: { id, status: 'ACTIVE' },
      select: { id: true, code: true, name: true },
    });
    if (!affiliation) {
      throw new Error(`Active affiliation ${id} was not found.`);
    }
    return affiliation;
  }

  private workerUser(affiliation: AffiliationRow): CurrentUser {
    const workerId = this.config.get<string>('ONEDATA_WORKER_ID', 'onedata-worker');
    const workspace: WorkspaceSummary = {
      id: affiliation.id,
      kind: 'affiliation',
      code: affiliation.code,
      name: affiliation.name,
      role: 'SYSTEM_WORKER',
    };
    return {
      id: workerId,
      username: workerId,
      displayName: 'One Data background worker',
      roles: ['SYSTEM_WORKER'],
      permissions: [LEAVE_SNAPSHOT_MANAGE],
      workspaces: [workspace],
    };
  }

  private affiliationContext(affiliation: AffiliationRow): TenantContext {
    return {
      workspace: {
        id: affiliation.id,
        kind: 'affiliation',
        code: affiliation.code,
        name: affiliation.name,
        role: 'SYSTEM_WORKER',
      },
      source: 'identity-default',
    };
  }

  private mode(): WorkerMode {
    const value = this.config.get<string>('ONEDATA_WORKER_MODE', 'ALL').trim().toUpperCase();
    return value === 'RETRY' || value === 'MONTHLY' ? value : 'ALL';
  }

  private batchSize(): number {
    const value = Number(this.config.get<string>('ONEDATA_WORKER_BATCH_SIZE', String(DEFAULT_BATCH_SIZE)));
    return Number.isFinite(value) && value >= 1 ? Math.min(Math.floor(value), 100) : DEFAULT_BATCH_SIZE;
  }

  private periodForRun(): string {
    const configured = this.config.get<string>('ONEDATA_LEAVE_SNAPSHOT_PERIOD')?.trim();
    if (configured) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(configured)) {
        throw new Error('ONEDATA_LEAVE_SNAPSHOT_PERIOD must use YYYY-MM format.');
      }
      return configured;
    }
    return previousMonthPeriod(new Date());
  }

  private cutoffForRun(period: string, scheduleCutoffDays: number): Date {
    const configuredCutoff = this.config.get<string>('ONEDATA_LEAVE_SNAPSHOT_SOURCE_CUTOFF')?.trim();
    if (configuredCutoff) {
      const cutoff = new Date(configuredCutoff);
      if (Number.isNaN(cutoff.getTime())) {
        throw new Error('ONEDATA_LEAVE_SNAPSHOT_SOURCE_CUTOFF must be a valid ISO timestamp.');
      }
      return cutoff;
    }

    const configuredDaysRaw = this.config.get<string>('ONEDATA_LEAVE_SNAPSHOT_CUTOFF_DAYS')?.trim();
    const configuredDays = configuredDaysRaw === undefined || configuredDaysRaw === ''
      ? scheduleCutoffDays
      : Number(configuredDaysRaw);
    const days = Number.isFinite(configuredDays) && configuredDays >= 0
      ? Math.min(Math.floor(configuredDays), 31)
      : DEFAULT_CUTOFF_DAYS;
    return monthlyCutoff(period, days);
  }

  private async withWorkerLock<T>(callback: () => Promise<T>): Promise<T | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ acquired: number | bigint }>>(
        Prisma.sql`SELECT GET_LOCK(${WORKER_LOCK_NAME}, 0) AS acquired`,
      );
      if (Number(rows[0]?.acquired) !== 1) {
        this.logger.debug('Another leave snapshot worker already owns the lock.');
        return null;
      }

      try {
        return await callback();
      } finally {
        await tx.$queryRaw(Prisma.sql`SELECT RELEASE_LOCK(${WORKER_LOCK_NAME})`);
      }
    });
  }
}
