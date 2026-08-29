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

  it('rejects provisional leave rules in production', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES: 'true',
    })).toThrow('ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES must be false in production');
  });

  it('rejects malformed provisional leave rule configuration', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'test',
      ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES: 'yes',
    })).toThrow('ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES must be true or false');
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
