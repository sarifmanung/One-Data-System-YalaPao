#!/usr/bin/env bash

set -euo pipefail
umask 077

base_url="${ONEDATA_EDGE_BASE_URL:-}"
base_url="${base_url%/}"
expected_origin="${ONEDATA_EDGE_EXPECTED_ORIGIN:-$base_url}"
require_https="${ONEDATA_EDGE_REQUIRE_HTTPS:-true}"
require_hsts="${ONEDATA_EDGE_REQUIRE_HSTS:-true}"
require_shared_rate_limit="${ONEDATA_EDGE_REQUIRE_SHARED_RATE_LIMIT:-true}"
rate_limit_header="${ONEDATA_EDGE_RATE_LIMIT_HEADER:-x-ratelimit-policy}"
expected_rate_limit_policy="${ONEDATA_EDGE_EXPECT_RATE_LIMIT_POLICY:-shared}"
probe_path="${ONEDATA_EDGE_RATE_LIMIT_PROBE_PATH:-}"
probe_count="${ONEDATA_EDGE_RATE_LIMIT_PROBE_COUNT:-0}"

fail() {
  echo "FAIL edge-observability: $1" >&2
  exit 1
}

[[ -n "$base_url" ]] || fail "ONEDATA_EDGE_BASE_URL is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v jq >/dev/null 2>&1 || fail "jq is required"

case "$require_https" in
  true|false) ;;
  *) fail "ONEDATA_EDGE_REQUIRE_HTTPS must be true or false" ;;
esac
case "$require_hsts" in
  true|false) ;;
  *) fail "ONEDATA_EDGE_REQUIRE_HSTS must be true or false" ;;
esac
case "$require_shared_rate_limit" in
  true|false) ;;
  *) fail "ONEDATA_EDGE_REQUIRE_SHARED_RATE_LIMIT must be true or false" ;;
esac
if [[ "$require_https" == "true" && "$base_url" != https://* ]]; then
  fail "ONEDATA_EDGE_BASE_URL must use HTTPS"
fi
if [[ "$expected_origin" != http://* && "$expected_origin" != https://* ]]; then
  fail "ONEDATA_EDGE_EXPECTED_ORIGIN must be an HTTP(S) origin"
fi
if [[ "$require_shared_rate_limit" == "true" && -z "$rate_limit_header" ]]; then
  fail "ONEDATA_EDGE_RATE_LIMIT_HEADER is required"
fi
if [[ -n "$probe_path" && "$probe_path" != /api/v1/auth/portal/exchange ]]; then
  fail "the optional rate-limit probe is restricted to the unauthenticated Portal exchange endpoint"
fi
if [[ "$probe_count" != "0" && ! "$probe_count" =~ ^[1-9][0-9]*$ ]]; then
  fail "ONEDATA_EDGE_RATE_LIMIT_PROBE_COUNT must be zero or a positive integer"
fi

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/onedata-edge-observability.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

header_value() {
  local header_file="$1"
  local name="$2"
  awk -v name="$name" 'BEGIN { IGNORECASE = 1 }
    index($0, ":") > 0 {
      key = $0; sub(/:.*/, "", key); gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
      if (tolower(key) == tolower(name)) { value = $0; sub(/^[^:]*:[[:space:]]*/, "", value); gsub(/[[:space:]]+$/, "", value); print value; exit }
    }' "$header_file"
}

request() {
  local name="$1"
  local path="$2"
  local body_file="$tmp_dir/$name.body"
  local headers_file="$tmp_dir/$name.headers"
  local status
  if status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -H "Origin: $expected_origin" -D "$headers_file" -o "$body_file" \
    -w '%{http_code}' "$base_url$path")"; then
    :
  else
    status="000"
  fi
  printf '%s' "$status" > "$tmp_dir/$name.status"
}

request live "/api/health/live"
[[ "$(<"$tmp_dir/live.status")" == "200" ]] || fail "public live endpoint did not return HTTP 200"

for header in \
  'x-request-id' \
  'x-content-type-options: nosniff' \
  'x-frame-options: DENY' \
  'referrer-policy: same-origin'; do
  if [[ "$header" == *:* ]]; then
    grep -Fqi "$header" "$tmp_dir/live.headers" || fail "public live response is missing $header"
  else
    [[ -n "$(header_value "$tmp_dir/live.headers" "$header")" ]] || fail "public live response is missing $header"
  fi
done
if [[ "$require_hsts" == "true" ]]; then
  hsts_value="$(header_value "$tmp_dir/live.headers" 'strict-transport-security')"
  [[ "$hsts_value" == *max-age=* && "$hsts_value" == *includeSubDomains* ]] || \
    fail "public live response is missing Strict-Transport-Security"
fi

allow_origin="$(header_value "$tmp_dir/live.headers" 'access-control-allow-origin')"
[[ "$allow_origin" == "$expected_origin" ]] || fail "public CORS origin does not match the expected web origin"
[[ "$(header_value "$tmp_dir/live.headers" 'access-control-allow-credentials')" == "true" ]] || \
  fail "public CORS credentials policy is not enabled"

if [[ "$require_shared_rate_limit" == "true" ]]; then
  [[ "$(header_value "$tmp_dir/live.headers" "$rate_limit_header")" == "$expected_rate_limit_policy" ]] || \
    fail "public response is missing the expected shared rate-limit policy marker"
fi

request metrics "/api/health/metrics"
[[ "$(<"$tmp_dir/metrics.status")" == "200" ]] || fail "public metrics endpoint did not return HTTP 200"
jq -e '
  (.data.service | type == "string") and
  (.data.startedAt | type == "string") and
  (.data.uptimeSeconds | type == "number") and
  (.data.requestsTotal | type == "number") and
  (.data.responsesByClass | type == "object")
' "$tmp_dir/metrics.body" >/dev/null 2>&1 || fail "metrics response shape is invalid"
if jq -e '
  any(.. | objects | keys[]?;
    . == "path" or . == "ip" or . == "identity" or . == "cookie" or
    . == "token" or . == "payload" or . == "password")
' "$tmp_dir/metrics.body" >/dev/null 2>&1; then
  fail "metrics response contains a forbidden raw request or identity field"
fi

if [[ -n "$probe_path" ]]; then
  [[ "$probe_count" != "0" ]] || fail "ONEDATA_EDGE_RATE_LIMIT_PROBE_COUNT is required when the probe path is set"
  got_rate_limit="false"
  for ((index = 1; index <= probe_count; index += 1)); do
    probe_headers="$tmp_dir/probe-$index.headers"
    probe_body="$tmp_dir/probe-$index.body"
    status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
      -X POST -H "Origin: $expected_origin" -H 'content-type: application/json' \
      --data '{}' -D "$probe_headers" -o "$probe_body" -w '%{http_code}' \
      "$base_url$probe_path" || true)"
    if [[ "$status" == "429" ]]; then
      got_rate_limit="true"
      [[ -n "$(header_value "$probe_headers" 'retry-after')" ]] || fail "429 response is missing Retry-After"
      break
    fi
  done
  [[ "$got_rate_limit" == "true" ]] || fail "the public rate-limit probe did not produce HTTP 429"
fi

echo "PASS edge-observability: public HTTPS, proxy headers, CORS, aggregate metrics and shared rate-limit policy checks passed"
if [[ -z "$probe_path" ]]; then
  echo "NOTE edge-observability: 429 probe was not run; set ONEDATA_EDGE_RATE_LIMIT_PROBE_COUNT with the dedicated staging test window to verify enforcement"
fi
