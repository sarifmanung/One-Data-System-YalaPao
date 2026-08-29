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
  LeavePolicyProfileSummary,
  LeavePolicyRuleSummary,
} from '@onedata/contracts';
import { LEAVE_POLICY_MANAGE } from '@onedata/contracts';
import { PrismaService } from '../database/prisma.service';
import { scopeForPermission } from '../platform/auth/permissions';
import type { CreateLeavePolicyDto, CreateLeavePolicyRuleDto } from './dto/create-leave-policy.dto';

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

function decimal(value: number | undefined): Prisma.Decimal | null {
  return value === undefined ? null : new Prisma.Decimal(value.toFixed(2));
}

@Injectable()
export class LeavePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser): Promise<LeavePolicyProfileSummary[]> {
    this.assertManagePermission(user);
    const affiliationIds = this.affiliationIds(user);
    if (affiliationIds.length === 0) {
      return [];
    }

    const profiles = await this.prisma.leavePolicyProfile.findMany({
      where: { affiliationId: { in: affiliationIds } },
      include: { rules: { include: { leaveType: true }, orderBy: { leaveType: { code: 'asc' } } } },
      orderBy: [{ affiliationId: 'asc' }, { effectiveFrom: 'desc' }, { code: 'asc' }],
    });
    return profiles.map((profile) => this.toSummary(profile));
  }

  async createDraft(user: CurrentUser, input: CreateLeavePolicyDto): Promise<LeavePolicyProfileSummary> {
    this.assertManagePermission(user);
    this.assertAffiliationAccess(user, input.affiliationId);
    const effectiveFrom = parseDateOnly(input.effectiveFrom, 'effectiveFrom');
    const effectiveTo = input.effectiveTo ? parseDateOnly(input.effectiveTo, 'effectiveTo') : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must not be before effectiveFrom.');
    }
    this.assertUniqueLeaveTypes(input.rules);

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { id: { in: input.rules.map((rule) => rule.leaveTypeId) }, isActive: true },
      select: { id: true },
    });
    const leaveTypeIds = new Set(leaveTypes.map((leaveType) => leaveType.id));
    if (leaveTypeIds.size !== input.rules.length) {
      throw new BadRequestException('Every policy rule must reference a unique active leave type.');
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leavePolicyProfile.create({
        data: {
          id: randomUUID(),
          affiliationId: input.affiliationId,
          code: input.code.trim(),
          name: input.name.trim(),
          employeeTypeScope: input.employeeTypeScope.trim(),
          legalBasis: input.legalBasis?.trim() || null,
          effectiveFrom,
          effectiveTo,
          status: 'DRAFT',
          rules: {
            create: input.rules.map((rule) => this.ruleCreateData(rule)),
          },
        },
        include: { rules: { include: { leaveType: true } } },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_POLICY_DRAFT_CREATED',
          actorId: user.id,
          resourceType: 'LeavePolicyProfile',
          resourceId: created.id,
          tenantId: null,
          metadata: {
            affiliationId: input.affiliationId,
            code: input.code.trim(),
            employeeTypeScope: input.employeeTypeScope.trim(),
            effectiveFrom: dateOnly(effectiveFrom),
            effectiveTo: effectiveTo ? dateOnly(effectiveTo) : null,
            ruleCount: input.rules.length,
          },
        },
      });
      return created;
    });

    return this.toSummary(profile);
  }

  async publish(user: CurrentUser, id: string, approvalReference: string): Promise<LeavePolicyProfileSummary> {
    this.assertManagePermission(user);
    const profile = await this.prisma.leavePolicyProfile.findFirst({
      where: { id, affiliationId: { in: this.affiliationIds(user) } },
      include: { rules: { include: { leaveType: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Leave policy profile not found.');
    }
    if (profile.status !== 'DRAFT') {
      throw new ConflictException('Only a draft leave policy can be published.');
    }
    if (!profile.legalBasis?.trim()) {
      throw new BadRequestException('A legal basis is required before publishing a leave policy.');
    }
    if (profile.rules.length === 0) {
      throw new BadRequestException('A leave policy must contain at least one rule before publishing.');
    }

    const overlapping = await this.prisma.leavePolicyProfile.findFirst({
      where: {
        id: { not: profile.id },
        affiliationId: profile.affiliationId,
        employeeTypeScope: profile.employeeTypeScope,
        status: 'PUBLISHED',
        effectiveFrom: { lte: profile.effectiveTo ?? new Date('9999-12-31T00:00:00.000Z') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: profile.effectiveFrom } }],
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new ConflictException('The policy effective period overlaps another published policy.');
    }

    const published = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.leavePolicyProfile.update({
        where: { id: profile.id },
        data: { status: 'PUBLISHED', approvedBy: user.id, approvedAt: new Date() },
        include: { rules: { include: { leaveType: true } } },
      });
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          action: 'LEAVE_POLICY_PUBLISHED',
          actorId: user.id,
          resourceType: 'LeavePolicyProfile',
          resourceId: profile.id,
          tenantId: null,
          metadata: {
            approvalReference: approvalReference.trim(),
            affiliationId: profile.affiliationId,
            code: profile.code,
          },
        },
      });
      return updated;
    });

    return this.toSummary(published);
  }

  private ruleCreateData(rule: CreateLeavePolicyRuleDto) {
    return {
      id: randomUUID(),
      leaveTypeId: rule.leaveTypeId,
      countingMode: rule.countingMode,
      halfDayAllowed: rule.halfDayAllowed,
      entitlementDays: decimal(rule.entitlementDays),
      entitlementPeriod: rule.entitlementPeriod?.trim() || null,
      carryOverAllowed: rule.carryOverAllowed,
      maxCarryOverDays: decimal(rule.maxCarryOverDays),
      requiresSupportingDocument: rule.requiresSupportingDocument,
    };
  }

  private assertUniqueLeaveTypes(rules: CreateLeavePolicyRuleDto[]): void {
    if (new Set(rules.map((rule) => rule.leaveTypeId)).size !== rules.length) {
      throw new BadRequestException('A leave policy cannot contain duplicate leave type rules.');
    }
  }

  private assertManagePermission(user: CurrentUser): void {
    if (scopeForPermission(user, LEAVE_POLICY_MANAGE) !== 'affiliation') {
      throw new ForbiddenException('The account cannot manage leave policies.');
    }
  }

  private affiliationIds(user: CurrentUser): string[] {
    return user.workspaces.filter((workspace) => workspace.kind === 'affiliation').map((workspace) => workspace.id);
  }

  private assertAffiliationAccess(user: CurrentUser, affiliationId: string): void {
    if (!this.affiliationIds(user).includes(affiliationId)) {
      throw new ForbiddenException('The account cannot manage this affiliation leave policy.');
    }
  }

  private toSummary(profile: {
    id: string;
    affiliationId: string;
    code: string;
    name: string;
    employeeTypeScope: string;
    legalBasis: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    status: string;
    approvedBy: string | null;
    approvedAt: Date | null;
    rules: Array<{
      id: string;
      leaveTypeId: string;
      countingMode: string;
      halfDayAllowed: boolean;
      entitlementDays: Prisma.Decimal | null;
      entitlementPeriod: string | null;
      carryOverAllowed: boolean;
      maxCarryOverDays: Prisma.Decimal | null;
      requiresSupportingDocument: boolean;
      leaveType: { code: string; name: string };
    }>;
  }): LeavePolicyProfileSummary {
    if (profile.status !== 'DRAFT' && profile.status !== 'PUBLISHED' && profile.status !== 'RETIRED') {
      throw new ConflictException('Stored leave policy has an invalid status.');
    }
    return {
      id: profile.id,
      affiliationId: profile.affiliationId,
      code: profile.code,
      name: profile.name,
      employeeTypeScope: profile.employeeTypeScope,
      legalBasis: profile.legalBasis,
      effectiveFrom: dateOnly(profile.effectiveFrom),
      effectiveTo: profile.effectiveTo ? dateOnly(profile.effectiveTo) : null,
      status: profile.status,
      approvedBy: profile.approvedBy,
      approvedAt: profile.approvedAt?.toISOString() ?? null,
      rules: profile.rules.map((rule): LeavePolicyRuleSummary => {
        if (rule.countingMode !== 'WORKING_DAYS' && rule.countingMode !== 'CALENDAR_DAYS') {
          throw new ConflictException('Stored leave policy has an invalid counting mode.');
        }
        return {
          id: rule.id,
          leaveTypeId: rule.leaveTypeId,
          leaveTypeCode: rule.leaveType.code,
          leaveTypeName: rule.leaveType.name,
          countingMode: rule.countingMode,
          halfDayAllowed: rule.halfDayAllowed,
          entitlementDays: rule.entitlementDays?.toNumber() ?? null,
          entitlementPeriod: rule.entitlementPeriod,
          carryOverAllowed: rule.carryOverAllowed,
          maxCarryOverDays: rule.maxCarryOverDays?.toNumber() ?? null,
          requiresSupportingDocument: rule.requiresSupportingDocument,
        };
      }),
    };
  }
}
