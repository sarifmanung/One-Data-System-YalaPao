import type { CurrentUser } from '@onedata/contracts';
import { DelegatedApproverService } from './delegated-approver.service';

const admin: CurrentUser = {
  id: 'admin',
  username: 'admin',
  displayName: 'Admin',
  roles: ['PEOPLE_ADMIN'],
  permissions: ['authorization.delegated-approver.manage'],
  workspaces: [
    { id: 'affiliation-1', kind: 'affiliation', code: 'AFF-1', name: 'Affiliation', role: 'ADMIN' },
    { id: 'tenant-1', kind: 'tenant', code: 'TENANT-1', name: 'Tenant', role: 'ADMIN' },
  ],
};

describe('DelegatedApproverService', () => {
  function createFixture() {
    const created = {
      id: 'assignment-1',
      externalSystem: 'yala-pao-public-health-portal',
      externalSubject: 'portal-user-2',
      capability: 'leave.paper-decision.record',
      workspaceKind: 'tenant',
      workspaceId: 'tenant-1',
      effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
      effectiveTo: null,
      isActive: true,
      reason: 'แทนผู้รับผิดชอบเดิม',
      createdBy: 'admin',
      createdAt: new Date('2026-08-29T00:00:00.000Z'),
      updatedAt: new Date('2026-08-29T00:00:00.000Z'),
    };
    const transactionClient = {
      delegatedApproverAssignment: { create: jest.fn().mockResolvedValue(created) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      tenant: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
      externalIdentityMapping: { findFirst: jest.fn().mockResolvedValue({ id: 'mapping-1' }) },
      delegatedApproverAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(
        async (callback: (tx: unknown) => unknown) => callback(transactionClient),
      ),
    };
    return { service: new DelegatedApproverService(prisma as never), prisma, transactionClient, created };
  }

  it('creates an explicitly scoped, time-bounded delegated assignment with audit', async () => {
    const fixture = createFixture();
    const result = await fixture.service.create(admin, {
      externalSubject: ' portal-user-2 ',
      capability: 'leave.paper-decision.record',
      workspaceKind: 'tenant',
      workspaceId: 'tenant-1',
      effectiveFrom: '2026-09-01',
      reason: 'แทนผู้รับผิดชอบเดิม',
    });

    expect(result).toMatchObject({
      id: 'assignment-1',
      externalSubject: 'portal-user-2',
      workspaceKind: 'tenant',
      workspaceId: 'tenant-1',
    });
    expect(fixture.transactionClient.delegatedApproverAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        externalSubject: 'portal-user-2',
        capability: 'leave.paper-decision.record',
        workspaceId: 'tenant-1',
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
      }),
    });
    expect(fixture.transactionClient.auditEvent.create).toHaveBeenCalled();
  });

  it('allows a delegated actor only when an active assignment covers the tenant', async () => {
    const fixture = createFixture();
    fixture.prisma.delegatedApproverAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' });

    await expect(fixture.service.assertCanAct(
      {
        ...admin,
        id: 'portal-user-2',
        permissions: [],
        workspaces: [admin.workspaces[1]],
      },
      'leave.paper-decision.record',
      'tenant-1',
    )).resolves.toBeUndefined();
    expect(fixture.prisma.delegatedApproverAssignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        externalSubject: 'portal-user-2',
        workspaceId: 'tenant-1',
      }),
    }));
  });

  it('requires an existing active Portal identity mapping before delegation', async () => {
    const fixture = createFixture();
    fixture.prisma.externalIdentityMapping.findFirst.mockResolvedValue(null);

    await expect(fixture.service.create(admin, {
      externalSubject: 'unmapped-portal-user',
      capability: 'leave.paper-decision.record',
      workspaceKind: 'tenant',
      workspaceId: 'tenant-1',
      effectiveFrom: '2026-09-01',
    })).rejects.toThrow('must be mapped to an active employee');
    expect(fixture.prisma.$transaction).not.toHaveBeenCalled();
  });
});
