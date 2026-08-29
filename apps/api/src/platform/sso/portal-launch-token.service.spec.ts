import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import {
  InMemoryReplayGuard,
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

  it('verifies the Portal HS256 contract and consumes jti once', () => {
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

    expect(service.verify(token)).toMatchObject({
      sub: 'portal-user-1',
      jti: 'launch-1',
    });
    expect(() => service.verify(token)).toThrow('already been used');
  });

  it('rejects a token with the wrong audience', () => {
    const service = createService();
    const token = tokenFor({
      iss: 'yala-pao-health-portal',
      aud: 'special_allowances',
      sub: 'portal-user-1',
      jti: 'launch-2',
      iat: now,
      exp: now + 120,
    }, secret);

    expect(() => service.verify(token)).toThrow('Invalid or expired');
  });
});
