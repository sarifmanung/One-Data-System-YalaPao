#!/usr/bin/env bash

set -euo pipefail
umask 077

base_url="${ONEDATA_UAT_BASE_URL:-http://localhost:3100}"
base_url="${base_url%/}"
web_url="${ONEDATA_UAT_WEB_URL:-}"
web_url="${web_url%/}"
expected_contract="${ONEDATA_UAT_EXPECTED_CONTRACT_VERSION:-1.4}"
expected_me_status="${ONEDATA_UAT_EXPECT_ME_STATUS:-401}"
require_security_headers="${ONEDATA_UAT_REQUIRE_SECURITY_HEADERS:-true}"
cookie_file="${ONEDATA_UAT_COOKIE_FILE:-}"
evidence_dir="${ONEDATA_UAT_EVIDENCE_DIR:-}"

if [[ -z "$evidence_dir" ]]; then
  echo "FAIL evidence: set ONEDATA_UAT_EVIDENCE_DIR to an explicit absolute directory" >&2
  exit 1
fi
if [[ "$evidence_dir" != /* || "$evidence_dir" == "/" ]]; then
  echo "FAIL evidence: ONEDATA_UAT_EVIDENCE_DIR must be an absolute non-root directory" >&2
  exit 1
fi
case "$expected_me_status" in
  200|401) ;;
  *) echo "FAIL evidence: ONEDATA_UAT_EXPECT_ME_STATUS must be 200 or 401" >&2; exit 1 ;;
esac
case "$require_security_headers" in
  true|false) ;;
  *) echo "FAIL evidence: ONEDATA_UAT_REQUIRE_SECURITY_HEADERS must be true or false" >&2; exit 1 ;;
esac

mkdir -p "$evidence_dir"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/onedata-uat-evidence.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

captured_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
artifact_stem="uat-evidence-$(date -u '+%Y%m%dT%H%M%SZ')-$$"
json_path="$evidence_dir/$artifact_stem.json"
markdown_path="$evidence_dir/$artifact_stem.md"
if [[ -e "$json_path" || -e "$markdown_path" ]]; then
  echo "FAIL evidence: refusing to overwrite an existing artifact" >&2
  exit 1
fi

probe() {
  local name="$1"
  local path="$2"
  local body_file="$tmp_dir/$name.json"
  local headers_file="$tmp_dir/$name.headers"
  local status

  if status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -D "$headers_file" -o "$body_file" -w '%{http_code}' "$base_url$path")"; then
    :
  else
    status="000"
  fi
  printf '%s' "$status" > "$tmp_dir/$name.status"
}

probe live "/api/health/live"
probe ready "/api/health/ready"
probe contract "/api/v1/system/contract"
probe metrics "/api/health/metrics"
probe me "/api/v1/me"

status_live="$(<"$tmp_dir/live.status")"
status_ready="$(<"$tmp_dir/ready.status")"
status_contract="$(<"$tmp_dir/contract.status")"
status_metrics="$(<"$tmp_dir/metrics.status")"
status_me="$(<"$tmp_dir/me.status")"

contract_version="$(jq -r '.data.contractVersion // empty' "$tmp_dir/contract.json" 2>/dev/null || true)"
if [[ "$status_contract" == "200" && "$contract_version" == "$expected_contract" ]]; then
  contract_check="PASS"
else
  contract_check="FAIL"
fi

if [[ "$status_metrics" == "200" ]] && jq -e \
  '(.data.service | type == "string") and
   (.data.startedAt | type == "string") and
   (.data.uptimeSeconds | type == "number") and
   (.data.requestsTotal | type == "number") and
   (.data.responsesByClass | type == "object")' \
  "$tmp_dir/metrics.json" >/dev/null 2>&1; then
  metrics_shape="PASS"
else
  metrics_shape="FAIL"
fi

security_headers="SKIPPED"
if [[ "$require_security_headers" == "true" ]]; then
  security_headers="PASS"
  for header in \
    'x-content-type-options: nosniff' \
    'x-frame-options: DENY' \
    'referrer-policy: same-origin'; do
    if ! grep -Fqi "$header" "$tmp_dir/live.headers"; then
      security_headers="FAIL"
    fi
  done
fi

web_status="SKIPPED"
if [[ -n "$web_url" ]]; then
  if web_status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -o "$tmp_dir/web.html" -w '%{http_code}' "$web_url/tenant-dashboard")"; then
    :
  else
    web_status="000"
  fi
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
smoke_log="$tmp_dir/uat-smoke.log"
smoke_exit=0
if env \
  ONEDATA_UAT_BASE_URL="$base_url" \
  ONEDATA_UAT_WEB_URL="$web_url" \
  ONEDATA_UAT_EXPECTED_CONTRACT_VERSION="$expected_contract" \
  ONEDATA_UAT_EXPECT_ME_STATUS="$expected_me_status" \
  ONEDATA_UAT_REQUIRE_SECURITY_HEADERS="$require_security_headers" \
  ONEDATA_UAT_COOKIE_FILE="$cookie_file" \
  "$script_dir/target-uat-smoke.sh" >"$smoke_log" 2>&1; then
  :
else
  smoke_exit=$?
fi

overall="PASS"
if [[ "$status_live" != "200" || "$status_ready" != "200" || \
  "$status_contract" != "200" || "$status_metrics" != "200" || \
  "$status_me" != "$expected_me_status" || "$contract_check" != "PASS" || \
  "$metrics_shape" != "PASS" || "$security_headers" == "FAIL" || \
  "$smoke_exit" != "0" ]]; then
  overall="FAIL"
fi
if [[ -n "$web_url" && "$web_status" != "200" ]]; then
  overall="FAIL"
fi

json_tmp="$(mktemp "$evidence_dir/.uat-evidence-json.XXXXXX")"
markdown_tmp="$(mktemp "$evidence_dir/.uat-evidence-markdown.XXXXXX")"

CAPTURED_AT="$captured_at" \
OVERALL="$overall" \
EXPECTED_CONTRACT="$expected_contract" \
ACTUAL_CONTRACT="$contract_version" \
EXPECTED_ME_STATUS="$expected_me_status" \
STATUS_LIVE="$status_live" \
STATUS_READY="$status_ready" \
STATUS_CONTRACT="$status_contract" \
STATUS_METRICS="$status_metrics" \
STATUS_ME="$status_me" \
CONTRACT_CHECK="$contract_check" \
METRICS_SHAPE="$metrics_shape" \
SECURITY_HEADERS="$security_headers" \
WEB_CONFIGURED="$([[ -n "$web_url" ]] && echo true || echo false)" \
WEB_STATUS="$web_status" \
SMOKE_EXIT="$smoke_exit" \
JSON_TMP="$json_tmp" \
MARKDOWN_TMP="$markdown_tmp" \
node <<'NODE'
const fs = require('node:fs');

const value = (name) => process.env[name];
const artifact = {
  schemaVersion: '1',
  capturedAt: value('CAPTURED_AT'),
  result: value('OVERALL'),
  checks: {
    live: { status: Number(value('STATUS_LIVE')) },
    ready: { status: Number(value('STATUS_READY')) },
    contract: {
      status: Number(value('STATUS_CONTRACT')),
      expectedVersion: value('EXPECTED_CONTRACT'),
      actualVersion: value('ACTUAL_CONTRACT') || null,
      result: value('CONTRACT_CHECK'),
    },
    metrics: { status: Number(value('STATUS_METRICS')), shape: value('METRICS_SHAPE') },
    authProbe: { expectedStatus: Number(value('EXPECTED_ME_STATUS')), actualStatus: Number(value('STATUS_ME')) },
    securityHeaders: { result: value('SECURITY_HEADERS') },
    web: { configured: value('WEB_CONFIGURED') === 'true', status: value('WEB_STATUS') === 'SKIPPED' ? null : Number(value('WEB_STATUS')) },
    smoke: { exitCode: Number(value('SMOKE_EXIT')) },
  },
  evidencePolicy: {
    aggregateOnly: true,
    rawPayloadStored: false,
    cookiesStored: false,
    tokensStored: false,
    personalDataStored: false,
  },
};
fs.writeFileSync(value('JSON_TMP'), `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });

const rows = [
  ['Live', value('STATUS_LIVE')],
  ['Ready', value('STATUS_READY')],
  ['Contract', `${value('CONTRACT_CHECK')} (HTTP ${value('STATUS_CONTRACT')})`],
  ['Metrics shape', `${value('METRICS_SHAPE')} (HTTP ${value('STATUS_METRICS')})`],
  ['Auth probe', `expected ${value('EXPECTED_ME_STATUS')}, got ${value('STATUS_ME')}`],
  ['Security headers', value('SECURITY_HEADERS')],
  ['Web tenant dashboard', value('WEB_CONFIGURED') === 'true' ? `HTTP ${value('WEB_STATUS')}` : 'not configured'],
  ['UAT smoke', `exit ${value('SMOKE_EXIT')}`],
];
const markdown = [
  '# One Data UAT Evidence',
  '',
  `- Captured at: ${value('CAPTURED_AT')}`,
  `- Result: **${value('OVERALL')}**`,
  '',
  '| Check | Result |',
  '| --- | --- |',
  ...rows.map(([name, result]) => `| ${name} | ${result} |`),
  '',
  '## Evidence policy',
  '',
  '- This artifact contains endpoint statuses and aggregate shape checks only.',
  '- It does not store response payloads, cookies, tokens, identities, IP addresses, or other personal data.',
  '- A local development auth override (`expected HTTP 200`) is not a production security pass.',
  '',
].join('\n');
fs.writeFileSync(value('MARKDOWN_TMP'), markdown, { mode: 0o600 });
NODE

mv -n "$json_tmp" "$json_path"
mv -n "$markdown_tmp" "$markdown_path"
if [[ ! -f "$json_path" || ! -f "$markdown_path" ]]; then
  echo "FAIL evidence: could not finalize artifact files" >&2
  exit 1
fi

echo "UAT evidence result: $overall"
echo "JSON artifact: $json_path"
echo "Markdown artifact: $markdown_path"
if [[ "$overall" != "PASS" ]]; then
  echo "UAT evidence checks failed; inspect the aggregate artifacts above" >&2
  exit 1
fi
