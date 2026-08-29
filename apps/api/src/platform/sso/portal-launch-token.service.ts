import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';

export const PORTAL_REPLAY_GUARD = 'PORTAL_REPLAY_GUARD';

export interface PortalLaunchClaims {
  iss: string;
  aud: string;
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  name?: string;
  username?: string;
  organization?: unknown;
  profile_organization_text?: string;
  roles?: unknown;
  positions?: unknown;
  entitlements?: unknown;
  return_to?: string;
  [key: string]: unknown;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

@Injectable()
export class InMemoryReplayGuard {
  private readonly seen = new Map<string, number>();

  async consume(jti: string, exp: number): Promise<boolean> {
    const now = Math.floor(Date.now() / 1_000);
    for (const [key, expiry] of this.seen) {
      if (expiry <= now) {
        this.seen.delete(key);
      }
    }

    if (this.seen.has(jti)) {
      return false;
    }

    this.seen.set(jti, exp);
    return true;
  }
}

export interface ReplayGuard {
  consume(jti: string, exp: number): Promise<boolean>;
}

/**
 * The production provider. A unique database key makes jti consumption
 * atomic across API replicas; the in-memory guard remains useful only for
 * isolated unit tests that do not connect to a database.
 */
@Injectable()
export class PrismaReplayGuard implements ReplayGuard {
  constructor(private readonly prisma: PrismaService) {}

  async consume(jti: string, exp: number): Promise<boolean> {
    const now = new Date();
    await this.prisma.portalLaunchReplay.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    try {
      await this.prisma.portalLaunchReplay.create({
        data: {
          jti,
          expiresAt: new Date(exp * 1_000),
          consumedAt: now,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return false;
      }
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'P2002';
}

@Injectable()
export class PortalLaunchTokenService {
  constructor(
    private readonly config: ConfigService,
    @Inject(PORTAL_REPLAY_GUARD) private readonly replayGuard: ReplayGuard,
  ) {}

  async verify(token: string): Promise<PortalLaunchClaims> {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      throw new UnauthorizedException('Invalid portal launch token.');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = this.parseJson(encodedHeader);
    const payload = this.parseJson(encodedPayload);

    if (!isRecord(header) || header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedException('Invalid portal launch token.');
    }

    const secret = this.config.get<string>('PORTAL_SHARED_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Portal launch token verification is not configured.');
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const receivedSignature = decodeBase64Url(encodedSignature);

    if (
      expectedSignature.length !== receivedSignature.length
      || !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      throw new UnauthorizedException('Invalid portal launch token.');
    }

    if (!isRecord(payload)) {
      throw new UnauthorizedException('Invalid portal launch token.');
    }

    const issuer = this.config.get<string>('PORTAL_TOKEN_ISSUER', 'yala-pao-health-portal');
    const audience = this.config.get<string>('PORTAL_TOKEN_AUDIENCE', 'one_data');
    const now = Math.floor(Date.now() / 1_000);
    const clockSkew = this.config.get<number>('PORTAL_TOKEN_CLOCK_SKEW_SECONDS', 30);
    const issuedAt = asFiniteNumber(payload.iat);
    const expiresAt = asFiniteNumber(payload.exp);

    if (
      payload.iss !== issuer
      || payload.aud !== audience
      || typeof payload.sub !== 'string'
      || typeof payload.jti !== 'string'
      || issuedAt === null
      || expiresAt === null
      || expiresAt <= now - clockSkew
      || issuedAt > now + clockSkew
    ) {
      throw new UnauthorizedException('Invalid or expired portal launch token.');
    }

    if (!(await this.replayGuard.consume(payload.jti, expiresAt))) {
      throw new UnauthorizedException('Portal launch token has already been used.');
    }

    return payload as PortalLaunchClaims;
  }

  private parseJson(encodedValue: string): unknown {
    try {
      return JSON.parse(decodeBase64Url(encodedValue).toString('utf8')) as unknown;
    } catch {
      throw new UnauthorizedException('Invalid portal launch token.');
    }
  }
}
