import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CurrentUser, PersonListItem } from '@onedata/contracts';
import { PrismaService } from '../database/prisma.service';

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
}
