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
  DelegatedApproverCapability,
  DelegatedApproverSummary,
} from '@onedata/contracts';
import {
  AUTHORIZATION_DELEGATED_APPROVER_MANAGE,
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_VOID,
} from '@onedata/contracts';
import { PrismaService } from '../../database/prisma.service';
import { PORTAL_EXTERNAL_SYSTEM } from './auth-session.service';
import { hasOneDataPermission, scopeForPermission } from './permissions';
import type { CreateDelegatedApproverDto } from '../dto/create-delegated-approver.dto';

const DELEGATED_CAPABILITIES: readonly DelegatedApproverCapability[] = [
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_VOID,
];

function parseDateOnly(value: string, field: string): Date {
  const dateOnly = value.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateOnly) {
    throw new BadRequestException(`${field} must be a valid calendar date.`);
  }
  return parsed;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class DelegatedApproverService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser): Promise<DelegatedApproverSummary[]> {
    this.assertManagePermission(user);
    const where = await this.accessibleWhere(user);
    if (!where) {
      return [];
    }

    const assignments = await this.prisma.delegatedApproverAssignment.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { effectiveFrom: 'desc' }, { externalSubject: 'asc' }],
    });
    return assignments.map((assignment) => this.toSummary(assignment));
  }

  async create(user: CurrentUser, input: CreateDelegatedApproverDto): Promise<DelegatedApproverSummary> {
    this.assertManagePermission(user);
    const externalSubject = input.externalSubject.trim();
    if (!externalSubject) {
      throw new BadRequestException('externalSubject must not be blank.');
    }
    if (!DELEGATED_CAPABILITIES.includes(input.capability)) {
      throw new BadRequestException('The delegated capability is not supported.');
    }

    const effectiveFrom = parseDateOnly(input.effectiveFrom, 'effectiveFrom');
    const effectiveTo = input.effectiveTo ? parseDateOnly(input.effectiveTo, 'effectiveTo') : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must not be before effectiveFrom.');
    }
    if (input.workspaceKind === 'affiliation' && input.capability === LEAVE_REQUEST_VOID) {
      throw new BadRequestException('Void delegation must be scoped to a tenant.');
    }

    await this.assertWorkspaceAccess(user, input.workspaceKind, input.workspaceId);
    const mapping = await this.prisma.externalIdentityMapping.findFirst({
      where: {
        externalSystem: PORTAL_EXTERNAL_SYSTEM,
        externalSubject,
        isActive: true,
      },
      select: { id: true },
    });
    if (!mapping) {
      throw new BadRequestException('The Portal subject must be mapped to an active employee before delegation.');
    }

    const overlapping = await this.prisma.delegatedApproverAssignment.findFirst({
      where: {
        externalSystem: PORTAL_EXTERNAL_SYSTEM,
        externalSubject,
        capability: input.capability,
        workspaceKind: input.workspaceKind,
        workspaceId: input.workspaceId,
        isActive: true,
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31T00:00:00.000Z') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new ConflictException('An active delegated assignment overlaps this effective period.');
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delegatedApproverAssignment.create({
        data: {
          id: randomUUID(),
          externalSystem: PORTAL_EXTERNAL_SYSTEM,
          externalSubject,
          capability: input.capability,
          workspaceKind: input.workspaceKind,
          workspaceId: input.workspaceId,
          effectiveFrom,
          effectiveTo,
          isActive: true,
          reason: input.reason?.trim() || null,
          createdBy: user.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'DELEGATED_APPROVER_CREATED',
          actorId: user.id,
          resourceType: 'DelegatedApproverAssignment',
          resourceId: created.id,
          tenantId: input.workspaceKind === 'tenant' ? input.workspaceId : null,
          metadata: {
            externalSystem: PORTAL_EXTERNAL_SYSTEM,
            externalSubject,
            capability: input.capability,
            workspaceKind: input.workspaceKind,
            workspaceId: input.workspaceId,
            effectiveFrom: dateOnly(effectiveFrom),
            effectiveTo: effectiveTo ? dateOnly(effectiveTo) : null,
          },
        },
      });
      return created;
    });

    return this.toSummary(assignment);
  }

  async revoke(user: CurrentUser, id: string, reason: string): Promise<DelegatedApproverSummary> {
    this.assertManagePermission(user);
    const accessible = await this.accessibleWhere(user);
    const assignment = await this.prisma.delegatedApproverAssignment.findFirst({
      where: { AND: [{ id }, accessible ?? { id: '__not_accessible__' }] },
    });
    if (!assignment) {
      throw new NotFoundException('Delegated approver assignment not found.');
    }
    if (!assignment.isActive) {
      throw new ConflictException('The delegated approver assignment is already inactive.');
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.delegatedApproverAssignment.update({
        where: { id: assignment.id },
        data: { isActive: false },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'DELEGATED_APPROVER_REVOKED',
          actorId: user.id,
          resourceType: 'DelegatedApproverAssignment',
          resourceId: assignment.id,
          tenantId: assignment.workspaceKind === 'tenant' ? assignment.workspaceId : null,
          metadata: {
            reason: reason.trim(),
            capability: assignment.capability,
            workspaceKind: assignment.workspaceKind,
            workspaceId: assignment.workspaceId,
          },
        },
      });
      return updated;
    });

    return this.toSummary(revoked);
  }

  async assertCanAct(
    user: CurrentUser,
    capability: DelegatedApproverCapability,
    tenantId: string,
  ): Promise<void> {
    const directScope = scopeForPermission(user, capability);
    if (directScope === 'tenant' || directScope === 'affiliation') {
      return;
    }

    const today = new Date();
    const delegated = await this.prisma.delegatedApproverAssignment.findFirst({
      where: {
        externalSystem: PORTAL_EXTERNAL_SYSTEM,
        externalSubject: user.id,
        capability,
        workspaceKind: 'tenant',
        workspaceId: tenantId,
        isActive: true,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      select: { id: true },
    });
    if (!delegated) {
      throw new ForbiddenException('The account is not authorized for this paper leave operation in the selected tenant.');
    }
  }

  private async assertWorkspaceAccess(
    user: CurrentUser,
    workspaceKind: 'tenant' | 'affiliation',
    workspaceId: string,
  ): Promise<void> {
    const affiliationIds = user.workspaces.filter((workspace) => workspace.kind === 'affiliation').map((workspace) => workspace.id);
    const tenantIds = user.workspaces.filter((workspace) => workspace.kind === 'tenant').map((workspace) => workspace.id);

    if (workspaceKind === 'affiliation') {
      if (!affiliationIds.includes(workspaceId)) {
        throw new ForbiddenException('The account cannot manage delegation for this affiliation.');
      }
      return;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: workspaceId,
        status: 'ACTIVE',
        OR: [
          { id: { in: tenantIds } },
          ...(affiliationIds.length > 0 ? [{ affiliationId: { in: affiliationIds } }] : []),
        ],
      },
      select: { id: true },
    });
    if (!tenant) {
      throw new ForbiddenException('The account cannot manage delegation for this tenant.');
    }
  }

  private async accessibleWhere(user: CurrentUser): Promise<Prisma.DelegatedApproverAssignmentWhereInput | null> {
    const tenantIds = user.workspaces.filter((workspace) => workspace.kind === 'tenant').map((workspace) => workspace.id);
    const affiliationIds = user.workspaces.filter((workspace) => workspace.kind === 'affiliation').map((workspace) => workspace.id);
    const affiliationTenants = affiliationIds.length > 0
      ? await this.prisma.tenant.findMany({
        where: { affiliationId: { in: affiliationIds }, status: 'ACTIVE' },
        select: { id: true },
      })
      : [];
    const accessibleTenantIds = [...new Set([...tenantIds, ...affiliationTenants.map((tenant) => tenant.id)])];
    const scopes: Prisma.DelegatedApproverAssignmentWhereInput[] = [];
    if (accessibleTenantIds.length > 0) {
      scopes.push({ workspaceKind: 'tenant', workspaceId: { in: accessibleTenantIds } });
    }
    if (affiliationIds.length > 0) {
      scopes.push({ workspaceKind: 'affiliation', workspaceId: { in: affiliationIds } });
    }
    return scopes.length > 0 ? { OR: scopes } : null;
  }

  private assertManagePermission(user: CurrentUser): void {
    if (scopeForPermission(user, AUTHORIZATION_DELEGATED_APPROVER_MANAGE) !== 'affiliation') {
      throw new ForbiddenException('The account cannot manage delegated approvers.');
    }
  }

  private toSummary(assignment: {
    id: string;
    externalSystem: string;
    externalSubject: string;
    capability: string;
    workspaceKind: string;
    workspaceId: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    isActive: boolean;
    reason: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): DelegatedApproverSummary {
    if (assignment.workspaceKind !== 'tenant' && assignment.workspaceKind !== 'affiliation') {
      throw new ConflictException('Stored delegated assignment has an invalid workspace kind.');
    }
    if (!DELEGATED_CAPABILITIES.includes(assignment.capability as DelegatedApproverCapability)) {
      throw new ConflictException('Stored delegated assignment has an invalid capability.');
    }
    return {
      id: assignment.id,
      externalSystem: assignment.externalSystem,
      externalSubject: assignment.externalSubject,
      capability: assignment.capability as DelegatedApproverCapability,
      workspaceKind: assignment.workspaceKind,
      workspaceId: assignment.workspaceId,
      effectiveFrom: dateOnly(assignment.effectiveFrom),
      effectiveTo: assignment.effectiveTo ? dateOnly(assignment.effectiveTo) : null,
      isActive: assignment.isActive,
      reason: assignment.reason,
      createdBy: assignment.createdBy,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }
}
