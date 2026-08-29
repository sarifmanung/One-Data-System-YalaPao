import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  CurrentUser,
  LeaveRequestSummary,
  LeaveStatus,
  LeaveTypeSummary,
} from '@onedata/contracts';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedIdentity, TenantContext } from '../common/tenant/tenant-context';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { PaperResultDto } from './dto/paper-result.dto';
import { VoidLeaveDto } from './dto/void-leave.dto';

const PORTAL_SYSTEM = 'yala-pao-public-health-portal';

function parseDateOnly(value: string): Date {
  const dateOnly = value.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateOnly) {
    throw new BadRequestException('A valid calendar date is required.');
  }
  return parsed;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function asNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async listTypes(): Promise<LeaveTypeSummary[]> {
    const types = await this.prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return types.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      isActive: type.isActive,
    }));
  }

  async listRequests(user: CurrentUser): Promise<LeaveRequestSummary[]> {
    const where = this.scopeWhere(user);
    if (!where) {
      return [];
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { include: { person: true } },
        leaveType: true,
      },
      orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
    });

    return requests.map((request) => this.toSummary(request));
  }

  async createDraft(
    user: CurrentUser,
    context: TenantContext,
    input: CreateLeaveRequestDto,
  ): Promise<LeaveRequestSummary> {
    if (context.workspace.kind !== 'tenant') {
      throw new BadRequestException('A tenant workspace is required to create a leave request.');
    }

    const employeeId = await this.employeeIdForUser(user);
    if (!employeeId) {
      throw new ForbiddenException('The signed-in account is not mapped to an employee.');
    }

    const startsOn = parseDateOnly(input.startsOn);
    const endsOn = parseDateOnly(input.endsOn);
    if (endsOn < startsOn) {
      throw new BadRequestException('The leave end date must not be before the start date.');
    }

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: input.leaveTypeId, isActive: true },
    });
    if (!leaveType) {
      throw new BadRequestException('The selected leave type is not active.');
    }

    const membership = await this.prisma.employmentMembership.findFirst({
      where: {
        employeeId,
        tenantId: context.workspace.id,
        effectiveFrom: { lte: startsOn },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: startsOn } }],
      },
    });
    if (!membership) {
      throw new ForbiddenException('The employee is not assigned to the selected workspace.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          id: randomUUID(),
          tenantId: context.workspace.id,
          employeeId,
          leaveTypeId: leaveType.id,
          status: 'DRAFT',
          startsOn,
          endsOn,
          reason: input.reason ?? null,
          version: 1,
        },
      });

      await tx.leaveRequestRevision.create({
        data: {
          id: randomUUID(),
          leaveRequestId: request.id,
          revision: 1,
          status: request.status,
          payload: {
            leaveTypeId: leaveType.id,
            startsOn: input.startsOn.slice(0, 10),
            endsOn: input.endsOn.slice(0, 10),
            reason: input.reason ?? null,
          },
          createdBy: user.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_REQUEST_CREATED',
          actorId: user.id,
          resourceType: 'LeaveRequest',
          resourceId: request.id,
          tenantId: context.workspace.id,
          metadata: { status: request.status },
        },
      });

      return request;
    });

    return this.getSummaryForUser(created.id, user);
  }

  async submit(id: string, user: CurrentUser): Promise<LeaveRequestSummary> {
    const request = await this.getRequestForUser(id, user);
    await this.assertOwner(request.employeeId, user);
    if (request.status !== 'DRAFT') {
      throw new ConflictException('Only a draft leave request can be submitted.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: { id, status: 'DRAFT', version: request.version },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('The leave request changed before it could be submitted.');
      }

      await tx.leaveRequestRevision.create({
        data: {
          id: randomUUID(),
          leaveRequestId: id,
          revision: request.version + 1,
          status: 'SUBMITTED',
          payload: { submittedFrom: 'DRAFT' },
          createdBy: user.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_REQUEST_SUBMITTED',
          actorId: user.id,
          resourceType: 'LeaveRequest',
          resourceId: id,
          tenantId: request.tenantId,
          metadata: { from: 'DRAFT', to: 'SUBMITTED' },
        },
      });
    });

    return this.getSummaryForUser(id, user);
  }

  async recordPaperResult(
    id: string,
    user: CurrentUser,
    input: PaperResultDto,
  ): Promise<LeaveRequestSummary> {
    const request = await this.getRequestForUser(id, user);
    if (request.status !== 'SUBMITTED') {
      throw new ConflictException('Only a submitted leave request can receive a paper result.');
    }
    if (!user.roles.includes('PAPER_RESULT_RECORDER') && !user.roles.includes('DEVELOPMENT_ONLY')) {
      throw new ForbiddenException('The account cannot record a paper leave result.');
    }

    const actorEmployeeId = await this.employeeIdForUser(user);
    if (actorEmployeeId && actorEmployeeId === request.employeeId) {
      throw new ForbiddenException('The requester cannot record the paper result of their own leave.');
    }
    if (input.result === 'PAPER_APPROVED' && (!input.approvedDays || input.approvedDays <= 0)) {
      throw new BadRequestException('Approved leave days are required for a paper approval.');
    }

    const approvedDays = input.result === 'PAPER_APPROVED' ? input.approvedDays! : null;
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: { id, status: 'SUBMITTED', version: request.version },
        data: {
          status: input.result,
          approvedDays,
          effectiveAt: input.result === 'PAPER_APPROVED' ? new Date() : null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('The leave request changed before the paper result was recorded.');
      }

      await tx.leavePaperResult.create({
        data: {
          id: randomUUID(),
          leaveRequestId: id,
          result: input.result,
          approvedDays,
          documentNumber: input.documentNumber ?? null,
          documentDate: input.documentDate ? parseDateOnly(input.documentDate) : null,
          reason: input.reason ?? null,
          recordedBy: user.id,
        },
      });
      await tx.leaveRequestRevision.create({
        data: {
          id: randomUUID(),
          leaveRequestId: id,
          revision: request.version + 1,
          status: input.result,
          payload: {
            result: input.result,
            approvedDays,
            documentNumber: input.documentNumber ?? null,
            documentDate: input.documentDate?.slice(0, 10) ?? null,
            reason: input.reason ?? null,
          },
          createdBy: user.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_PAPER_RESULT_RECORDED',
          actorId: user.id,
          resourceType: 'LeaveRequest',
          resourceId: id,
          tenantId: request.tenantId,
          metadata: { status: input.result, approvedDays },
        },
      });
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventType: 'LeavePaperResultRecorded',
          aggregateType: 'LeaveRequest',
          aggregateId: id,
          leaveRequestId: id,
          payload: {
            leaveRequestId: id,
            status: input.result,
            approvedDays,
            tenantId: request.tenantId,
          },
        },
      });
    });

    return this.getSummaryForUser(id, user);
  }

  async cancel(id: string, user: CurrentUser): Promise<LeaveRequestSummary> {
    const request = await this.getRequestForUser(id, user);
    await this.assertOwner(request.employeeId, user);
    if (request.status !== 'DRAFT' && request.status !== 'SUBMITTED') {
      throw new ConflictException('Only a draft or submitted leave request can be cancelled.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: { id, status: request.status, version: request.version },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new ConflictException('The leave request changed before it could be cancelled.');
      }
      await tx.leaveRequestRevision.create({
        data: {
          id: randomUUID(),
          leaveRequestId: id,
          revision: request.version + 1,
          status: 'CANCELLED',
          payload: { cancelledFrom: request.status },
          createdBy: user.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_REQUEST_CANCELLED',
          actorId: user.id,
          resourceType: 'LeaveRequest',
          resourceId: id,
          tenantId: request.tenantId,
          metadata: { from: request.status, to: 'CANCELLED' },
        },
      });
    });

    return this.getSummaryForUser(id, user);
  }

  async void(id: string, user: CurrentUser, input: VoidLeaveDto): Promise<LeaveRequestSummary> {
    const request = await this.getRequestForUser(id, user);
    if (request.status !== 'PAPER_APPROVED') {
      throw new ConflictException('Only an effective paper-approved leave can be voided.');
    }
    if (!user.roles.includes('PAPER_RESULT_RECORDER') && !user.roles.includes('DEVELOPMENT_ONLY')) {
      throw new ForbiddenException('The account cannot void an effective leave request.');
    }

    const actorEmployeeId = await this.employeeIdForUser(user);
    if (actorEmployeeId && actorEmployeeId === request.employeeId) {
      throw new ForbiddenException('The requester cannot void their own effective leave.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.updateMany({
        where: { id, status: 'PAPER_APPROVED', version: request.version },
        data: { status: 'VOIDED', voidedAt: new Date(), version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new ConflictException('The leave request changed before it could be voided.');
      }
      await tx.leaveRequestRevision.create({
        data: {
          id: randomUUID(),
          leaveRequestId: id,
          revision: request.version + 1,
          status: 'VOIDED',
          payload: { voidedFrom: 'PAPER_APPROVED', reason: input.reason },
          createdBy: user.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_REQUEST_VOIDED',
          actorId: user.id,
          resourceType: 'LeaveRequest',
          resourceId: id,
          tenantId: request.tenantId,
          metadata: { reason: input.reason },
        },
      });
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          eventType: 'LeaveVoided',
          aggregateType: 'LeaveRequest',
          aggregateId: id,
          leaveRequestId: id,
          payload: { leaveRequestId: id, status: 'VOIDED', tenantId: request.tenantId },
        },
      });
    });

    return this.getSummaryForUser(id, user);
  }

  private scopeWhere(user: CurrentUser): Prisma.LeaveRequestWhereInput | null {
    const tenantIds = user.workspaces
      .filter((workspace) => workspace.kind === 'tenant')
      .map((workspace) => workspace.id);
    const affiliationIds = user.workspaces
      .filter((workspace) => workspace.kind === 'affiliation')
      .map((workspace) => workspace.id);
    const scopes: Prisma.LeaveRequestWhereInput[] = [];

    if (tenantIds.length > 0) {
      scopes.push({ tenantId: { in: tenantIds } });
    }
    if (affiliationIds.length > 0) {
      scopes.push({ tenant: { affiliationId: { in: affiliationIds } } });
    }

    return scopes.length > 0 ? { OR: scopes } : null;
  }

  private async getRequestForUser(id: string, user: CurrentUser) {
    const scope = this.scopeWhere(user);
    if (!scope) {
      throw new NotFoundException('Leave request not found.');
    }

    const request = await this.prisma.leaveRequest.findFirst({
      where: { AND: [{ id }, scope] },
      include: { employee: { include: { person: true } }, leaveType: true },
    });
    if (!request) {
      throw new NotFoundException('Leave request not found.');
    }
    return request;
  }

  private async getSummaryForUser(id: string, user: CurrentUser): Promise<LeaveRequestSummary> {
    return this.toSummary(await this.getRequestForUser(id, user));
  }

  private async employeeIdForUser(user: CurrentUser): Promise<string | null> {
    if (user.employeeId) {
      return user.employeeId;
    }

    const mapping = await this.prisma.externalIdentityMapping.findFirst({
      where: {
        externalSystem: PORTAL_SYSTEM,
        externalSubject: user.id,
        isActive: true,
      },
      select: { employeeId: true },
    });
    return mapping?.employeeId ?? null;
  }

  private async assertOwner(employeeId: string, user: CurrentUser): Promise<void> {
    const actorEmployeeId = await this.employeeIdForUser(user);
    if (!actorEmployeeId || actorEmployeeId !== employeeId) {
      throw new ForbiddenException('Only the mapped employee can change this draft.');
    }
  }

  private toSummary(request: {
    id: string;
    tenantId: string;
    employeeId: string;
    status: string;
    startsOn: Date;
    endsOn: Date;
    requestedDays: Prisma.Decimal | null;
    approvedDays: Prisma.Decimal | null;
    reason: string | null;
    version: number;
    employee: { person: { prefix: string | null; firstName: string; lastName: string } };
    leaveType: { id: string; code: string; name: string; isActive: boolean };
  }): LeaveRequestSummary {
    const employeeDisplayName = [
      request.employee.person.prefix,
      request.employee.person.firstName,
      request.employee.person.lastName,
    ].filter(Boolean).join(' ');

    return {
      id: request.id,
      tenantId: request.tenantId,
      employeeId: request.employeeId,
      employeeDisplayName,
      leaveType: {
        id: request.leaveType.id,
        code: request.leaveType.code,
        name: request.leaveType.name,
        isActive: request.leaveType.isActive,
      },
      status: request.status as LeaveStatus,
      startsOn: dateOnly(request.startsOn),
      endsOn: dateOnly(request.endsOn),
      requestedDays: asNumber(request.requestedDays),
      approvedDays: asNumber(request.approvedDays),
      reason: request.reason,
      version: request.version,
    };
  }
}
