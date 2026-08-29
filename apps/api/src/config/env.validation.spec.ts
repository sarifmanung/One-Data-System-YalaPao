import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('keeps local development permissive', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' })).toEqual({ NODE_ENV: 'test' });
  });

  it('fails closed for an incomplete production configuration', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' }))
      .toThrow('DATABASE_URL must be configured in production.');
  });

  it('rejects unsafe production cookie/auth settings', () => {
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://user:password@db/one_data',
      PORTAL_SHARED_SECRET: 'a'.repeat(32),
      PORTAL_TOKEN_ISSUER: 'portal',
      PORTAL_TOKEN_AUDIENCE: 'one_data',
      CORS_ORIGIN: 'https://onedata.example.org',
      ONEDATA_DEV_AUTH_ENABLED: 'false',
      ONEDATA_SESSION_COOKIE_SECURE: 'false',
      ONEDATA_SESSION_COOKIE_SAME_SITE: 'lax',
    };

    expect(() => validateEnvironment(base)).toThrow('ONEDATA_SESSION_COOKIE_SECURE must be true');
  });

  it('accepts a complete production configuration', () => {
    expect(validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://user:password@db/one_data',
      PORTAL_SHARED_SECRET: 'a'.repeat(32),
      PORTAL_TOKEN_ISSUER: 'portal',
      PORTAL_TOKEN_AUDIENCE: 'one_data',
      CORS_ORIGIN: 'https://onedata.example.org',
      ONEDATA_DEV_AUTH_ENABLED: 'false',
      ONEDATA_SESSION_COOKIE_SECURE: 'true',
      ONEDATA_SESSION_COOKIE_SAME_SITE: 'lax',
    })).toMatchObject({ NODE_ENV: 'production' });
  });

  it('allows a production worker to use only worker dependencies', () => {
    expect(validateEnvironment({
      NODE_ENV: 'production',
      ONEDATA_PROCESS_ROLE: 'worker',
      DATABASE_URL: 'mysql://user:password@db/one_data',
      ONEDATA_WORKER_ENABLED: 'false',
    })).toMatchObject({ ONEDATA_PROCESS_ROLE: 'worker' });
  });
});
