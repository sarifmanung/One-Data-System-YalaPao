import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { PortalLaunchClaims } from '../sso/portal-launch-token.service';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const claims: PortalLaunchClaims = {
    iss: 'yala-pao-health-portal',
    aud: 'one_data',
    sub: 'portal-user-1',
    jti: 'launch-1',
    iat: 1_000,
    exp: 1_120,
    name: 'Portal User',
    username: 'portal.user',
    roles: ['pcu_staff'],
  };

  function createFixture() {
    const authSession = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };
    const externalIdentityMapping = {
      findFirst: jest.fn().mockResolvedValue({
        employee: {
          id: 'employee-1',
          isActive: true,
          person: { prefix: 'นาย', firstName: 'ผู้ใช้', lastName: 'ระบบ' },
        },
        person: null,
      }),
    };
    const employmentMembership = {
      findMany: jest.fn().mockResolvedValue([
        {
          isPrimary: true,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          affiliation: { id: 'affiliation-1', code: 'AFF-1', name: 'อบจ.ทดสอบ' },
          tenant: { id: 'tenant-1', code: 'PCU-1', name: 'รพ.สต.ทดสอบ' },
        },
      ]),
    };
    const prisma = { authSession, externalIdentityMapping, employmentMembership } as never;
    const config = new ConfigService({
      NODE_ENV: 'development',
      ONEDATA_SESSION_TTL_SECONDS: '3600',
      ONEDATA_SESSION_COOKIE: 'onedata_session',
    });

    return {
      service: new AuthSessionService(prisma, config),
      authSession,
      externalIdentityMapping,
      employmentMembership,
    };
  }

  it('creates an opaque session from a mapped Portal identity', async () => {
    const fixture = createFixture();
    fixture.authSession.create.mockResolvedValue({});

    const session = await fixture.service.createFromPortalClaims(claims);

    expect(session.token).toEqual(expect.any(String));
    expect(session.token.length).toBeGreaterThan(32);
    expect(session.user).toMatchObject({
      id: 'portal-user-1',
      username: 'portal.user',
      displayName: 'Portal User',
      roles: ['pcu_staff'],
      permissions: expect.arrayContaining([
        'dashboard.view',
        'leave.request.create',
        'leave.request.submit',
      ]),
      employeeId: 'employee-1',
    });
    expect(session.user.workspaces.map((workspace) => workspace.kind)).toEqual([
      'tenant',
      'affiliation',
    ]);

    const persisted = fixture.authSession.create.mock.calls[0][0].data;
    expect(persisted.externalSubject).toBe('portal-user-1');
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.tokenHash).not.toBe(session.token);
    expect(persisted.roles).toEqual(['pcu_staff']);
    expect(persisted.permissions).toEqual(expect.arrayContaining([
      'dashboard.view',
      'leave.request.create',
      'leave.request.submit',
    ]));
  });

  it('resolves a cookie session and revokes it without exposing the raw token', async () => {
    const fixture = createFixture();
    const expiresAt = new Date(Date.now() + 3_600_000);
    fixture.authSession.findUnique.mockResolvedValue({
      id: 'session-1',
      externalSubject: 'portal-user-1',
      username: 'portal.user',
      displayName: 'Portal User',
      roles: ['pcu_staff'],
      permissions: ['dashboard.view', 'leave.request.read'],
      expiresAt,
      revokedAt: null,
    });
    fixture.authSession.update.mockResolvedValue({});
    fixture.authSession.updateMany.mockResolvedValue({ count: 1 });

    const request = {
      cookies: { onedata_session: 'raw-session-token' },
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const user = await fixture.service.userFromRequest(request);

    expect(user?.employeeId).toBe('employee-1');
    expect(fixture.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { lastSeenAt: expect.any(Date) },
    });

    await fixture.service.revokeFromRequest(request);
    const revokeCall = fixture.authSession.updateMany.mock.calls[0][0];
    expect(revokeCall.where).toMatchObject({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(revokeCall.where.tokenHash).not.toBe('raw-session-token');
    expect(revokeCall.data.revokedAt).toEqual(expect.any(Date));
  });

  it('does not create a session for an unmapped Portal account', async () => {
    const fixture = createFixture();
    fixture.externalIdentityMapping.findFirst.mockResolvedValue(null);

    await expect(fixture.service.createFromPortalClaims(claims))
      .rejects.toThrow('not mapped to an active employee');
    expect(fixture.authSession.create).not.toHaveBeenCalled();
  });
});
