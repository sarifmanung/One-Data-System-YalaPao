import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { CurrentUser, MasterDataSyncReport } from '@onedata/contracts';
import { PrismaService } from '../database/prisma.service';
import {
  SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
  SpecialEmployee,
  SpecialMasterDataSnapshot,
  SpecialMasterDataClient,
} from './special-master-data.client';

const SYNC_ADMIN_ROLES = new Set([
  'DEVELOPMENT_ONLY',
  'PEOPLE_SYNC_ADMIN',
  'health_admin',
  'health_division_director',
]);

export function canManagePeopleMasterData(user: CurrentUser): boolean {
  return user.roles.some((role) => SYNC_ADMIN_ROLES.has(role));
}

interface SyncCounters {
  tenantsUpserted: number;
  employeesUpserted: number;
  employeesDeactivated: number;
  membershipsCreated: number;
  membershipsClosed: number;
}

function dateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function dayBefore(value: Date): Date {
  const result = dateOnly(value);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message.slice(0, 2_000);
  }
  return 'Master-data sync failed.';
}

@Injectable()
export class PeopleSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly special: SpecialMasterDataClient,
    private readonly config: ConfigService,
  ) {}

  async syncFromSpecial(user: CurrentUser): Promise<MasterDataSyncReport> {
    this.assertSyncPermission(user);

    const syncRunId = randomUUID();
    const startedAt = new Date();
    await this.prisma.masterDataSyncRun.create({
      data: {
        id: syncRunId,
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        status: 'RUNNING',
        initiatedBy: user.id,
        createdAt: startedAt,
      },
    });

    try {
      const snapshot = await this.special.fetchSnapshot();
      this.validateSnapshot(snapshot);
      const counters = await this.prisma.$transaction((tx) => this.applySnapshot(tx, snapshot));
      const completedAt = new Date();
      const report: MasterDataSyncReport = {
        syncRunId,
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        status: 'SUCCEEDED',
        sourceStartedAt: snapshot.sourceStartedAt.toISOString(),
        sourceCompletedAt: snapshot.sourceCompletedAt.toISOString(),
        healthCentersFetched: snapshot.healthCenters.length,
        employeesFetched: snapshot.employees.length,
        usersFetched: snapshot.users.length,
        usersWithEmployeeMapping: snapshot.users.filter((item) => item.employeeId !== null).length,
        usersWithoutEmployeeMapping: snapshot.users.filter((item) => item.employeeId === null).length,
        ...counters,
      };

      await this.prisma.masterDataSyncRun.update({
        where: { id: syncRunId },
        data: {
          status: report.status,
          sourceStartedAt: snapshot.sourceStartedAt,
          sourceCompletedAt: snapshot.sourceCompletedAt,
          healthCentersFetched: report.healthCentersFetched,
          employeesFetched: report.employeesFetched,
          usersFetched: report.usersFetched,
          usersWithEmployeeMapping: report.usersWithEmployeeMapping,
          tenantsUpserted: report.tenantsUpserted,
          employeesUpserted: report.employeesUpserted,
          employeesDeactivated: report.employeesDeactivated,
          membershipsCreated: report.membershipsCreated,
          membershipsClosed: report.membershipsClosed,
          completedAt,
        },
      });

      return report;
    } catch (error) {
      await this.prisma.masterDataSyncRun.update({
        where: { id: syncRunId },
        data: {
          status: 'FAILED',
          errorCode: error instanceof BadGatewayException ? 'SOURCE_ERROR' : 'SYNC_ERROR',
          errorMessage: errorMessage(error),
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async applySnapshot(
    tx: Prisma.TransactionClient,
    snapshot: SpecialMasterDataSnapshot,
  ): Promise<SyncCounters> {
    const affiliation = await this.ensureAffiliation(tx);
    const tenantIds = new Map<string, string>();
    let tenantsUpserted = 0;

    for (const healthCenter of snapshot.healthCenters) {
      const tenant = await this.upsertTenant(tx, affiliation.id, healthCenter);
      tenantIds.set(healthCenter.id, tenant.id);
      tenantsUpserted += 1;
    }

    const sourceTenants = await tx.tenant.findMany({
      where: { sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM },
      select: { id: true, sourceId: true, status: true },
    });
    const currentTenantSourceIds = new Set(snapshot.healthCenters.map((item) => item.id));
    for (const tenant of sourceTenants) {
      if (tenant.sourceId && !currentTenantSourceIds.has(tenant.sourceId) && tenant.status !== 'INACTIVE') {
        await tx.tenant.update({ where: { id: tenant.id }, data: { status: 'INACTIVE' } });
      }
    }

    const seenEmployeeSourceIds = new Set<string>();
    let employeesUpserted = 0;
    let employeesDeactivated = 0;
    let membershipsCreated = 0;
    let membershipsClosed = 0;

    for (const sourceEmployee of snapshot.employees) {
      seenEmployeeSourceIds.add(sourceEmployee.id);
      const tenantId = tenantIds.get(sourceEmployee.healthCenterId);
      if (!tenantId) {
        throw new BadGatewayException(`Special employee ${sourceEmployee.id} references an unknown health center.`);
      }

      const employeeResult = await this.upsertEmployee(tx, sourceEmployee);
      if (employeeResult.wasActive && !sourceEmployee.isActive) {
        employeesDeactivated += 1;
      }
      employeesUpserted += 1;
      const membershipResult = await this.syncMembership(
        tx,
        employeeResult.employee.id,
        tenantId,
        affiliation.id,
        sourceEmployee,
      );
      membershipsCreated += membershipResult.created;
      membershipsClosed += membershipResult.closed;
    }

    const existingEmployees = await tx.employee.findMany({
      where: { sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM },
      select: { id: true, sourceId: true, isActive: true },
    });
    for (const employee of existingEmployees) {
      if (employee.sourceId && !seenEmployeeSourceIds.has(employee.sourceId) && employee.isActive) {
        await tx.employee.update({ where: { id: employee.id }, data: { isActive: false } });
        employeesDeactivated += 1;
      }
    }

    return {
      tenantsUpserted,
      employeesUpserted,
      employeesDeactivated,
      membershipsCreated,
      membershipsClosed,
    };
  }

  private async ensureAffiliation(tx: Prisma.TransactionClient) {
    const sourceId = this.configValue('ONEDATA_AFFILIATION_SOURCE_ID', 'yala-pao');
    const configuredId = this.configValue('ONEDATA_AFFILIATION_ID', 'affiliation-yala-pao');
    const code = this.configValue('ONEDATA_AFFILIATION_CODE', 'YALA-PAO');
    const name = this.configValue('ONEDATA_AFFILIATION_NAME', 'องค์การบริหารส่วนจังหวัดยะลา');
    const sourceWhere = {
      sourceSystem_sourceId: {
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        sourceId,
      },
    } as const;

    const bySource = await tx.affiliation.findUnique({ where: sourceWhere });
    if (bySource) {
      return tx.affiliation.update({
        where: { id: bySource.id },
        data: { code, name, status: 'ACTIVE' },
      });
    }

    const byConfiguredId = await tx.affiliation.findUnique({ where: { id: configuredId } });
    if (byConfiguredId) {
      if (byConfiguredId.sourceSystem && byConfiguredId.sourceSystem !== SPECIAL_ALLOWANCES_SOURCE_SYSTEM) {
        throw new ConflictException('Configured affiliation id belongs to another source system.');
      }
      return tx.affiliation.update({
        where: { id: byConfiguredId.id },
        data: {
          code,
          name,
          status: 'ACTIVE',
          sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
          sourceId,
        },
      });
    }

    return tx.affiliation.create({
      data: {
        id: configuredId,
        code,
        name,
        status: 'ACTIVE',
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        sourceId,
      },
    });
  }

  private async upsertTenant(
    tx: Prisma.TransactionClient,
    affiliationId: string,
    healthCenter: SpecialMasterDataSnapshot['healthCenters'][number],
  ) {
    const sourceWhere = {
      sourceSystem_sourceId: {
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        sourceId: healthCenter.id,
      },
    } as const;
    const existing = await tx.tenant.findUnique({ where: sourceWhere });
    if (existing) {
      return tx.tenant.update({
        where: { id: existing.id },
        data: {
          affiliationId,
          code: healthCenter.areaKey,
          name: healthCenter.name,
          areaKey: healthCenter.areaKey,
          status: 'ACTIVE',
        },
      });
    }

    const existingByCode = await tx.tenant.findFirst({
      where: { affiliationId, code: healthCenter.areaKey },
    });
    if (existingByCode) {
      if (existingByCode.sourceSystem && existingByCode.sourceSystem !== SPECIAL_ALLOWANCES_SOURCE_SYSTEM) {
        throw new ConflictException(`Tenant code ${healthCenter.areaKey} belongs to another source system.`);
      }
      return tx.tenant.update({
        where: { id: existingByCode.id },
        data: {
          name: healthCenter.name,
          areaKey: healthCenter.areaKey,
          status: 'ACTIVE',
          sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
          sourceId: healthCenter.id,
        },
      });
    }

    return tx.tenant.create({
      data: {
        id: randomUUID(),
        affiliationId,
        code: healthCenter.areaKey,
        name: healthCenter.name,
        areaKey: healthCenter.areaKey,
        status: 'ACTIVE',
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        sourceId: healthCenter.id,
      },
    });
  }

  private async upsertEmployee(
    tx: Prisma.TransactionClient,
    sourceEmployee: SpecialEmployee,
  ): Promise<{ employee: Awaited<ReturnType<Prisma.TransactionClient['employee']['update']>>; wasActive: boolean }> {
    const sourceWhere = {
      sourceSystem_sourceId: {
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        sourceId: sourceEmployee.id,
      },
    } as const;
    const existing = await tx.employee.findUnique({ where: sourceWhere });

    if (existing) {
      await tx.person.update({
        where: { id: existing.personId },
        data: {
          firstName: sourceEmployee.firstName,
          lastName: sourceEmployee.lastName,
        },
      });
      return {
        employee: await tx.employee.update({
        where: { id: existing.id },
        data: {
          positionGroup: sourceEmployee.positionGroup,
          positionName: sourceEmployee.positionName,
          startDate: sourceEmployee.startDate,
          governmentServiceStartDate: sourceEmployee.governmentServiceStartDate,
          healthCenterStartDate: sourceEmployee.healthCenterStartDate,
          isActive: sourceEmployee.isActive,
          sourceUpdatedAt: sourceEmployee.updatedAt,
        },
        }),
        wasActive: existing.isActive,
      };
    }

    const person = await tx.person.create({
      data: {
        id: randomUUID(),
        firstName: sourceEmployee.firstName,
        lastName: sourceEmployee.lastName,
      },
    });
    return {
      employee: await tx.employee.create({
      data: {
        id: randomUUID(),
        personId: person.id,
        sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
        sourceId: sourceEmployee.id,
        positionGroup: sourceEmployee.positionGroup,
        positionName: sourceEmployee.positionName,
        startDate: sourceEmployee.startDate,
        governmentServiceStartDate: sourceEmployee.governmentServiceStartDate,
        healthCenterStartDate: sourceEmployee.healthCenterStartDate,
        isActive: sourceEmployee.isActive,
        sourceUpdatedAt: sourceEmployee.updatedAt,
      },
      }),
      wasActive: false,
    };
  }

  private async syncMembership(
    tx: Prisma.TransactionClient,
    employeeId: string,
    tenantId: string,
    affiliationId: string,
    sourceEmployee: SpecialEmployee,
  ): Promise<{ created: number; closed: number }> {
    const effectiveFrom = dateOnly(
      sourceEmployee.healthCenterStartDate
        ?? sourceEmployee.startDate
        ?? new Date(),
    );
    const openMemberships = await tx.employmentMembership.findMany({
      where: { employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: 'asc' },
    });
    const matching = openMemberships.find((membership) => membership.tenantId === tenantId);
    let closed = 0;

    if (matching) {
      for (const duplicate of openMemberships) {
        if (duplicate.id === matching.id) {
          continue;
        }
        const closeAt = dayBefore(effectiveFrom);
        if (closeAt < duplicate.effectiveFrom) {
          throw new ConflictException(`Employee ${sourceEmployee.id} has overlapping memberships.`);
        }
        await tx.employmentMembership.update({
          where: { id: duplicate.id },
          data: { effectiveTo: closeAt },
        });
        closed += 1;
      }
      await tx.employmentMembership.update({
        where: { id: matching.id },
        data: { affiliationId, isPrimary: true, membershipType: 'PRIMARY' },
      });
      return { created: 0, closed };
    }

    for (const current of openMemberships) {
      const closeAt = dayBefore(effectiveFrom);
      if (closeAt < current.effectiveFrom) {
        throw new ConflictException(`Employee ${sourceEmployee.id} has an invalid membership transfer date.`);
      }
      await tx.employmentMembership.update({
        where: { id: current.id },
        data: { effectiveTo: closeAt },
      });
      closed += 1;
    }

    await tx.employmentMembership.create({
      data: {
        id: randomUUID(),
        employeeId,
        affiliationId,
        tenantId,
        membershipType: 'PRIMARY',
        isPrimary: true,
        effectiveFrom,
      },
    });
    return { created: 1, closed };
  }

  private validateSnapshot(snapshot: SpecialMasterDataSnapshot): void {
    if (snapshot.healthCenters.length === 0) {
      throw new BadGatewayException('Special-Allowances returned no health centers; sync was refused.');
    }

    const healthCenterIds = new Set<string>();
    const areaKeys = new Set<string>();
    for (const healthCenter of snapshot.healthCenters) {
      this.assertSourceIdLength(healthCenter.id, 'health center');
      if (healthCenterIds.has(healthCenter.id)) {
        throw new BadGatewayException(`Special returned duplicate health center ${healthCenter.id}.`);
      }
      if (areaKeys.has(healthCenter.areaKey)) {
        throw new BadGatewayException(`Special returned duplicate health center area key ${healthCenter.areaKey}.`);
      }
      healthCenterIds.add(healthCenter.id);
      areaKeys.add(healthCenter.areaKey);
    }

    const employeeIds = new Set<string>();
    for (const employee of snapshot.employees) {
      this.assertSourceIdLength(employee.id, 'employee');
      if (employeeIds.has(employee.id)) {
        throw new BadGatewayException(`Special returned duplicate employee ${employee.id}.`);
      }
      if (!healthCenterIds.has(employee.healthCenterId)) {
        throw new BadGatewayException(`Special employee ${employee.id} references an unknown health center.`);
      }
      employeeIds.add(employee.id);
    }
  }

  private assertSourceIdLength(value: string, entity: string): void {
    if (value.length > 128) {
      throw new BadGatewayException(`Special ${entity} source id is too long.`);
    }
  }

  private assertSyncPermission(user: CurrentUser): void {
    if (!canManagePeopleMasterData(user)) {
      throw new ForbiddenException('The account cannot synchronize People master data.');
    }
  }

  private configValue(name: string, fallback: string): string {
    const value = this.config.get<string>(name)?.trim();
    return value || fallback;
  }
}
