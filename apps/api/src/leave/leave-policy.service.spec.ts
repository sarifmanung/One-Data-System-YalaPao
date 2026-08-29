import { Prisma } from '@prisma/client';
import type { CurrentUser } from '@onedata/contracts';
import { LeavePolicyService } from './leave-policy.service';

const admin: CurrentUser = {
  id: 'hr-admin',
  username: 'hr-admin',
  displayName: 'HR Admin',
  roles: ['health_admin'],
  permissions: ['leave.policy.manage'],
  workspaces: [{
    id: 'affiliation-1',
    kind: 'affiliation',
    code: 'AFF-1',
    name: 'Affiliation',
    role: 'ADMIN',
  }],
};

function profile(status: 'DRAFT' | 'PUBLISHED' = 'DRAFT') {
  return {
    id: 'policy-1',
    affiliationId: 'affiliation-1',
    code: 'HR-2569-V1',
    name: 'Rulebook 2569',
    employeeTypeScope: 'CIVIL_SERVANT',
    legalBasis: 'ประกาศทดสอบ/2569',
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    status,
    approvedBy: status === 'PUBLISHED' ? 'hr-admin' : null,
    approvedAt: status === 'PUBLISHED' ? new Date('2026-08-29T00:00:00.000Z') : null,
    rules: [{
      id: 'rule-1',
      leaveTypeId: 'leave-type-annual',
      countingMode: 'WORKING_DAYS',
      halfDayAllowed: false,
      entitlementDays: new Prisma.Decimal('10.00'),
      entitlementPeriod: 'FISCAL_YEAR',
      carryOverAllowed: false,
      maxCarryOverDays: null,
      requiresSupportingDocument: false,
      leaveType: { code: 'ANNUAL', name: 'ลาพักผ่อน' },
    }],
  };
}

describe('LeavePolicyService', () => {
  it('creates a draft rulebook profile without making it effective', async () => {
    const created = profile();
    const tx = {
      leavePolicyProfile: { create: jest.fn().mockResolvedValue(created) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      leaveType: { findMany: jest.fn().mockResolvedValue([{ id: 'leave-type-annual' }]) },
      leavePolicyProfile: { findFirst: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    const service = new LeavePolicyService(prisma as never);

    const result = await service.createDraft(admin, {
      affiliationId: 'affiliation-1',
      code: ' HR-2569-V1 ',
      name: 'Rulebook 2569',
      employeeTypeScope: 'CIVIL_SERVANT',
      legalBasis: 'ประกาศทดสอบ/2569',
      effectiveFrom: '2026-01-01',
      rules: [{
        leaveTypeId: 'leave-type-annual',
        countingMode: 'WORKING_DAYS',
        halfDayAllowed: false,
        entitlementDays: 10,
        entitlementPeriod: 'FISCAL_YEAR',
        carryOverAllowed: false,
        requiresSupportingDocument: false,
      }],
    });

    expect(result).toMatchObject({ id: 'policy-1', status: 'DRAFT', rules: [{ entitlementDays: 10 }] });
    expect(tx.leavePolicyProfile.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'DRAFT', code: 'HR-2569-V1' }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('publishes only a complete draft with an approval reference and audit', async () => {
    const draft = profile();
    const published = profile('PUBLISHED');
    const tx = {
      leavePolicyProfile: { update: jest.fn().mockResolvedValue(published) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const findFirst = jest.fn()
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(null);
    const prisma = {
      leavePolicyProfile: { findFirst },
      $transaction: jest.fn().mockImplementation(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    const service = new LeavePolicyService(prisma as never);

    const result = await service.publish(admin, 'policy-1', 'HR-APPROVAL-001');

    expect(result.status).toBe('PUBLISHED');
    expect(tx.leavePolicyProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'policy-1' },
      data: expect.objectContaining({ status: 'PUBLISHED', approvedBy: 'hr-admin' }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LEAVE_POLICY_PUBLISHED' }),
    }));
  });
});
