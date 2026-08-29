#!/usr/bin/env bash

set -euo pipefail
umask 077

production_compose="${ONEDATA_STAGING_PRODUCTION_COMPOSE:-docker-compose.target.production.yml}"
staging_compose="${ONEDATA_STAGING_COMPOSE:-docker-compose.target.staging.yml}"
env_file="${ONEDATA_STAGING_ENV_FILE:-}"
require_webproxy="${ONEDATA_STAGING_REQUIRE_WEBPROXY:-true}"

fail() {
  echo "FAIL staging-preflight: $1" >&2
  exit 1
}

[[ -r "$production_compose" ]] || fail "production compose file is not readable"
[[ -r "$staging_compose" ]] || fail "staging compose file is not readable"
if [[ -n "$env_file" && ! -r "$env_file" ]]; then
  fail "ONEDATA_STAGING_ENV_FILE is not readable"
fi
case "$require_webproxy" in
  true|false) ;;
  *) fail "ONEDATA_STAGING_REQUIRE_WEBPROXY must be true or false" ;;
esac
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v jq >/dev/null 2>&1 || fail "jq is required"

compose_args=()
if [[ -n "$env_file" ]]; then
  compose_args+=(--env-file "$env_file")
fi
# Include the disabled worker profile in the resolved configuration so the
# preflight can verify that it also has no host port and uses the proxy network.
compose_args+=(--profile worker)
compose_args+=(-f "$production_compose" -f "$staging_compose")

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/onedata-staging-preflight.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT
resolved_file="$tmp_dir/compose.json"

if ! docker compose "${compose_args[@]}" config --quiet >/dev/null 2>"$tmp_dir/compose-error.log"; then
  fail "Compose configuration is incomplete or invalid"
fi
if ! docker compose "${compose_args[@]}" config --format json >"$resolved_file" 2>"$tmp_dir/compose-json-error.log"; then
  fail "could not resolve Compose configuration"
fi

service_env() {
  local service="$1"
  local key="$2"
  jq -r --arg service "$service" --arg key "$key" \
    '.services[$service].environment[$key] // empty' "$resolved_file"
}

service_image() {
  local service="$1"
  jq -r --arg service "$service" '.services[$service].image // empty' "$resolved_file"
}

service_has_network() {
  local service="$1"
  local network="$2"
  jq -e --arg service "$service" --arg network "$network" \
    '.services[$service].networks
      | if type == "array" then index($network) != null else has($network) end' \
    "$resolved_file" >/dev/null
}

required_env_keys=(
  APP_VERSION
  DATABASE_URL
  SPECIAL_ALLOWANCES_BASE_URL
  SPECIAL_ALLOWANCES_INTEGRATION_TOKEN
  PORTAL_TOKEN_ISSUER
  PORTAL_TOKEN_AUDIENCE
  PORTAL_SHARED_SECRET
  ONEDATA_TRUST_PROXY
)
for key in "${required_env_keys[@]}"; do
  if [[ -z "$(service_env onedata-target-api "$key")" ]]; then
    fail "$key is missing from the resolved staging configuration"
  fi
done
[[ -n "$(service_env onedata-target-web ONEDATA_PUBLIC_WEB_URL)" ]] || \
  fail "ONEDATA_PUBLIC_WEB_URL is missing from the resolved staging configuration"

api_image="$(service_image onedata-target-api)"
web_image="$(service_image onedata-target-web)"
app_version="$(service_env onedata-target-api APP_VERSION)"
public_url="$(service_env onedata-target-web ONEDATA_PUBLIC_WEB_URL)"
proxy_allowlist="$(service_env onedata-target-api ONEDATA_TRUST_PROXY)"

[[ -n "$api_image" && -n "$web_image" ]] || fail "API and Web images are required"
[[ "$api_image" != "latest" && "$api_image" != *:latest ]] || fail "API image must not use latest"
[[ "$web_image" != "latest" && "$web_image" != *:latest ]] || fail "Web image must not use latest"
[[ -n "$app_version" && "$app_version" != "latest" ]] || fail "APP_VERSION must be an immutable release identifier"
[[ "$public_url" == https://* ]] || fail "ONEDATA_PUBLIC_WEB_URL must use HTTPS in staging"
[[ -n "$proxy_allowlist" ]] || fail "ONEDATA_TRUST_PROXY is required"
[[ "$proxy_allowlist" != "true" && "$proxy_allowlist" != "*" ]] || fail "ONEDATA_TRUST_PROXY must be an explicit IP/CIDR list"
[[ ! "$proxy_allowlist" =~ ^[0-9]+$ ]] || fail "ONEDATA_TRUST_PROXY must not be a hop count"

for service in onedata-target-api onedata-target-web onedata-target-worker; do
  if jq -e --arg service "$service" '.services[$service].ports // [] | length > 0' "$resolved_file" >/dev/null; then
    fail "$service must not publish a host port in staging; expose it through the reverse proxy"
  fi
  service_has_network "$service" webproxy || fail "$service must attach to the external webproxy network"
done

[[ "$(service_env onedata-target-api NODE_ENV)" == "staging" ]] || fail "API NODE_ENV must be staging"
[[ "$(service_env onedata-target-api ONEDATA_DEV_AUTH_ENABLED)" == "false" ]] || fail "development auth must be disabled"
[[ "$(service_env onedata-target-api ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES)" == "false" ]] || fail "provisional leave rules must be disabled"
[[ "$(service_env onedata-target-api ONEDATA_SESSION_COOKIE_SECURE)" == "true" ]] || fail "secure session cookie is required"
[[ "$(service_env onedata-target-api ONEDATA_CSRF_ENABLED)" == "true" ]] || fail "CSRF protection must be enabled"
[[ "$(service_env onedata-target-api ONEDATA_CSRF_REQUIRE_ORIGIN)" == "true" ]] || fail "CSRF origin check must be required"
[[ "$(service_env onedata-target-api ONEDATA_RATE_LIMIT_ENABLED)" == "true" ]] || fail "API rate limit must be enabled"
[[ "$(service_env onedata-target-api ONEDATA_METRICS_ENABLED)" == "true" ]] || fail "aggregate metrics must be enabled"
[[ "$(service_env onedata-target-api CORS_ORIGIN)" == "$public_url" ]] || fail "CORS origin must match the public Web URL"
[[ "$(service_env onedata-target-api ONEDATA_WORKER_ENABLED)" != "true" ]] || fail "worker must remain disabled before G1 approval"
[[ "$(service_env onedata-target-api ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED)" != "true" ]] || fail "monthly snapshot must remain disabled before pilot approval"
[[ "$(service_env onedata-target-worker ONEDATA_WORKER_ENABLED)" != "true" ]] || fail "staging worker must remain disabled by default"
[[ "$(service_env onedata-target-worker ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED)" != "true" ]] || fail "staging monthly snapshot must remain disabled by default"

if ! jq -e '.networks.webproxy.external == true' "$resolved_file" >/dev/null; then
  fail "staging must attach to the external webproxy network"
fi
if [[ "$require_webproxy" == "true" ]] && ! docker network inspect webproxy >/dev/null 2>&1; then
  fail "external webproxy network does not exist"
fi

echo "PASS staging-preflight: hardened staging Compose resolved without printing configuration values"
if [[ "$require_webproxy" == "false" ]]; then
  echo "NOTE staging-preflight: webproxy existence check was explicitly skipped"
fi
