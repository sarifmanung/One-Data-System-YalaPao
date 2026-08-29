import { ConfigService } from '@nestjs/config';
import { AuthMaintenanceService } from './auth-maintenance.service';

describe('AuthMaintenanceService', () => {
  it('deletes expired sessions and replay entries while retaining recent revocations', async () => {
    const prisma = {
      authSession: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      portalLaunchReplay: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    const service = new AuthMaintenanceService(
      prisma as never,
      new ConfigService({ ONEDATA_AUTH_RETENTION_SECONDS: '3600' }),
    );
    const now = new Date('2026-08-29T12:00:00.000Z');

    await expect(service.cleanupExpired(now)).resolves.toEqual({
      authSessionsDeleted: 2,
      portalLaunchReplaysDeleted: 3,
    });
    expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { revokedAt: { lte: new Date('2026-08-29T11:00:00.000Z') } },
        ],
      },
    });
    expect(prisma.portalLaunchReplay.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: now } },
    });
  });
});
