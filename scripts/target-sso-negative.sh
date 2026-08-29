#!/usr/bin/env bash

set -euo pipefail
umask 077

base_url="${ONEDATA_SSO_BASE_URL:-http://localhost:3100}"
base_url="${base_url%/}"
test_secret="${ONEDATA_SSO_TEST_SECRET:-}"
test_issuer="${ONEDATA_SSO_TEST_ISSUER:-yala-pao-health-portal-staging}"
test_audience="${ONEDATA_SSO_TEST_AUDIENCE:-one_data_staging}"
test_subject="${ONEDATA_SSO_TEST_SUBJECT:-dev-user}"
double_port="${ONEDATA_SSO_TEST_DOUBLE_PORT:-3210}"
cookie_name="${ONEDATA_SSO_COOKIE_NAME:-onedata_session}"
origin="${ONEDATA_SSO_ORIGIN:-http://localhost:3101}"
expect_secure_cookie="${ONEDATA_SSO_EXPECT_SECURE_COOKIE:-false}"
expect_logout_me_status="${ONEDATA_SSO_EXPECT_LOGOUT_ME_STATUS:-401}"

fail() {
  echo "FAIL sso-negative: $1" >&2
  exit 1
}

[[ -n "$test_secret" && ${#test_secret} -ge 32 ]] || \
  fail "set ONEDATA_SSO_TEST_SECRET with at least 32 characters"
case "$expect_secure_cookie" in
  true|false) ;;
  *) fail "ONEDATA_SSO_EXPECT_SECURE_COOKIE must be true or false" ;;
esac
case "$expect_logout_me_status" in
  200|401) ;;
  *) fail "ONEDATA_SSO_EXPECT_LOGOUT_ME_STATUS must be 200 or 401" ;;
esac
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v jq >/dev/null 2>&1 || fail "jq is required"
command -v node >/dev/null 2>&1 || fail "node is required"

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/onedata-sso-negative.XXXXXX")"
double_pid=""
cleanup() {
  if [[ -n "$double_pid" ]]; then
    kill "$double_pid" >/dev/null 2>&1 || true
    wait "$double_pid" >/dev/null 2>&1 || true
  fi
  rm -rf "$tmp_dir"
}
trap cleanup EXIT INT TERM

ONEDATA_SSO_TEST_SECRET="$test_secret" \
ONEDATA_SSO_TEST_ISSUER="$test_issuer" \
ONEDATA_SSO_TEST_AUDIENCE="$test_audience" \
ONEDATA_SSO_TEST_SUBJECT="$test_subject" \
ONEDATA_SSO_TEST_DOUBLE_PORT="$double_port" \
node "$script_dir/target-sso-test-double.mjs" >"$tmp_dir/test-double.log" 2>&1 &
double_pid=$!

double_ready=false
for _ in {1..50}; do
  if curl --silent --show-error --connect-timeout 1 --max-time 2 \
    "http://127.0.0.1:$double_port/health" >/dev/null 2>&1; then
    double_ready=true
    break
  fi
  sleep 0.1
done
[[ "$double_ready" == "true" ]] || fail "SSO test double did not become ready"
echo "PASS sso-test-double"

token_for() {
  local scenario="$1"
  local response_file="$tmp_dir/token-$scenario.json"
  local token

  curl --silent --show-error --connect-timeout 5 --max-time 10 \
    -o "$response_file" "http://127.0.0.1:$double_port/launch?scenario=$scenario" || \
    fail "could not obtain $scenario token from test double"
  token="$(jq -r '.token // empty' "$response_file")"
  [[ -n "$token" ]] || fail "test double returned no $scenario token"
  printf '%s' "$token"
}

post_token() {
  local label="$1"
  local token="$2"
  local cookie_jar="$3"
  local request_file="$tmp_dir/request-$label.json"
  local body_file="$tmp_dir/exchange-$label.json"
  local headers_file="$tmp_dir/exchange-$label.headers"
  local status

  jq -n --arg token "$token" '{ token: $token }' >"$request_file"
  if status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -D "$headers_file" -o "$body_file" -c "$cookie_jar" \
    -H 'content-type: application/json' --data-binary @"$request_file" \
    -w '%{http_code}' "$base_url/api/v1/auth/portal/exchange")"; then
    :
  else
    status="000"
  fi
  printf '%s' "$status"
}

probe_me() {
  local cookie_jar="$1"
  local output_file="$2"
  curl --silent --show-error --connect-timeout 5 --max-time 15 \
    -b "$cookie_jar" -o "$output_file" -w '%{http_code}' "$base_url/api/v1/me"
}

