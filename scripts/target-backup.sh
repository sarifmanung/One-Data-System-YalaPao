#!/usr/bin/env bash

set -euo pipefail

backup_dir="${ONEDATA_BACKUP_DIR:-}"
if [[ -z "$backup_dir" || "$backup_dir" == "/" || "$backup_dir" != /* ]]; then
  echo "FAIL backup: ONEDATA_BACKUP_DIR must be an explicit absolute non-root path" >&2
  exit 1
fi
: "${ONEDATA_DB_HOST:?ONEDATA_DB_HOST is required}"
: "${ONEDATA_DB_USER:?ONEDATA_DB_USER is required}"
: "${ONEDATA_DB_NAME:?ONEDATA_DB_NAME is required}"

mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$(mktemp "$backup_dir/onedata-target-${timestamp}.XXXXXX.sql")"
checksum_file="${backup_file}.sha256"
cleanup() {
  rm -f "$backup_file" "$checksum_file"
}
trap cleanup ERR INT TERM

MYSQL_PWD="${ONEDATA_DB_PASSWORD:-}" mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --no-tablespaces \
  --hex-blob \
  --host="${ONEDATA_DB_HOST}" \
  --port="${ONEDATA_DB_PORT:-3306}" \
  --user="${ONEDATA_DB_USER}" \
  "${ONEDATA_DB_NAME}" > "$backup_file"

if [[ ! -s "$backup_file" ]]; then
  echo "FAIL backup: mysqldump produced an empty file" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  checksum="$(sha256sum "$backup_file" | awk '{print $1}')"
else
  checksum="$(shasum -a 256 "$backup_file" | awk '{print $1}')"
fi
printf '%s  %s\n' "$checksum" "$(basename "$backup_file")" > "$checksum_file"
chmod 600 "$backup_file" "$checksum_file"
trap - ERR INT TERM

echo "PASS backup: $(basename "$backup_file")"
echo "CHECKSUM: $(basename "$checksum_file")"
