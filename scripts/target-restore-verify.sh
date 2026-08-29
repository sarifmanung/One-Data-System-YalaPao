#!/usr/bin/env bash

set -euo pipefail

backup_file="${ONEDATA_BACKUP_FILE:-}"
checksum_file="${ONEDATA_BACKUP_CHECKSUM_FILE:-${backup_file}.sha256}"
restore_database="${ONEDATA_RESTORE_DATABASE:-}"
if [[ -z "$backup_file" || ! -r "$backup_file" ]]; then
  echo "FAIL restore: ONEDATA_BACKUP_FILE must point to a readable backup" >&2
  exit 1
fi
if [[ -z "$checksum_file" || ! -r "$checksum_file" ]]; then
  echo "FAIL restore: checksum sidecar is required" >&2
  exit 1
fi
if [[ "${ONEDATA_RESTORE_CONFIRM:-}" != "RESTORE_TO_NEW_DATABASE" ]]; then
  echo "FAIL restore: set ONEDATA_RESTORE_CONFIRM=RESTORE_TO_NEW_DATABASE" >&2
  exit 1
fi
if [[ ! "$restore_database" =~ ^onedata_restore_[A-Za-z0-9_]+$ ]]; then
  echo "FAIL restore: database must use the onedata_restore_<name> pattern" >&2
  exit 1
fi
: "${ONEDATA_RESTORE_DB_HOST:?ONEDATA_RESTORE_DB_HOST is required}"
: "${ONEDATA_RESTORE_DB_USER:?ONEDATA_RESTORE_DB_USER is required}"

if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum="$(sha256sum "$backup_file" | awk '{print $1}')"
else
  actual_checksum="$(shasum -a 256 "$backup_file" | awk '{print $1}')"
fi
expected_checksum="$(awk 'NF >= 1 { print $1; exit }' "$checksum_file")"
if [[ ! "$expected_checksum" =~ ^[A-Fa-f0-9]{64}$ || "$actual_checksum" != "$expected_checksum" ]]; then
  echo "FAIL restore: backup checksum does not match sidecar" >&2
  exit 1
fi
echo "PASS checksum: $(basename "$backup_file")"

mysql_query() {
  MYSQL_PWD="${ONEDATA_RESTORE_DB_PASSWORD:-}" mysql \
    --batch --skip-column-names \
    --host="${ONEDATA_RESTORE_DB_HOST}" \
    --port="${ONEDATA_RESTORE_DB_PORT:-3306}" \
    --user="${ONEDATA_RESTORE_DB_USER}" \
    "$@"
}

existing="$(mysql_query -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${restore_database}'")"
if [[ -n "$existing" ]]; then
  echo "FAIL restore: target database already exists; choose a new restore database" >&2
  exit 1
fi

mysql_query -e "CREATE DATABASE \`$restore_database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
if ! MYSQL_PWD="${ONEDATA_RESTORE_DB_PASSWORD:-}" mysql \
  --host="${ONEDATA_RESTORE_DB_HOST}" \
  --port="${ONEDATA_RESTORE_DB_PORT:-3306}" \
  --user="${ONEDATA_RESTORE_DB_USER}" \
  "$restore_database" < "$backup_file"; then
  echo "FAIL restore: import failed; target database was left intact for investigation" >&2
  exit 1
fi

table_count="$(mysql_query "$restore_database" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")"
audit_count="$(mysql_query "$restore_database" -e "SELECT COUNT(*) FROM AuditEvent")"
echo "PASS restore: database=$restore_database tables=$table_count audit_events=$audit_count"
echo "REVIEW: run prisma migrate status and application health against this new database before declaring restore successful"
