import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import {
  CsrfOriginMiddleware,
  RateLimitMiddleware,
  SecurityHeadersMiddleware,
} from './security.middleware';

function request(values: Record<string, string | undefined> = {}): Request {
  return {
    method: values.method ?? 'POST',
    path: values.path ?? '/api/v1/leave/requests',
    ip: values.ip ?? '127.0.0.1',
    get: jest.fn((name: string) => values[name.toLowerCase()]),
  } as unknown as Request;
}

function response(): Response & {
  headers: Record<string, string>;
  statusCode?: number;
  body?: unknown;
} {
  type TestResponse = {
    headers: Record<string, string>;
    statusCode?: number;
    body?: unknown;
    setHeader: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
  };
  const result: TestResponse = {
    headers: {} as Record<string, string>,
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  result.setHeader.mockImplementation((name: string, value: string) => {
    result.headers[name] = value;
    return result;
  });
  result.status.mockImplementation((statusCode: number) => {
    result.statusCode = statusCode;
    return result;
  });
  result.json.mockImplementation((body: unknown) => {
    result.body = body;
    return result;
  });
  return result as unknown as Response & {
    headers: Record<string, string>;
    statusCode?: number;
    body?: unknown;
  };
}

describe('HTTP security middleware', () => {
  it('sets baseline API security headers', () => {
    const output = response();
    const next = jest.fn() as NextFunction;

    new SecurityHeadersMiddleware(new ConfigService({ NODE_ENV: 'development' }))
      .use(request({ method: 'GET' }), output, next);

    expect(next).toHaveBeenCalled();
    expect(output.headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    });
  });

  it('rejects a cross-origin cookie mutation', () => {
    const middleware = new CsrfOriginMiddleware(new ConfigService({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://onedata.example.org',
      ONEDATA_SESSION_COOKIE: 'onedata_session',
    }));

    expect(() => middleware.use(
      request({
        origin: 'https://evil.example',
        cookie: 'onedata_session=session-token',
      }),
      response(),
      jest.fn(),
    )).toThrow('origin is not allowed');
  });

  it('accepts a same-origin cookie mutation and ignores bearer-only requests', () => {
    const middleware = new CsrfOriginMiddleware(new ConfigService({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://onedata.example.org',
      ONEDATA_SESSION_COOKIE: 'onedata_session',
    }));
    const next = jest.fn() as NextFunction;

    middleware.use(request({
      origin: 'https://onedata.example.org',
      cookie: 'onedata_session=session-token',
    }), response(), next);
    middleware.use(request({ authorization: 'Bearer service-token' }), response(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('returns 429 after the configured mutation limit', () => {
    const middleware = new RateLimitMiddleware(new ConfigService({
      ONEDATA_RATE_LIMIT_ENABLED: 'true',
      ONEDATA_MUTATION_RATE_LIMIT_PER_MINUTE: '1',
    }));
    const next = jest.fn() as NextFunction;
    const first = response();
    const second = response();

    middleware.use(request({}), first, next);
    middleware.use(request({}), second, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(second.statusCode).toBe(429);
    expect(second.body).toMatchObject({ code: 'RATE_LIMIT_EXCEEDED', status: 429 });
    expect(second.headers['Retry-After']).toEqual(expect.any(String));
  });
});
