import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  EMPLOYEE_IDENTITY_MAPPING_MANAGE,
} from '@onedata/contracts';
import type { CurrentUser, IdentityMappingSummary, PersonListItem } from '@onedata/contracts';
import { PrismaService } from '../database/prisma.service';
import { hasOneDataPermission } from '../platform/auth/permissions';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: CurrentUser): Promise<PersonListItem[]> {
    const tenantIds = user.workspaces
      .filter((workspace) => workspace.kind === 'tenant')
      .map((workspace) => workspace.id);
    const affiliationIds = user.workspaces
      .filter((workspace) => workspace.kind === 'affiliation')
      .map((workspace) => workspace.id);
    const scopeFilters: Prisma.EmploymentMembershipWhereInput[] = [];

    if (tenantIds.length > 0) {
      scopeFilters.push({ tenantId: { in: tenantIds } });
    }
    if (affiliationIds.length > 0) {
      scopeFilters.push({ affiliationId: { in: affiliationIds } });
    }
    if (scopeFilters.length === 0) {
      return [];
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        memberships: { some: { OR: scopeFilters } },
      },
      include: {
        person: true,
        memberships: {
          where: { OR: scopeFilters },
          include: { tenant: true },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
      orderBy: { person: { lastName: 'asc' } },
    });

    return employees.flatMap((employee) => {
      const membership = employee.memberships[0];
      if (!membership) {
        return [];
      }

      const displayName = [employee.person.prefix, employee.person.firstName, employee.person.lastName]
        .filter(Boolean)
        .join(' ');

      return [{
        id: employee.person.id,
        employeeId: employee.id,
        displayName,
        positionGroup: employee.positionGroup,
        positionName: employee.positionName,
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        isActive: employee.isActive,
      }];
    });
  }

  async mapPortalIdentity(
    user: CurrentUser,
    externalSubject: string,
    employeeId: string,
  ): Promise<IdentityMappingSummary> {
    if (!hasOneDataPermission(user, EMPLOYEE_IDENTITY_MAPPING_MANAGE)) {
      throw new ForbiddenException('The account cannot manage Portal identity mappings.');
    }

    const normalizedSubject = externalSubject.trim();
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, personId: true, isActive: true },
    });
    if (!employee || !employee.isActive) {
      throw new NotFoundException('The target employee is not active or does not exist.');
    }

    const existing = await this.prisma.externalIdentityMapping.findUnique({
      where: {
        externalSystem_externalSubject: {
          externalSystem: 'yala-pao-public-health-portal',
          externalSubject: normalizedSubject,
        },
      },
    });
    if (existing?.isActive && existing.employeeId && existing.employeeId !== employee.id) {
      throw new ConflictException('The Portal identity is already mapped to another employee.');
    }

    const mapping = await this.prisma.$transaction(async (tx) => {
      const result = await tx.externalIdentityMapping.upsert({
        where: {
          externalSystem_externalSubject: {
            externalSystem: 'yala-pao-public-health-portal',
            externalSubject: normalizedSubject,
          },
        },
        update: {
          personId: employee.personId,
          employeeId: employee.id,
          isActive: true,
        },
        create: {
          id: randomUUID(),
          externalSystem: 'yala-pao-public-health-portal',
          externalSubject: normalizedSubject,
          personId: employee.personId,
          employeeId: employee.id,
          isActive: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'PORTAL_IDENTITY_MAPPED',
          actorId: user.id,
          resourceType: 'ExternalIdentityMapping',
          resourceId: result.id,
          metadata: {
            externalSystem: result.externalSystem,
            externalSubject: result.externalSubject,
            employeeId: result.employeeId,
          },
        },
      });

      return result;
    });

    return {
      id: mapping.id,
      externalSystem: mapping.externalSystem,
      externalSubject: mapping.externalSubject,
      employeeId: mapping.employeeId!,
      personId: mapping.personId!,
      isActive: mapping.isActive,
    };
  }
}
