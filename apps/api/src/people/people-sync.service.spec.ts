import { ConfigService } from '@nestjs/config';
import { PeopleSyncService } from './people-sync.service';
import {
  SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
  SpecialMasterDataClient,
} from './special-master-data.client';

describe('PeopleSyncService', () => {
  function snapshot() {
    return {
      sourceStartedAt: new Date('2026-08-29T00:00:00.000Z'),
      sourceCompletedAt: new Date('2026-08-29T00:00:02.000Z'),
      healthCenters: [{ id: 'special-hc-1', name: 'รพ.สต.ทดสอบ', areaKey: 'YALA-HC-001' }],
      employees: [{
        id: 'special-employee-1',
        firstName: 'บุคลากร',
        lastName: 'ทดสอบ',
        positionGroup: 'PRACTITIONER_SUB_BACHELOR',
        effectivePositionGroup: null,
        positionName: 'เจ้าพนักงานสาธารณสุข',
        startDate: new Date('2020-01-01T00:00:00.000Z'),
        governmentServiceStartDate: new Date('2020-01-01T00:00:00.000Z'),
        healthCenterStartDate: new Date('2026-01-01T00:00:00.000Z'),
        healthCenterId: 'special-hc-1',
        isActive: true,
        updatedAt: new Date('2026-08-29T00:00:00.000Z'),
      }],
      users: [
        { id: 'special-user-1', username: 'staff', role: 'HEALTH_CENTER_USER', healthCenterId: 'special-hc-1', employeeId: null, isActive: true },
        { id: 'special-user-2', username: 'mapped', role: 'HEALTH_CENTER_USER', healthCenterId: 'special-hc-1', employeeId: 'special-employee-1', isActive: true },
      ],
    };
  }

  it('refuses synchronization for non-admin roles before contacting Special', async () => {
    const client = { fetchSnapshot: jest.fn() } as unknown as SpecialMasterDataClient;
    const prisma = { masterDataSyncRun: { create: jest.fn() } } as never;
    const service = new PeopleSyncService(prisma, client, new ConfigService());

    await expect(service.syncFromSpecial({
      id: 'staff',
      username: 'staff',
      displayName: 'Staff',
      roles: ['pcu_staff'],
      workspaces: [],
    })).rejects.toThrow('cannot synchronize');
    expect(client.fetchSnapshot).not.toHaveBeenCalled();
  });

  it('applies a validated snapshot transaction and reports unmapped users', async () => {
    const client = { fetchSnapshot: jest.fn().mockResolvedValue(snapshot()) } as unknown as SpecialMasterDataClient;
    const transactionClient = {
      affiliation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'affiliation-1', code: 'YALA-PAO', name: 'อบจ.ยะลา', status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'affiliation-1' }),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      employee: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'employee-1', personId: 'person-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      person: { create: jest.fn().mockResolvedValue({ id: 'person-1' }) },
      employmentMembership: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      },
    };
    const prisma = {
      masterDataSyncRun: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => callback(transactionClient)),
    } as never;
    const service = new PeopleSyncService(
      prisma,
      client,
      new ConfigService({
        ONEDATA_AFFILIATION_SOURCE_ID: 'yala-pao',
        ONEDATA_AFFILIATION_ID: 'affiliation-yala-pao',
        ONEDATA_AFFILIATION_CODE: 'YALA-PAO',
        ONEDATA_AFFILIATION_NAME: 'องค์การบริหารส่วนจังหวัดยะลา',
      }),
    );

    const report = await service.syncFromSpecial({
      id: 'admin',
      username: 'admin',
      displayName: 'Admin',
      roles: ['PEOPLE_SYNC_ADMIN'],
      workspaces: [],
    });

    expect(report).toMatchObject({
      sourceSystem: SPECIAL_ALLOWANCES_SOURCE_SYSTEM,
      status: 'SUCCEEDED',
      healthCentersFetched: 1,
      employeesFetched: 1,
      usersFetched: 2,
      usersWithEmployeeMapping: 1,
      usersWithoutEmployeeMapping: 1,
      tenantsUpserted: 1,
      employeesUpserted: 1,
      membershipsCreated: 1,
    });
    expect(transactionClient.person.create).toHaveBeenCalledTimes(1);
    expect(transactionClient.employee.create).toHaveBeenCalledTimes(1);
    expect(transactionClient.employmentMembership.create).toHaveBeenCalledTimes(1);

  });
});
