type Environment = Record<string, unknown>;

function value(config: Environment, key: string): string {
  return typeof config[key] === 'string' ? config[key].trim() : '';
}

function positiveInteger(config: Environment, key: string, fallback: number): number {
  const raw = value(config, key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}

/**
 * Keep local/test startup permissive, but fail before serving traffic when a
 * production deployment is missing a security boundary or uses an unsafe one.
 */
export function validateEnvironment(config: Environment): Environment {
  const environment = value(config, 'NODE_ENV') || 'development';
  positiveInteger(config, 'PORT', 3100);
  positiveInteger(config, 'ONEDATA_SESSION_TTL_SECONDS', 28_800);
  positiveInteger(config, 'ONEDATA_SESSION_IDLE_TIMEOUT_SECONDS', 1_800);
  positiveInteger(config, 'ONEDATA_AUTH_RATE_LIMIT_PER_MINUTE', 20);
  positiveInteger(config, 'ONEDATA_MUTATION_RATE_LIMIT_PER_MINUTE', 120);

  if (environment !== 'production') {
    return config;
  }

  const processRole = value(config, 'ONEDATA_PROCESS_ROLE') || 'api';
  if (!['api', 'worker'].includes(processRole)) {
    throw new Error('ONEDATA_PROCESS_ROLE must be api or worker.');
  }

  if (processRole === 'worker') {
    if (!value(config, 'DATABASE_URL')) {
      throw new Error('DATABASE_URL must be configured in production.');
    }
    if (value(config, 'ONEDATA_DEV_AUTH_ENABLED') === 'true') {
      throw new Error('ONEDATA_DEV_AUTH_ENABLED must be false in production.');
    }
    if (value(config, 'ONEDATA_WORKER_ENABLED') === 'true'
      && (!value(config, 'SPECIAL_ALLOWANCES_BASE_URL')
        || !value(config, 'SPECIAL_ALLOWANCES_INTEGRATION_TOKEN'))) {
      throw new Error('Special-Allowances URL/token must be configured for an enabled production worker.');
    }
    return config;
  }

  const required = [
    'DATABASE_URL',
    'PORTAL_SHARED_SECRET',
    'PORTAL_TOKEN_ISSUER',
    'PORTAL_TOKEN_AUDIENCE',
    'CORS_ORIGIN',
  ];
  for (const key of required) {
    if (!value(config, key)) {
      throw new Error(`${key} must be configured in production.`);
    }
  }

  if (value(config, 'PORTAL_SHARED_SECRET').length < 32) {
    throw new Error('PORTAL_SHARED_SECRET must contain at least 32 characters in production.');
  }
  if (value(config, 'CORS_ORIGIN').split(',').some((origin) => origin === '*')) {
    throw new Error('CORS_ORIGIN must not be wildcard in production.');
  }
  if (value(config, 'ONEDATA_DEV_AUTH_ENABLED') === 'true') {
    throw new Error('ONEDATA_DEV_AUTH_ENABLED must be false in production.');
  }
  if (value(config, 'ONEDATA_SESSION_COOKIE_SECURE') !== 'true') {
    throw new Error('ONEDATA_SESSION_COOKIE_SECURE must be true in production.');
  }

  const sameSite = value(config, 'ONEDATA_SESSION_COOKIE_SAME_SITE') || 'lax';
  if (!['strict', 'lax', 'none'].includes(sameSite)) {
    throw new Error('ONEDATA_SESSION_COOKIE_SAME_SITE must be strict, lax, or none.');
  }
  if (sameSite === 'none' && value(config, 'ONEDATA_SESSION_COOKIE_SECURE') !== 'true') {
    throw new Error('SameSite=None requires a secure session cookie.');
  }

  return config;
}
