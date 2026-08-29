import { ForbiddenException, Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const WINDOW_MS = 60_000;

function configuredOrigins(config: ConfigService): Set<string> {
  return new Set(
    (config.get<string>('CORS_ORIGIN', '') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function hasSessionCookie(request: Request, cookieName: string): boolean {
  const cookieHeader = request.get('cookie') ?? '';
  return cookieHeader.split(';').some((part) => part.trim().startsWith(`${cookieName}=`));
}

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(_request: Request, response: Response, next: NextFunction): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const environment = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'development');
    if (environment === 'staging' || environment === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  }
}

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(request.method)
      || this.config.get<string>('ONEDATA_CSRF_ENABLED', 'true') !== 'true'
      || !hasSessionCookie(request, this.config.get<string>('ONEDATA_SESSION_COOKIE', 'onedata_session'))) {
      next();
      return;
    }

    const allowed = configuredOrigins(this.config);
    const origin = request.get('origin');
    const referer = request.get('referer');
    let requestOrigin: string | null = origin ?? null;
    if (!requestOrigin && referer) {
      try {
        requestOrigin = new URL(referer).origin;
      } catch {
        requestOrigin = null;
      }
    }

    const production = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'development') === 'production';
    const requireOrigin = production || this.config.get<string>('ONEDATA_CSRF_REQUIRE_ORIGIN', 'false') === 'true';
    if (!requestOrigin && !requireOrigin) {
      next();
      return;
    }
    if (!requestOrigin || !allowed.has(requestOrigin)) {
      throw new ForbiddenException('The request origin is not allowed.');
    }
    next();
  }
}

type RateBucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly config: ConfigService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    if (this.config.get<string>('ONEDATA_RATE_LIMIT_ENABLED', 'true') !== 'true'
      || SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    const now = Date.now();
    const key = `${request.ip ?? 'unknown'}:${request.path}`;
    const existing = this.buckets.get(key);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : existing;
    const isAuthExchange = request.path.endsWith('/auth/portal/exchange');
    const configuredLimit = this.config.get<string>(
      isAuthExchange ? 'ONEDATA_AUTH_RATE_LIMIT_PER_MINUTE' : 'ONEDATA_MUTATION_RATE_LIMIT_PER_MINUTE',
      isAuthExchange ? '20' : '120',
    );
    const limit = Number(configuredLimit);
    bucket.count += 1;
    this.buckets.set(key, bucket);
    this.prune(now);

    if (bucket.count > (Number.isFinite(limit) && limit > 0 ? limit : 120)) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
      response
        .status(429)
        .setHeader('Retry-After', String(retryAfter))
        .json({
          type: '/problems/rate_limit_exceeded',
          title: 'TOO MANY REQUESTS',
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          detail: 'Too many requests. Try again later.',
          fields: [],
        });
      return;
    }

    next();
  }

  private prune(now: number): void {
    if (this.buckets.size <= 10_000) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
