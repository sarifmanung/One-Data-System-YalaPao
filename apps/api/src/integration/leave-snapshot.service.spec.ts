import { BadGatewayException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CurrentUser } from '@onedata/contracts';
import { LeaveSnapshotService } from './leave-snapshot.service';
import {
  SpecialLeaveSnapshotError,
  type SpecialLeaveSnapshotClient,
} from './special-leave-snapshot.client';

function user(): CurrentUser {
  return {
    id: 'snapshot-admin',
    username: 'snapshot-admin',
    displayName: 'Snapshot Admin',
    roles: ['SPECIAL_SNAPSHOT_ADMIN'],
    permissions: ['leave.snapshot.manage'],
    workspaces: [{
      id: 'affiliation-1',
      kind: 'affiliation',
      code: 'TEST-AFFILIATION',
      name: 'หน่วยงานทดสอบ',
      role: 'SPECIAL_SNAPSHOT_ADMIN',
    }],
  };
}

const context = {
  workspace: user().workspaces[0],
  source: 'identity-selection' as const,
};

function approvedLeave(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leave-1',
    employeeId: 'employee-1',
    startsOn: new Date('2026-08-10T00:00:00.000Z'),
    endsOn: new Date('2026-08-12T00:00:00.000Z'),
    approvedDays: new Prisma.Decimal('2.00'),
    effectiveAt: new Date('2026-08-12T08:00:00.000Z'),
    version: 2,
    employee: {
      sourceSystem: 'special-allowances',
      sourceId: 'special-employee-1',
    },
    leaveType: { code: 'SICK' },
    paperResults: [{ recordedAt: new Date('2026-08-12T08:00:00.000Z') }],
    ...overrides,
  };
}

function batch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    affiliationId: 'affiliation-1',
    period: '2026-08',
    periodYear: 2026,
    periodMonth: 8,
    snapshotVersion: 1,
    contractVersion: '1.0',
    sourceCutoff: new Date('2026-08-29T08:00:00.000Z'),
    sourceHash: 'a'.repeat(64),
    idempotencyKey: 'leave-snapshot:affiliation-1:2026-08:' + 'a'.repeat(64),
    payload: {
      contract_version: '1.0',
      period: '2026-08',
      period_year: 2026,
      period_month: 8,
      snapshot_version: 1,
      idempotency_key: 'leave-snapshot:affiliation-1:2026-08:' + 'a'.repeat(64),
      source_cutoff: '2026-08-29T08:00:00.000Z',
      source_hash: 'a'.repeat(64),
      employees: [],
    },
    status: 'PREPARED',
    processedEmployees: 1,
    processedLeaveEntries: 1,
    lastError: null,
    createdBy: 'snapshot-admin',
    createdAt: new Date('2026-08-29T08:00:01.000Z'),
    updatedAt: new Date('2026-08-29T08:00:01.000Z'),
    deliveries: [],
    ...overrides,
  };
}

function snapshotService(prisma: Record<string, unknown>, client: Record<string, unknown>) {
  return new LeaveSnapshotService(prisma as never, client as unknown as SpecialLeaveSnapshotClient);
}

