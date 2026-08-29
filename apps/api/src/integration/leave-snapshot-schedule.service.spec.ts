import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '@onedata/contracts';
import { LeaveSnapshotScheduleService } from './leave-snapshot-schedule.service';

const context = {
  workspace: {
    id: 'affiliation-1',
    kind: 'affiliation' as const,
    code: 'AFF-1',
    name: 'หน่วยงานทดสอบ',
    role: 'ADMIN',
  },
  source: 'identity-selection' as const,
};

const user: CurrentUser = {
  id: 'admin-1',
  username: 'admin-1',
  displayName: 'Admin',
  roles: ['health_admin'],
  permissions: ['leave.snapshot.schedule.manage'],
  workspaces: [context.workspace],
};

function schedule(status: 'DRAFT' | 'APPROVED' | 'PAUSED' = 'DRAFT') {
  return {
    id: 'schedule-1',
    affiliationId: 'affiliation-1',
    mode: 'MONTHLY_PREVIOUS_PERIOD',
    cutoffDays: 3,
    contractVersion: '1.0',
    status,
    approvedBy: status === 'DRAFT' ? null : 'admin-1',
    approvedAt: status === 'DRAFT' ? null : new Date('2026-08-29T00:00:00.000Z'),
    createdBy: 'admin-1',
    createdAt: new Date('2026-08-29T00:00:00.000Z'),
    updatedAt: new Date('2026-08-29T00:00:00.000Z'),
  };
}

function service(prisma: Record<string, unknown>, values: Record<string, string> = {}) {
  return new LeaveSnapshotScheduleService(
    prisma as never,
    new ConfigService({ SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION: '1.0', ...values }),
  );
}

describe('LeaveSnapshotScheduleService', () => {
  it('creates a draft schedule and records the change', async () => {
    const created = schedule();
    const tx = {
      leaveSnapshotSchedule: { create: jest.fn().mockResolvedValue(created) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      leaveSnapshotSchedule: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation(async (callback: (client: unknown) => unknown) => callback(tx)),
    };

    const result = await service(prisma).upsertDraft(user, context, {
      affiliationId: 'affiliation-1',
      cutoffDays: 3,
      contractVersion: '1.0',
    });

    expect(result).toMatchObject({ id: 'schedule-1', status: 'DRAFT', cutoffDays: 3 });
    expect(tx.leaveSnapshotSchedule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'DRAFT', mode: 'MONTHLY_PREVIOUS_PERIOD' }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('requires an approved contract version before activation', async () => {
    const prisma = {
      leaveSnapshotSchedule: { findFirst: jest.fn().mockResolvedValue(schedule()) },
    };

    await expect(service(prisma, { SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION: '1.1' })
      .approve(user, context, 'schedule-1'))
      .rejects.toThrow('does not match the configured Special contract');
  });

  it('approves and pauses a schedule through audited state transitions', async () => {
    const approved = schedule('APPROVED');
    const tx = {
      leaveSnapshotSchedule: { update: jest.fn().mockResolvedValue(approved) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      leaveSnapshotSchedule: {
        findFirst: jest.fn().mockResolvedValue(schedule()),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (client: unknown) => unknown) => callback(tx)),
    };

    const approvedResult = await service(prisma).approve(user, context, 'schedule-1');
    expect(approvedResult.status).toBe('APPROVED');
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LEAVE_SNAPSHOT_SCHEDULE_APPROVED' }),
    }));

    prisma.leaveSnapshotSchedule.findFirst = jest.fn().mockResolvedValue(schedule('APPROVED'));
    tx.leaveSnapshotSchedule.update.mockResolvedValue(schedule('PAUSED'));
    const pausedResult = await service(prisma).pause(user, context, 'schedule-1');
    expect(pausedResult.status).toBe('PAUSED');
    expect(tx.auditEvent.create).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LEAVE_SNAPSHOT_SCHEDULE_PAUSED' }),
    }));
  });
});
