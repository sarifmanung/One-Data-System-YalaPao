#!/usr/bin/env bash

set -euo pipefail

schema_file="${ONEDATA_PRISMA_SCHEMA:-apps/api/prisma/schema.prisma}"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "FAIL schema-check: DATABASE_URL is required" >&2
  exit 1
fi
if [[ ! -r "$schema_file" ]]; then
  echo "FAIL schema-check: Prisma schema is not readable" >&2
  exit 1
fi

export PRISMA_HIDE_UPDATE_MESSAGE=1
set +e
migration_output="$(npx prisma migrate status --schema "$schema_file" 2>&1)"
migration_status=$?
set -e
if [[ "$migration_status" -ne 0 ]]; then
  echo "$migration_output"
  if [[ "${ONEDATA_SCHEMA_CHECK_ALLOW_UNAPPLIED:-false}" != "true" ]]; then
    echo "FAIL schema-check: migration status is not clean" >&2
    exit "$migration_status"
  fi
  echo "WARN schema-check: unapplied migrations allowed for disposable/local verification"
else
  echo "$migration_output"
fi

set +e
diff_output="$(npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel "$schema_file" \
  --exit-code 2>&1)"
diff_status=$?
set -e

if [[ "$diff_status" -ne 0 ]]; then
  echo "$diff_output" >&2
  echo "FAIL schema-check: database schema drift detected" >&2
  exit "$diff_status"
fi

echo "PASS schema-check: database matches the Prisma schema"
