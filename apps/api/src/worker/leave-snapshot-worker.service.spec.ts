import { ConfigService } from '@nestjs/config';
import { LeaveSnapshotWorkerService } from './leave-snapshot-worker.service';
import type { LeaveSnapshotService } from '../integration/leave-snapshot.service';

const affiliation = {
  id: 'affiliation-1',
  code: 'AFFILIATION-1',
  name: 'หน่วยงานทดสอบ',
};

function lockedTransaction(acquired = 1) {
  return {
    $queryRaw: jest.fn()
      .mockResolvedValueOnce([{ acquired }])
      .mockResolvedValueOnce([{}]),
  };
}

function worker(
  prisma: Record<string, unknown>,
  snapshots: Record<string, unknown>,
  values: Record<string, string> = {},
) {
  return new LeaveSnapshotWorkerService(
    prisma as never,
    snapshots as unknown as LeaveSnapshotService,
    new ConfigService(values),
  );
}

describe('LeaveSnapshotWorkerService', () => {
  it('skips a run when another worker owns the database lock', async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => (
        callback(lockedTransaction(0))
      )),
    };

    const result = await worker(prisma, {}).runOnce();

    expect(result).toMatchObject({
      lockAcquired: false,
      retried: 0,
      monthlyPrepared: 0,
    });
  });

  it('retries due deliveries with an affiliation-scoped system identity', async () => {
    const prisma = {
      leaveExportBatch: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'batch-1',
          affiliationId: affiliation.id,
          deliveries: [{ nextAttemptAt: new Date(Date.now() - 1_000) }],
        }]),
      },
      affiliation: { findFirst: jest.fn().mockResolvedValue(affiliation) },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => (
        callback(lockedTransaction())
      )),
    };
    const snapshots = { deliver: jest.fn().mockResolvedValue({ status: 'APPLIED' }) };

    const result = await worker(prisma, snapshots, { ONEDATA_WORKER_MODE: 'RETRY' }).runOnce();

    expect(result).toMatchObject({ lockAcquired: true, retried: 1, retryFailures: 0 });
    expect(snapshots.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'onedata-worker',
        permissions: ['leave.snapshot.manage'],
        workspaces: [expect.objectContaining({ id: affiliation.id, kind: 'affiliation' })],
      }),
      expect.objectContaining({ workspace: expect.objectContaining({ id: affiliation.id }) }),
      'batch-1',
    );
  });

  it('prepares and delivers one monthly snapshot per active affiliation after cutoff', async () => {
    const prisma = {
      affiliation: { findMany: jest.fn().mockResolvedValue([affiliation]) },
      leaveExportBatch: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => (
        callback(lockedTransaction())
      )),
    };
    const snapshots = {
      prepare: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      deliver: jest.fn().mockResolvedValue({ status: 'APPLIED' }),
    };

    const result = await worker(prisma, snapshots, {
      ONEDATA_WORKER_MODE: 'MONTHLY',
      ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED: 'true',
      ONEDATA_LEAVE_SNAPSHOT_PERIOD: '2026-07',
      ONEDATA_LEAVE_SNAPSHOT_AFFILIATION_ID: affiliation.id,
      ONEDATA_LEAVE_SNAPSHOT_SOURCE_CUTOFF: '2026-08-03T23:59:59.999Z',
    }).runOnce();

    expect(result).toMatchObject({
      lockAcquired: true,
      monthlyPrepared: 1,
      monthlyDelivered: 1,
      monthlySkipped: 0,
    });
    expect(snapshots.prepare).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'onedata-worker' }),
      expect.objectContaining({ workspace: expect.objectContaining({ id: affiliation.id }) }),
      { period: '2026-07', sourceCutoff: '2026-08-03T23:59:59.999Z' },
    );
    expect(snapshots.deliver).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'batch-1',
    );
  });
});
