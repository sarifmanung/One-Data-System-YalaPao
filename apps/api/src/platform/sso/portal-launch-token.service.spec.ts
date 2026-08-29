import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import {
  InMemoryReplayGuard,
  PrismaReplayGuard,
  PortalLaunchTokenService,
} from './portal-launch-token.service';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function tokenFor(payload: Record<string, unknown>, secret: string): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('PortalLaunchTokenService', () => {
  const secret = 'foundation-test-secret';
  const now = Math.floor(Date.now() / 1_000);

  function createService(): PortalLaunchTokenService {
    const config = new ConfigService({
      PORTAL_SHARED_SECRET: secret,
      PORTAL_TOKEN_ISSUER: 'yala-pao-health-portal',
      PORTAL_TOKEN_AUDIENCE: 'one_data',
    });
    return new PortalLaunchTokenService(config, new InMemoryReplayGuard());
  }

  it('verifies the Portal HS256 contract and consumes jti once', async () => {
    const service = createService();
    const token = tokenFor({
      iss: 'yala-pao-health-portal',
      aud: 'one_data',
      sub: 'portal-user-1',
      jti: 'launch-1',
      iat: now,
      exp: now + 120,
      name: 'Test User',
    }, secret);

    await expect(service.verify(token)).resolves.toMatchObject({
      sub: 'portal-user-1',
      jti: 'launch-1',
    });
    await expect(service.verify(token)).rejects.toThrow('already been used');
  });

  it('rejects a token with the wrong audience', async () => {
    const service = createService();
    const token = tokenFor({
      iss: 'yala-pao-health-portal',
      aud: 'special_allowances',
      sub: 'portal-user-1',
      jti: 'launch-2',
      iat: now,
      exp: now + 120,
    }, secret);

    await expect(service.verify(token)).rejects.toThrow('Invalid or expired');
  });
});

describe('PrismaReplayGuard', () => {
  it('uses the database unique key as an atomic cross-replica replay gate', async () => {
    const prisma = {
      portalLaunchReplay: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const guard = new PrismaReplayGuard(prisma as never);

    await expect(guard.consume('launch-1', Math.floor(Date.now() / 1_000) + 120))
      .resolves.toBe(true);
    expect(prisma.portalLaunchReplay.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ jti: 'launch-1' }),
    }));

    prisma.portalLaunchReplay.create.mockRejectedValue({ code: 'P2002' });
    await expect(guard.consume('launch-1', Math.floor(Date.now() / 1_000) + 120))
      .resolves.toBe(false);
  });
});
