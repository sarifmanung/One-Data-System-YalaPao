import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CurrentUser } from '@onedata/contracts';
import { LeaveService } from './leave.service';
import type { LeaveRulesService } from './leave-rules.service';

function leaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leave-request-1',
    tenantId: 'tenant-1',
    employeeId: 'employee-requester',
    status: 'SUBMITTED',
    startsOn: new Date('2026-09-01T00:00:00.000Z'),
    endsOn: new Date('2026-09-04T00:00:00.000Z'),
    requestedDays: new Prisma.Decimal('4.00'),
    calculationBasis: 'PROVISIONAL_RULEBOOK_V1:WORKING_DAYS',
    approvedDays: null,
    reason: 'synthetic test',
    version: 1,
    employee: {
      person: { prefix: null, firstName: 'ผู้ยื่น', lastName: 'ทดสอบ' },
    },
    leaveType: {
      id: 'leave-type-annual',
      code: 'ANNUAL',
      name: 'ลาพักผ่อน',
      isActive: true,
    },
    ...overrides,
  };
}

function user(employeeId: string, permissions = ['leave.paper-decision.record']): CurrentUser {
  return {
    id: 'portal-user',
    username: 'test-user',
    displayName: 'ผู้ทดสอบ',
    roles: ['PAPER_RESULT_RECORDER'],
    permissions,
    employeeId,
    workspaces: [{
      id: 'tenant-1',
      kind: 'tenant',
      code: 'TEST-TENANT',
      name: 'หน่วยงานทดสอบ',
      role: 'PAPER_RESULT_RECORDER',
    }],
  };
}

function serviceWith(prisma: Record<string, unknown>): LeaveService {
  return new LeaveService(prisma as never, {} as LeaveRulesService);
}

describe('LeaveService paper-result workflow', () => {
  it('rejects a requester attempting to record their own paper result', async () => {
    const request = leaveRequest();
    const prisma = {
      leaveRequest: { findFirst: jest.fn().mockResolvedValue(request) },
      $transaction: jest.fn(),
    };

    await expect(serviceWith(prisma).recordPaperResult(
      'leave-request-1',
      user('employee-requester'),
      { result: 'PAPER_APPROVED', approvedDays: 4 },
    )).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a paper approval greater than the server-calculated request', async () => {
    const prisma = {
      leaveRequest: { findFirst: jest.fn().mockResolvedValue(leaveRequest()) },
      $transaction: jest.fn(),
    };

    await expect(serviceWith(prisma).recordPaperResult(
      'leave-request-1',
      user('employee-verifier'),
      { result: 'PAPER_APPROVED', approvedDays: 5 },
    )).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records a verified paper approval and emits a durable integration event atomically', async () => {
    const updatedRequest = leaveRequest({
      status: 'PAPER_APPROVED',
      approvedDays: new Prisma.Decimal('4.00'),
      version: 2,
    });
    const findFirst = jest.fn()
      .mockResolvedValueOnce(leaveRequest())
      .mockResolvedValueOnce(updatedRequest);
    const transactionClient = {
      leaveRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      leavePaperResult: { create: jest.fn().mockResolvedValue({}) },
      leaveRequestRevision: { create: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      leaveRequest: { findFirst },
      $transaction: jest.fn().mockImplementation(
        async (callback: (transaction: unknown) => unknown) => callback(transactionClient),
      ),
    };

    const result = await serviceWith(prisma).recordPaperResult(
      'leave-request-1',
      user('employee-verifier'),
      {
        result: 'PAPER_APPROVED',
        approvedDays: 4,
        documentNumber: 'DOC-001',
        documentDate: '2026-09-01',
      },
    );

    expect(result).toMatchObject({ status: 'PAPER_APPROVED', approvedDays: 4 });
    expect(transactionClient.leaveRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'leave-request-1', status: 'SUBMITTED', version: 1 },
    }));
    expect(transactionClient.leavePaperResult.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        result: 'PAPER_APPROVED',
        approvedDays: 4,
        documentNumber: 'DOC-001',
      }),
    }));
    expect(transactionClient.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: 'LeavePaperResultRecorded' }),
    }));
  });
});