describe('LeaveSnapshotService', () => {
  it('prepares a mapped complete snapshot with stable hash and idempotency key', async () => {
    const tx = {
      leaveExportBatch: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const storedBatch = batch();
    const prisma = {
      leaveRequest: { findMany: jest.fn().mockResolvedValue([approvedLeave()]) },
      leaveExportBatch: { findFirst: jest.fn().mockResolvedValue(storedBatch) },
      $transaction: jest.fn().mockImplementation(
        async (callback: (transaction: unknown) => unknown) => callback(tx),
      ),
    };
    const client = { contractVersion: jest.fn().mockReturnValue('1.0') };

    const result = await snapshotService(prisma, client).prepare(
      user(),
      context,
      { period: '2026-08', sourceCutoff: '2026-08-29T08:00:00.000Z' },
    );

    const created = tx.leaveExportBatch.create.mock.calls[0][0].data;
    expect(result.id).toBe('batch-1');
    expect(created.snapshotVersion).toBe(1);
    expect(created.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.idempotencyKey).toBe(
      `leave-snapshot:affiliation-1:2026-08:${created.sourceHash}`,
    );
    expect(created.payload).toMatchObject({
      contract_version: '1.0',
      period: '2026-08',
      snapshot_version: 1,
      employees: [{
        special_employee_id: 'special-employee-1',
        leave_entries: [{
          one_data_leave_id: 'leave-1',
          type: 'SICK_LEAVE',
          starts_on: '2026-08-10',
          ends_on: '2026-08-12',
          dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
          duration_days: 2,
          revision: 2,
        }],
      }],
    });
    expect(created.payload.employees[0].leave_entries[0].status).toBeUndefined();
    expect(created.payload.employees[0].leave_entries[0].paper_decision_recorded_at).toBeUndefined();
    expect(created.payload.source_hash).toBe(created.sourceHash);
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
  });

  it('adds v1.1 paper metadata when the upstream contract is coordinated', async () => {
    const tx = {
      leaveExportBatch: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      leaveRequest: { findMany: jest.fn().mockResolvedValue([approvedLeave()]) },
      leaveExportBatch: { findFirst: jest.fn().mockResolvedValue(batch()) },
      $transaction: jest.fn().mockImplementation(
        async (callback: (transaction: unknown) => unknown) => callback(tx),
      ),
    };
    const client = { contractVersion: jest.fn().mockReturnValue('1.1') };

    await snapshotService(prisma, client).prepare(
      user(),
      context,
      { period: '2026-08', sourceCutoff: '2026-08-29T08:00:00.000Z' },
    );

    const entry = tx.leaveExportBatch.create.mock.calls[0][0].data.payload.employees[0].leave_entries[0];
    expect(entry).toMatchObject({
      status: 'PAPER_APPROVED',
      paper_decision_recorded_at: '2026-08-12T08:00:00.000Z',
    });
  });

  it('refuses an effective leave without a verified Special employee mapping', async () => {
    const prisma = {
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([
          approvedLeave({ employee: { sourceSystem: 'seed', sourceId: 'employee-1' } }),
        ]),
      },
      $transaction: jest.fn(),
    };
    const client = { contractVersion: jest.fn().mockReturnValue('1.0') };

    await expect(snapshotService(prisma, client).prepare(
      user(),
      context,
      { period: '2026-08' },
    )).rejects.toThrow('no verified Special employee mapping');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('delivers a prepared batch and records the upstream response', async () => {
    const prepared = batch();
    const applied = batch({
      status: 'APPLIED',
      deliveries: [{
        id: 'delivery-1',
        attempt: 1,
        status: 'APPLIED',
        httpStatus: 200,
        retryable: false,
        nextAttemptAt: null,
        sentAt: new Date('2026-08-29T08:01:00.000Z'),
        lastError: null,
        response: {
          status: 'applied',
          periodId: 'special-period-1',
          period: '2026-08',
          snapshotVersion: 1,
          processedEmployees: 1,
          processedLeaveEntries: 1,
        },
        createdAt: new Date('2026-08-29T08:00:10.000Z'),
      }],
    });
    const tx = {
      leaveExportDelivery: {
        create: jest.fn().mockResolvedValue({ id: 'delivery-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      leaveExportBatch: { update: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const findFirst = jest.fn().mockResolvedValueOnce(prepared).mockResolvedValueOnce(applied);
    const prisma = {
      leaveExportBatch: { findFirst },
      $transaction: jest.fn().mockImplementation(
        async (callback: (transaction: unknown) => unknown) => callback(tx),
      ),
    };
    const client = {
      send: jest.fn().mockResolvedValue({
        status: 'applied',
        periodId: 'special-period-1',
        period: '2026-08',
        snapshotVersion: 1,
        processedEmployees: 1,
        processedLeaveEntries: 1,
      }),
    };

    const result = await snapshotService(prisma, client).deliver(user(), context, 'batch-1');

    expect(result.status).toBe('APPLIED');
    expect(client.send).toHaveBeenCalledWith(prepared.payload);
    expect(tx.leaveExportDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'APPLIED', httpStatus: 200 }),
    }));
    expect(tx.leaveExportBatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'APPLIED' }),
    }));
  });

  it('records a retryable upstream failure with a future retry time', async () => {
    const prepared = batch();
    const tx = {
      leaveExportDelivery: {
        create: jest.fn().mockResolvedValue({ id: 'delivery-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      leaveExportBatch: { update: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      leaveExportBatch: { findFirst: jest.fn().mockResolvedValue(prepared) },
      $transaction: jest.fn().mockImplementation(
        async (callback: (transaction: unknown) => unknown) => callback(tx),
      ),
    };
    const client = {
      send: jest.fn().mockRejectedValue(new SpecialLeaveSnapshotError('upstream unavailable', 503, true)),
    };

    await expect(snapshotService(prisma, client).deliver(user(), context, 'batch-1'))
      .rejects.toThrow(BadGatewayException);
    const failure = tx.leaveExportDelivery.update.mock.calls[0][0].data;
    expect(failure).toMatchObject({ status: 'FAILED', httpStatus: 503, retryable: true });
    expect(failure.nextAttemptAt).toBeInstanceOf(Date);
    expect(tx.leaveExportBatch.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'RETRYABLE_FAILURE' }),
    }));
  });
});
