import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CurrentUser,
  LeaveSnapshotScheduleSummary,
} from '@onedata/contracts';
import { LEAVE_SNAPSHOT_SCHEDULE_MANAGE } from '@onedata/contracts';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../common/tenant/tenant-context';
import { hasOneDataPermission } from '../platform/auth/permissions';
import type { UpsertLeaveSnapshotScheduleDto } from './dto/upsert-leave-snapshot-schedule.dto';

const MONTHLY_PREVIOUS_PERIOD = 'MONTHLY_PREVIOUS_PERIOD' as const;
const SCHEDULE_STATUSES = ['DRAFT', 'APPROVED', 'PAUSED'] as const;

type ScheduleRow = {
  id: string;
  affiliationId: string;
  mode: string;
  cutoffDays: number;
  contractVersion: string;
  status: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class LeaveSnapshotScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(user: CurrentUser, context: TenantContext): Promise<LeaveSnapshotScheduleSummary[]> {
    this.assertManagePermission(user);
    const affiliationId = this.requireAffiliationWorkspace(context);
    const schedules = await this.prisma.leaveSnapshotSchedule.findMany({
      where: { affiliationId },
      orderBy: [{ mode: 'asc' }, { updatedAt: 'desc' }],
    });
    return schedules.map((schedule) => this.toSummary(schedule as ScheduleRow));
  }

  async upsertDraft(
    user: CurrentUser,
    context: TenantContext,
    input: UpsertLeaveSnapshotScheduleDto,
  ): Promise<LeaveSnapshotScheduleSummary> {
    this.assertManagePermission(user);
    this.assertAffiliationWorkspace(context, input.affiliationId);
    this.assertScheduleInput(input);

    const existing = await this.prisma.leaveSnapshotSchedule.findUnique({
      where: {
        affiliationId_mode: {
          affiliationId: input.affiliationId,
          mode: MONTHLY_PREVIOUS_PERIOD,
        },
      },
    });
    if (existing?.status === 'APPROVED') {
      throw new ConflictException('Pause the approved schedule before changing its configuration.');
    }

    const schedule = await this.prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.leaveSnapshotSchedule.update({
            where: { id: existing.id },
            data: {
              cutoffDays: input.cutoffDays,
              contractVersion: input.contractVersion,
              status: 'DRAFT',
              approvedBy: null,
              approvedAt: null,
            },
          })
        : await tx.leaveSnapshotSchedule.create({
            data: {
              id: randomUUID(),
              affiliationId: input.affiliationId,
              mode: MONTHLY_PREVIOUS_PERIOD,
              cutoffDays: input.cutoffDays,
              contractVersion: input.contractVersion,
              status: 'DRAFT',
              createdBy: user.id,
            },
          });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: existing ? 'LEAVE_SNAPSHOT_SCHEDULE_DRAFT_UPDATED' : 'LEAVE_SNAPSHOT_SCHEDULE_DRAFT_CREATED',
          actorId: user.id,
          resourceType: 'LeaveSnapshotSchedule',
          resourceId: saved.id,
          tenantId: null,
          metadata: {
            affiliationId: input.affiliationId,
            mode: MONTHLY_PREVIOUS_PERIOD,
            cutoffDays: input.cutoffDays,
            contractVersion: input.contractVersion,
          },
        },
      });
      return saved;
    });

    return this.toSummary(schedule as ScheduleRow);
  }

  async approve(user: CurrentUser, context: TenantContext, id: string): Promise<LeaveSnapshotScheduleSummary> {
    this.assertManagePermission(user);
    const affiliationId = this.requireAffiliationWorkspace(context);
    const schedule = await this.findAccessible(user, id, affiliationId);
    if (schedule.status !== 'DRAFT' && schedule.status !== 'PAUSED') {
      throw new ConflictException('Only a draft or paused schedule can be approved.');
    }
    if (schedule.contractVersion !== this.currentContractVersion()) {
      throw new ConflictException('The schedule contract version does not match the configured Special contract.');
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.leaveSnapshotSchedule.update({
        where: { id: schedule.id },
        data: { status: 'APPROVED', approvedBy: user.id, approvedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_SNAPSHOT_SCHEDULE_APPROVED',
          actorId: user.id,
          resourceType: 'LeaveSnapshotSchedule',
          resourceId: schedule.id,
          tenantId: null,
          metadata: {
            affiliationId: schedule.affiliationId,
            mode: schedule.mode,
            cutoffDays: schedule.cutoffDays,
            contractVersion: schedule.contractVersion,
          },
        },
      });
      return saved;
    });
    return this.toSummary(approved as ScheduleRow);
  }

  async pause(user: CurrentUser, context: TenantContext, id: string): Promise<LeaveSnapshotScheduleSummary> {
    this.assertManagePermission(user);
    const affiliationId = this.requireAffiliationWorkspace(context);
    const schedule = await this.findAccessible(user, id, affiliationId);
    if (schedule.status !== 'APPROVED') {
      throw new ConflictException('Only an approved schedule can be paused.');
    }

    const paused = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.leaveSnapshotSchedule.update({
        where: { id: schedule.id },
        data: { status: 'PAUSED' },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_SNAPSHOT_SCHEDULE_PAUSED',
          actorId: user.id,
          resourceType: 'LeaveSnapshotSchedule',
          resourceId: schedule.id,
          tenantId: null,
          metadata: { affiliationId: schedule.affiliationId, mode: schedule.mode },
        },
      });
      return saved;
    });
    return this.toSummary(paused as ScheduleRow);
  }

  private async findAccessible(user: CurrentUser, id: string, affiliationId: string): Promise<ScheduleRow> {
    const schedule = await this.prisma.leaveSnapshotSchedule.findFirst({
      where: { id, affiliationId },
    });
    if (!schedule) {
      throw new NotFoundException('Leave snapshot schedule not found.');
    }
    if (!this.affiliationIds(user).includes(schedule.affiliationId)) {
      throw new ForbiddenException('The account cannot manage this affiliation schedule.');
    }
    return schedule as ScheduleRow;
  }

  private assertScheduleInput(input: UpsertLeaveSnapshotScheduleDto): void {
    if (!Number.isInteger(input.cutoffDays) || input.cutoffDays < 0 || input.cutoffDays > 31) {
      throw new BadRequestException('cutoffDays must be an integer between 0 and 31.');
    }
    if (input.contractVersion !== this.currentContractVersion()) {
      throw new BadRequestException('contractVersion must match the configured Special contract.');
    }
  }

  private currentContractVersion(): string {
    return this.config.get<string>('SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION', '1.0').trim() || '1.0';
  }

  private assertManagePermission(user: CurrentUser): void {
    if (!hasOneDataPermission(user, LEAVE_SNAPSHOT_SCHEDULE_MANAGE)) {
      throw new ForbiddenException('The account cannot manage leave snapshot schedules.');
    }
  }

  private affiliationIds(user: CurrentUser): string[] {
    return user.workspaces.filter((workspace) => workspace.kind === 'affiliation').map((workspace) => workspace.id);
  }

  private assertAffiliationWorkspace(context: TenantContext, affiliationId: string): void {
    if (context.workspace.kind !== 'affiliation') {
      throw new BadRequestException('An affiliation workspace is required for a snapshot schedule.');
    }
    if (context.workspace.id !== affiliationId) {
      throw new ForbiddenException('The selected affiliation does not match the schedule.');
    }
  }

  private requireAffiliationWorkspace(context: TenantContext): string {
    if (context.workspace.kind !== 'affiliation') {
      throw new BadRequestException('An affiliation workspace is required for a snapshot schedule.');
    }
    return context.workspace.id;
  }

  private toSummary(schedule: ScheduleRow): LeaveSnapshotScheduleSummary {
    if (schedule.mode !== MONTHLY_PREVIOUS_PERIOD) {
      throw new ConflictException('Stored leave snapshot schedule has an unsupported mode.');
    }
    if (!(SCHEDULE_STATUSES as readonly string[]).includes(schedule.status)) {
      throw new ConflictException('Stored leave snapshot schedule has an invalid status.');
    }
    return {
      id: schedule.id,
      affiliationId: schedule.affiliationId,
      mode: MONTHLY_PREVIOUS_PERIOD,
      cutoffDays: schedule.cutoffDays,
      contractVersion: schedule.contractVersion,
      status: schedule.status as LeaveSnapshotScheduleSummary['status'],
      approvedBy: schedule.approvedBy,
      approvedAt: schedule.approvedAt?.toISOString() ?? null,
      createdBy: schedule.createdBy,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }
}
