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

function optionalBoolean(config: Environment, key: string): boolean | undefined {
  const raw = value(config, key);
  if (!raw) {
    return undefined;
  }
  if (raw !== 'true' && raw !== 'false') {
    throw new Error(`${key} must be true or false.`);
  }
  return raw === 'true';
}

/**
 * Keep local/test startup permissive, but fail before serving traffic when a
 * staging/production deployment is missing a security boundary or uses an
 * unsafe one.
 */
export function validateEnvironment(config: Environment): Environment {
  const environment = value(config, 'NODE_ENV') || 'development';
  positiveInteger(config, 'PORT', 3100);
  positiveInteger(config, 'ONEDATA_SESSION_TTL_SECONDS', 28_800);
  positiveInteger(config, 'ONEDATA_SESSION_IDLE_TIMEOUT_SECONDS', 1_800);
  positiveInteger(config, 'ONEDATA_AUTH_RETENTION_SECONDS', 30 * 24 * 60 * 60);
  positiveInteger(config, 'ONEDATA_AUTH_RATE_LIMIT_PER_MINUTE', 20);
  positiveInteger(config, 'ONEDATA_MUTATION_RATE_LIMIT_PER_MINUTE', 120);
  const provisionalRulesAllowed = optionalBoolean(config, 'ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES');

  const hardenedEnvironment = environment === 'staging' || environment === 'production';
  if (!hardenedEnvironment) {
    return config;
  }

  if (provisionalRulesAllowed === true) {
    throw new Error(`ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES must be false in ${environment}.`);
  }

  const processRole = value(config, 'ONEDATA_PROCESS_ROLE') || 'api';
  if (!['api', 'worker'].includes(processRole)) {
    throw new Error('ONEDATA_PROCESS_ROLE must be api or worker.');
  }

  if (processRole === 'worker') {
    if (!value(config, 'DATABASE_URL')) {
      throw new Error(`DATABASE_URL must be configured in ${environment}.`);
    }
    if (value(config, 'ONEDATA_DEV_AUTH_ENABLED') === 'true') {
      throw new Error(`ONEDATA_DEV_AUTH_ENABLED must be false in ${environment}.`);
    }
    if (value(config, 'ONEDATA_WORKER_ENABLED') === 'true'
      && (!value(config, 'SPECIAL_ALLOWANCES_BASE_URL')
        || !value(config, 'SPECIAL_ALLOWANCES_INTEGRATION_TOKEN'))) {
      throw new Error(`Special-Allowances URL/token must be configured for an enabled ${environment} worker.`);
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
      throw new Error(`${key} must be configured in ${environment}.`);
    }
  }

  if (value(config, 'PORTAL_SHARED_SECRET').length < 32) {
    throw new Error(`PORTAL_SHARED_SECRET must contain at least 32 characters in ${environment}.`);
  }
  if (value(config, 'CORS_ORIGIN').split(',').some((origin) => origin === '*')) {
    throw new Error(`CORS_ORIGIN must not be wildcard in ${environment}.`);
  }
  if (value(config, 'ONEDATA_DEV_AUTH_ENABLED') === 'true') {
    throw new Error(`ONEDATA_DEV_AUTH_ENABLED must be false in ${environment}.`);
  }
  const trustedProxy = value(config, 'ONEDATA_TRUST_PROXY');
  if (!trustedProxy) {
    throw new Error(`ONEDATA_TRUST_PROXY must be configured in ${environment}.`);
  }
  if (trustedProxy === 'true' || trustedProxy === '*' || /^\d+$/.test(trustedProxy)) {
    throw new Error(`ONEDATA_TRUST_PROXY must use explicit proxy IPs or CIDR ranges in ${environment}.`);
  }
  if (value(config, 'ONEDATA_SESSION_COOKIE_SECURE') !== 'true') {
    throw new Error(`ONEDATA_SESSION_COOKIE_SECURE must be true in ${environment}.`);
  }

  for (const key of [
    'ONEDATA_CSRF_ENABLED',
    'ONEDATA_CSRF_REQUIRE_ORIGIN',
    'ONEDATA_RATE_LIMIT_ENABLED',
    'ONEDATA_METRICS_ENABLED',
  ]) {
    if (value(config, key) !== 'true') {
      throw new Error(`${key} must be true in ${environment}.`);
    }
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
