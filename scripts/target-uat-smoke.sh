#!/usr/bin/env bash

set -euo pipefail

base_url="${ONEDATA_UAT_BASE_URL:-http://localhost:3100}"
base_url="${base_url%/}"
expected_contract="${ONEDATA_UAT_EXPECTED_CONTRACT_VERSION:-1.4}"
cookie_file="${ONEDATA_UAT_COOKIE_FILE:-}"
web_url="${ONEDATA_UAT_WEB_URL:-}"
require_security_headers="${ONEDATA_UAT_REQUIRE_SECURITY_HEADERS:-false}"
expected_me_status="${ONEDATA_UAT_EXPECT_ME_STATUS:-401}"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/onedata-uat-smoke.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

request_status() {
  local path="$1"
  local output_file="$2"
  curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -o "$output_file" -w '%{http_code}' "$base_url$path"
}

assert_status() {
  local name="$1"
  local path="$2"
  local expected="$3"
  local output_file="$tmp_dir/response-${name}.json"
  local status

  status="$(request_status "$path" "$output_file")"
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL $name: expected HTTP $expected, got $status" >&2
    exit 1
  fi
  echo "PASS $name (HTTP $status)"
}

assert_status "live" "/api/health/live" "200"
assert_status "ready" "/api/health/ready" "200"
assert_status "contract" "/api/v1/system/contract" "200"

CONTRACT_FILE="$tmp_dir/response-contract.json" EXPECTED_CONTRACT="$expected_contract" node <<'NODE'
const fs = require('node:fs');

const body = JSON.parse(fs.readFileSync(process.env.CONTRACT_FILE, 'utf8'));
const actual = body?.data?.contractVersion;
const expected = process.env.EXPECTED_CONTRACT;

if (actual !== expected) {
  console.error(`FAIL contract-version: expected ${expected}, got ${actual ?? 'missing'}`);
  process.exit(1);
}
console.log(`PASS contract-version (${actual})`);
NODE

unauthenticated_status="$(request_status "/api/v1/me" "$tmp_dir/response-unauthenticated.json")"
if [[ "$unauthenticated_status" != "$expected_me_status" ]]; then
  echo "FAIL auth-probe: expected HTTP $expected_me_status without a session, got $unauthenticated_status" >&2
  exit 1
fi
if [[ "$expected_me_status" == "401" ]]; then
  echo "PASS deny-by-default (HTTP 401)"
else
  echo "PASS auth-probe (HTTP $expected_me_status; explicit non-production override)"
fi

if [[ "$require_security_headers" == "true" ]]; then
  headers_file="$tmp_dir/live.headers"
  curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -D "$headers_file" -o /dev/null "$base_url/api/health/live"
  for header in \
    'x-content-type-options: nosniff' \
    'x-frame-options: DENY' \
    'referrer-policy: same-origin'; do
    if ! grep -Fqi "$header" "$headers_file"; then
      echo "FAIL security-header: missing $header" >&2
      exit 1
    fi
  done
  echo "PASS security-headers"
fi

if [[ -n "$cookie_file" ]]; then
  if [[ ! -r "$cookie_file" ]]; then
    echo "FAIL authenticated-probe: cookie file is not readable" >&2
    exit 1
  fi
  authenticated_status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -b "$cookie_file" -o "$tmp_dir/response-authenticated.json" -w '%{http_code}' \
    "$base_url/api/v1/me")"
  if [[ "$authenticated_status" != "200" ]]; then
    echo "FAIL authenticated-probe: expected HTTP 200, got $authenticated_status" >&2
    exit 1
  fi
  echo "PASS authenticated-probe (HTTP 200)"
fi

if [[ -n "$web_url" ]]; then
  web_url="${web_url%/}"
  web_status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -o "$tmp_dir/web.html" -w '%{http_code}' "$web_url/tenant-dashboard")"
  if [[ "$web_status" != "200" ]]; then
    echo "FAIL web: expected HTTP 200, got $web_status" >&2
    exit 1
  fi
  echo "PASS web (HTTP 200)"
fi

echo "UAT smoke checks passed for $base_url"
