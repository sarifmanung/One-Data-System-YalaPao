import { PeopleService } from './people.service';
import { PORTAL_EXTERNAL_SYSTEM } from '../platform/auth/auth-session.service';
import { SPECIAL_ALLOWANCES_SOURCE_SYSTEM } from './special-master-data.client';

describe('PeopleService', () => {
  it('returns source-user and Portal mapping reconciliation without auto-matching identities', async () => {
    const prisma = {
      sourceUserProjection: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'projection-1',
            sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
            sourceId: 'special-user-1',
            username: 'staff',
            role: 'HEALTH_CENTER_USER',
            healthCenterSourceId: 'special-hc-1',
            sourceEmployeeId: null,
            isActive: true,
            lastSeenAt: new Date('2026-08-29T00:00:00.000Z'),
          },
        ]),
      },
      externalIdentityMapping: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'mapping-1',
            externalSystem: PORTAL_EXTERNAL_SYSTEM,
            externalSubject: 'portal-user-1',
            employeeId: 'employee-1',
            personId: 'person-1',
            isActive: true,
          },
        ]),
      },
    } as never;
    const service = new PeopleService(prisma);

    const report = await service.portalIdentityMappingReport({
      id: 'admin',
      username: 'admin',
      displayName: 'Admin',
      roles: ['PEOPLE_SYNC_ADMIN'],
      permissions: ['employee.identity-mapping.manage'],
      workspaces: [],
    });

    expect(report.summary).toEqual({
      sourceUsers: 1,
      activeSourceUsers: 1,
      sourceUsersWithEmployeeMapping: 0,
      sourceUsersWithoutEmployeeMapping: 1,
      portalMappings: 1,
      activePortalMappings: 1,
      portalMappingsWithoutEmployee: 0,
    });
    expect(report.sourceUsers[0]).toMatchObject({
      sourceId: 'special-user-1',
      username: 'staff',
      sourceEmployeeId: null,
    });
    expect(report.portalMappings[0]).toMatchObject({
      externalSubject: 'portal-user-1',
      employeeId: 'employee-1',
    });
  });

  it('refuses reconciliation inspection without mapping permission', async () => {
    const prisma = {
      sourceUserProjection: { findMany: jest.fn() },
      externalIdentityMapping: { findMany: jest.fn() },
    } as never;
    const service = new PeopleService(prisma);

    await expect(service.portalIdentityMappingReport({
      id: 'staff',
      username: 'staff',
      displayName: 'Staff',
      roles: ['pcu_staff'],
      permissions: ['employee.profile.read'],
      workspaces: [],
    })).rejects.toThrow('cannot inspect Portal identity mappings');
  });
});