post_with_cookie() {
  local path="$1"
  local input_cookie_jar="$2"
  local output_cookie_jar="$3"
  local label="$4"
  local body_file="$tmp_dir/$label.json"
  local headers_file="$tmp_dir/$label.headers"
  local status
  local -a curl_args=(
    --silent --show-error --connect-timeout 5 --max-time 15
    -X POST -b "$input_cookie_jar" -c "$output_cookie_jar"
    -D "$headers_file" -o "$body_file" -w '%{http_code}'
  )
  if [[ -n "$origin" ]]; then
    curl_args+=(-H "Origin: $origin")
  fi
  curl_args+=("$base_url$path")
  if status="$(curl "${curl_args[@]}")"; then
    :
  else
    status="000"
  fi
  printf '%s' "$status"
}

valid_token="$(token_for valid)"
valid_cookie="$tmp_dir/valid.cookies"
valid_status="$(post_token valid "$valid_token" "$valid_cookie")"
[[ "$valid_status" == "200" ]] || fail "valid exchange returned HTTP $valid_status"
jq -e '.data.authenticated == true' "$tmp_dir/exchange-valid.json" >/dev/null || \
  fail "valid exchange did not return authenticated=true"
if grep -Fq "$valid_token" "$tmp_dir/exchange-valid.json"; then
  fail "valid exchange response echoed the launch token"
fi
if ! grep -Fqi "$cookie_name=" "$tmp_dir/exchange-valid.headers"; then
  fail "valid exchange did not set the session cookie"
fi
if [[ "$expect_secure_cookie" == "true" ]] && ! grep -Fqi '; secure' "$tmp_dir/exchange-valid.headers"; then
  fail "session cookie is not marked Secure"
fi
echo "PASS valid-exchange (HTTP 200)"

me_status="$(probe_me "$valid_cookie" "$tmp_dir/me-valid.json")"
[[ "$me_status" == "200" ]] || fail "new session /me returned HTTP $me_status"
echo "PASS session-probe (HTTP 200)"

rotated_cookie="$tmp_dir/rotated.cookies"
rotate_status="$(post_with_cookie '/api/v1/auth/rotate' "$valid_cookie" "$rotated_cookie" rotate)"
[[ "$rotate_status" == "200" ]] || fail "session rotation returned HTTP $rotate_status"
echo "PASS session-rotation (HTTP 200)"

old_me_status="$(probe_me "$valid_cookie" "$tmp_dir/me-old.json")"
[[ "$old_me_status" == "401" ]] || fail "old session remained usable after rotation (HTTP $old_me_status)"
new_me_status="$(probe_me "$rotated_cookie" "$tmp_dir/me-rotated.json")"
[[ "$new_me_status" == "200" ]] || fail "rotated session /me returned HTTP $new_me_status"
echo "PASS rotated-session-boundary (old HTTP 401, new HTTP 200)"

logout_status="$(post_with_cookie '/api/v1/auth/logout' "$rotated_cookie" "$tmp_dir/logout.cookies" logout)"
[[ "$logout_status" == "200" ]] || fail "logout returned HTTP $logout_status"
logout_me_status="$(probe_me "$rotated_cookie" "$tmp_dir/me-logout.json")"
[[ "$logout_me_status" == "$expect_logout_me_status" ]] || \
  fail "post-logout /me expected HTTP $expect_logout_me_status, got $logout_me_status"
echo "PASS logout-boundary (post-logout HTTP $logout_me_status)"

for scenario in expired wrong-issuer wrong-audience invalid-signature future-issued; do
  token="$(token_for "$scenario")"
  status="$(post_token "$scenario" "$token" "$tmp_dir/$scenario.cookies")"
  [[ "$status" == "401" ]] || fail "$scenario token returned HTTP $status"
  echo "PASS $scenario (HTTP 401)"
done

replay_token="$(token_for replay)"
replay_cookie="$tmp_dir/replay.cookies"
replay_first_status="$(post_token replay-first "$replay_token" "$replay_cookie")"
[[ "$replay_first_status" == "200" ]] || fail "first replay token use returned HTTP $replay_first_status"
replay_logout_status="$(post_with_cookie '/api/v1/auth/logout' "$replay_cookie" "$tmp_dir/replay-logout.cookies" replay-logout)"
[[ "$replay_logout_status" == "200" ]] || fail "replay test cleanup logout returned HTTP $replay_logout_status"
replay_second_status="$(post_token replay-second "$replay_token" "$tmp_dir/replay-second.cookies")"
[[ "$replay_second_status" == "401" ]] || fail "replayed token returned HTTP $replay_second_status"
echo "PASS durable-replay (first HTTP 200, second HTTP 401)"

echo "SSO negative/authentication checks passed"
