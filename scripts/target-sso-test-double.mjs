import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

const secret = process.env.ONEDATA_SSO_TEST_SECRET?.trim();
const issuer = process.env.ONEDATA_SSO_TEST_ISSUER?.trim() || 'yala-pao-health-portal-staging';
const audience = process.env.ONEDATA_SSO_TEST_AUDIENCE?.trim() || 'one_data_staging';
const subject = process.env.ONEDATA_SSO_TEST_SUBJECT?.trim() || 'dev-user';
const port = Number(process.env.ONEDATA_SSO_TEST_DOUBLE_PORT || '3210');
const replayRunId = randomUUID();

if (!secret || secret.length < 32) {
  console.error('SSO test double requires ONEDATA_SSO_TEST_SECRET with at least 32 characters.');
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  console.error('SSO test double port must be between 1024 and 65535.');
  process.exit(1);
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(payload, signingSecret = secret) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = createHmac('sha256', signingSecret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function claimsFor(scenario) {
  const now = Math.floor(Date.now() / 1_000);
  const common = {
    iss: issuer,
    aud: audience,
    sub: subject,
    jti: `${scenario}-${randomUUID()}`,
    iat: now,
    exp: now + 120,
    name: 'SSO Test User',
    username: 'sso.test.user',
    roles: ['pcu_staff'],
  };

  switch (scenario) {
    case 'expired':
      return { ...common, jti: 'sso-double-expired', iat: now - 180, exp: now - 60 };
    case 'wrong-issuer':
      return { ...common, jti: 'sso-double-wrong-issuer', iss: `${issuer}.wrong` };
    case 'wrong-audience':
      return { ...common, jti: 'sso-double-wrong-audience', aud: `${audience}.wrong` };
    case 'future-issued':
      return { ...common, jti: 'sso-double-future-issued', iat: now + 120, exp: now + 240 };
    case 'replay':
      return { ...common, jti: `sso-double-replay-${replayRunId}` };
    case 'valid':
      return common;
    default:
      return null;
  }
}

function tokenFor(scenario) {
  if (scenario === 'invalid-signature') {
    return sign({ ...claimsFor('valid'), jti: 'sso-double-invalid-signature' }, `${secret}-wrong`);
  }
  const claims = claimsFor(scenario);
  if (!claims) {
    return null;
  }
  return sign(claims);
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (request.method !== 'GET' || url.pathname !== '/launch') {
    sendJson(response, 404, { error: 'not_found' });
    return;
  }

  const scenario = url.searchParams.get('scenario') || 'valid';
  const token = tokenFor(scenario);
  if (!token) {
    sendJson(response, 400, { error: 'unknown_scenario' });
    return;
  }
  sendJson(response, 200, { token });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SSO test double listening on 127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
