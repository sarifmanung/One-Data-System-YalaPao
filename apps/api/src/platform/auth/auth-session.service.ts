import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import type { CurrentUser, WorkspaceSummary } from '@onedata/contracts';
import { PrismaService } from '../../database/prisma.service';
import type { PortalLaunchClaims } from '../sso/portal-launch-token.service';
import { permissionsFromPortalClaims } from './permissions';

export const PORTAL_EXTERNAL_SYSTEM = 'yala-pao-public-health-portal';
export const DEFAULT_SESSION_COOKIE = 'onedata_session';

interface SessionUserFields {
  externalSubject: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

export interface CreatedAuthSession {
  token: string;
  user: CurrentUser;
  expiresAt: Date;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => nonEmptyString(item))
    .filter((item): item is string => item !== null);
}

function nameFromPerson(person: { prefix: string | null; firstName: string; lastName: string }): string {
  return [person.prefix, person.firstName, person.lastName].filter(Boolean).join(' ');
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createFromPortalClaims(claims: PortalLaunchClaims): Promise<CreatedAuthSession> {
    const fields = this.sessionUserFieldsFromClaims(claims);
    const user = await this.buildCurrentUser(fields);
    const token = randomBytes(32).toString('base64url');
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.sessionTtlSeconds() * 1_000);

    await this.prisma.authSession.create({
      data: {
        id: randomUUID(),
        tokenHash: tokenHash(token),
        externalSystem: PORTAL_EXTERNAL_SYSTEM,
        externalSubject: fields.externalSubject,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        permissions: user.permissions,
        issuedAt,
        expiresAt,
        lastSeenAt: issuedAt,
      },
    });

    return { token, user, expiresAt };
  }

  async userFromRequest(request: Request): Promise<CurrentUser | null> {
    const token = this.tokenFromRequest(request);
    if (!token) {
      return null;
    }

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    const now = new Date();

    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
      return null;
    }

    if (session.lastSeenAt.getTime() + this.sessionIdleTimeoutSeconds() * 1_000 <= now.getTime()) {
      await this.prisma.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      return null;
    }

    try {
      const user = await this.buildCurrentUser({
        externalSubject: session.externalSubject,
        username: session.username,
        displayName: session.displayName,
        roles: stringArray(session.roles),
        permissions: stringArray(session.permissions),
      });

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });

      return user;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.prisma.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        });
        return null;
      }
      throw error;
    }
  }

  async revokeFromRequest(request: Request): Promise<void> {
    const token = this.tokenFromRequest(request);
    if (!token) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: { tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  setSessionCookie(response: Response, session: CreatedAuthSession): void {
    response.cookie(this.cookieName(), session.token, {
      ...this.cookieOptions(),
      maxAge: Math.max(0, session.expiresAt.getTime() - Date.now()),
    });
  }

  clearSessionCookie(response: Response): void {
    const options = this.cookieOptions();
    response.clearCookie(this.cookieName(), {
      path: options.path,
      domain: options.domain,
    });
  }

  private async buildCurrentUser(fields: SessionUserFields): Promise<CurrentUser> {
    const mapping = await this.prisma.externalIdentityMapping.findFirst({
      where: {
        externalSystem: PORTAL_EXTERNAL_SYSTEM,
        externalSubject: fields.externalSubject,
        isActive: true,
      },
      include: {
        employee: { include: { person: true } },
        person: { include: { employees: { include: { person: true } } } },
      },
    });

    const employee = mapping?.employee
      ?? mapping?.person?.employees.find((candidate) => candidate.isActive);
    if (!mapping || !employee) {
      throw new ForbiddenException('The Portal account is not mapped to an active employee.');
    }

    const today = new Date();
    const memberships = await this.prisma.employmentMembership.findMany({
      where: {
        employeeId: employee.id,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      include: { affiliation: true, tenant: true },
      orderBy: [{ isPrimary: 'desc' }, { effectiveFrom: 'desc' }],
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('The employee has no active workspace membership.');
    }

    const roles = fields.roles.length > 0 ? fields.roles : ['PORTAL_USER'];
    const workspaceRole = roles[0] ?? 'PORTAL_USER';
    const workspaces: WorkspaceSummary[] = [];
    const seen = new Set<string>();

    for (const membership of memberships) {
      const tenantKey = `tenant:${membership.tenant.id}`;
      if (!seen.has(tenantKey)) {
        seen.add(tenantKey);
        workspaces.push({
          id: membership.tenant.id,
          kind: 'tenant',
          code: membership.tenant.code,
          name: membership.tenant.name,
          role: workspaceRole,
        });
      }

      const affiliationKey = `affiliation:${membership.affiliation.id}`;
      if (!seen.has(affiliationKey)) {
        seen.add(affiliationKey);
        workspaces.push({
          id: membership.affiliation.id,
          kind: 'affiliation',
          code: membership.affiliation.code,
          name: membership.affiliation.name,
          role: workspaceRole,
        });
      }
    }

    const displayName = fields.displayName || nameFromPerson(employee.person);
    return {
      id: fields.externalSubject,
      username: fields.username || fields.externalSubject,
      displayName,
      roles,
      permissions: fields.permissions,
      workspaces,
      employeeId: employee.id,
    };
  }

  private sessionUserFieldsFromClaims(claims: PortalLaunchClaims): SessionUserFields {
    const roles = stringArray(claims.roles);
    const positions = stringArray(claims.positions);

    return {
      externalSubject: claims.sub,
      username: nonEmptyString(claims.username) ?? claims.sub,
      displayName: nonEmptyString(claims.name) ?? '',
      roles,
      permissions: permissionsFromPortalClaims({ roles, positions }),
    };
  }

  private tokenFromRequest(request: Request): string | null {
    const cookies = (request as Request & { cookies?: Record<string, unknown> }).cookies;
    const cookieValue = cookies?.[this.cookieName()];
    if (typeof cookieValue === 'string' && cookieValue.length > 0) {
      return cookieValue;
    }

    const authorization = request.get('authorization');
    if (!authorization) {
      return null;
    }

    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
    return match?.[1] ?? null;
  }

  private sessionTtlSeconds(): number {
    const configured = Number(this.config.get<string>('ONEDATA_SESSION_TTL_SECONDS', '28800'));
    if (!Number.isFinite(configured) || configured < 300) {
      return 28_800;
    }
    return Math.min(Math.floor(configured), 604_800);
  }

  private sessionIdleTimeoutSeconds(): number {
    const configured = Number(this.config.get<string>('ONEDATA_SESSION_IDLE_TIMEOUT_SECONDS', '1800'));
    if (!Number.isFinite(configured) || configured < 300) {
      return 1_800;
    }
    return Math.min(Math.floor(configured), 86_400);
  }

  private cookieName(): string {
    return this.config.get<string>('ONEDATA_SESSION_COOKIE', DEFAULT_SESSION_COOKIE);
  }

  private cookieOptions(): CookieOptions {
    const environment = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'development');
    const secureSetting = this.config.get<string>('ONEDATA_SESSION_COOKIE_SECURE');
    const secure = !secureSetting
      ? environment === 'production'
      : secureSetting === 'true';
    const sameSiteSetting = this.config.get<string>('ONEDATA_SESSION_COOKIE_SAME_SITE', 'lax');
    const sameSite = ['strict', 'lax', 'none'].includes(sameSiteSetting)
      ? sameSiteSetting as 'strict' | 'lax' | 'none'
      : 'lax';
    const domain = this.config.get<string>('ONEDATA_SESSION_COOKIE_DOMAIN');

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }
}
