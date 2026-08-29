# One Data target deployment runbook

เอกสารนี้ใช้กับ target NestJS/Next.js เท่านั้น ไม่ใช่คำสั่ง deploy ของ Laravel/Vue เดิม. Production ต้องใช้ image ที่ tag ชัดเจน, secret store และฐานข้อมูล One Data แยกจาก Portal/Special.

## 1. ก่อน deploy

- มี `ONEDATA_TARGET_API_IMAGE`, `ONEDATA_TARGET_WEB_IMAGE` และ `APP_VERSION` ที่ระบุ commit เดียวกัน.
- มี `ONEDATA_TARGET_DATABASE_URL` สำหรับฐานข้อมูล One Data และยืนยันว่าไม่มี application อื่นใช้ database user นี้.
- ตั้ง Portal issuer/audience/secret, `CORS_ORIGIN`/`ONEDATA_PUBLIC_WEB_URL`, Special URL/token และ session cookie เป็น HTTPS/secure.
- ตั้ง `ONEDATA_TRUST_PROXY` เป็นรายการ IP/CIDR ของ reverse proxy ที่ตรวจสอบแล้วเท่านั้น; ห้ามใช้ `true`, `*` หรือจำนวน hop ใน production.
- กำหนด `ONEDATA_AUTH_RETENTION_SECONDS` ตามนโยบายเก็บหลักฐาน session/replay และเตรียม restricted worker/cron สำหรับ cleanup.
- ตรวจว่า `ONEDATA_DEV_AUTH_ENABLED=false`, `ONEDATA_PROCESS_ROLE=api` ใน API และ `ONEDATA_PROCESS_ROLE=worker` ใน worker.
- Staging ต้องใช้ `docker-compose.target.production.yml` ร่วมกับ `docker-compose.target.staging.yml`; รัน `ONEDATA_STAGING_ENV_FILE=/private/path/onedata-staging.env npm run target:staging:preflight` ก่อน deploy เพื่อให้ตรวจค่าที่ resolve แล้วโดยไม่พิมพ์ secret. Preflight จะยืนยัน API hardened mode, HTTPS, secure cookie, CSRF origin, rate limit, metrics, explicit trusted proxy และปิด worker/monthly delivery.
- หลัง deploy staging ให้รัน `npm run target:sso:negative` ด้วย SSO test double และ test identity ที่ map ไว้เฉพาะ staging; ต้องเห็น valid exchange/rotation/logout ผ่าน และ invalid/expired/replay token ได้ `401` ก่อนนับ AUTH gate ผ่าน.
- ก่อนนับ SPECIAL contract gate ให้รัน `npm run target:special:contract` ใน CI/local; จากนั้นทดสอบ request matrix กับ Special staging โดยใช้ period/test credential ที่ owner อนุมัติเท่านั้น ตรวจ malformed response, period/version mismatch, retryable 408/429/5xx และ non-retryable validation/locked-period 4xx โดยไม่ใช้ period production.
- หลัง deploy staging ให้รัน `ONEDATA_EDGE_BASE_URL=https://<staging-domain> ONEDATA_EDGE_EXPECTED_ORIGIN=https://<staging-domain> npm run target:edge:check`; ต้องผ่าน HTTPS/HSTS, request ID, CORS, aggregate metrics และ `X-RateLimit-Policy: shared` ที่ reverse proxy เติมให้. ตั้ง `ONEDATA_EDGE_RATE_LIMIT_PROBE_PATH=/api/v1/auth/portal/exchange` และจำนวน probe เฉพาะ maintenance window ที่ใช้ test identity/ไม่มี token เพื่อยืนยัน `429` + `Retry-After`.
- backup และทดสอบ restore ล่าสุดผ่านเกณฑ์; ตรวจ migration status บน staging ก่อน production.
- ยืนยันว่า `Special-Allowances` period ที่จะรับ snapshot เป็น `NORMAL/OPEN`, contract version ตรงกับ source และมี owner ของ cutoff/schedule; หากเปิด monthly worker ต้องมี schedule ของ affiliation สถานะ `APPROVED`.

## 2. Migration policy

Local disposable target ใช้ `prisma db push --accept-data-loss` ได้เฉพาะใน `docker-compose.target.yml`. Staging และ production ห้ามใช้ `db push`, `--accept-data-loss` หรือ `prisma migrate dev`.

Staging ใช้ migration path เดียวกับ production:

```bash
docker compose \
  -f docker-compose.target.production.yml \
  -f docker-compose.target.staging.yml \
  config --quiet
DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:db:migrate
```

ฐานข้อมูลใหม่:

```bash
DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:db:migrate
```

ฐานข้อมูลเดิมที่สร้างจาก foundation เดิมด้วย `db push` ต้องทำ baseline อย่างมีการตรวจรับ:

1. freeze write ชั่วคราวและ backup
2. ใช้ `prisma migrate diff` เปรียบเทียบ schema จริงกับ `apps/api/prisma/schema.prisma`
3. ตรวจ count/hash ของตารางและ foreign key/index สำคัญ
4. ใช้ `prisma migrate resolve --applied 20260829210000_initial_target_schema` เฉพาะเมื่อ schema ตรงกับ migration จริงเท่านั้น
5. รัน `prisma migrate status` และ deploy บน staging ก่อนเปิด application

Migration ล่าสุดเพิ่ม `PortalLaunchReplay` สำหรับ durable/atomic `jti` consumption และ `AuthSession.revokedReason`; ต้อง deploy migration นี้ก่อนเปิด Portal exchange หลาย replica.

Migration เป็น forward-only. หาก release ใหม่มีปัญหา ให้ rollback image/application และทำ corrective migration ที่ review แล้ว; ห้ามลบ migration หรือเดา down migration กับข้อมูลราชการ.

## 3. Backup/restore rehearsal

ตัวอย่างคำสั่งต้องรันด้วย secret store/credential ที่เหมาะสม และเขียนไฟล์ backup ลง private path ที่กำหนดเท่านั้น:

```bash
mysqldump --single-transaction --routines --triggers \
  --host="$ONEDATA_DB_HOST" --port="$ONEDATA_DB_PORT" \
  --user="$ONEDATA_DB_USER" --password \
  "$ONEDATA_DB_NAME" > onedata-<timestamp>.sql
```

ตรวจ restore ลงฐานข้อมูลใหม่ที่ไม่ใช่ production, รัน `prisma migrate status`, health/readiness และ query count/hash ที่ไม่เปิด PII ใน log. เก็บ checksum ของไฟล์ backup และผล restore ตาม retention policy.

เครื่องมือใน repository:

- `DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:schema:check` ตรวจ migration status และ schema drift; production/staging ห้ามตั้ง `ONEDATA_SCHEMA_CHECK_ALLOW_UNAPPLIED`.
- `ONEDATA_BACKUP_DIR=/private/backup/onedata npm run target:backup` สร้าง SQL backup และ SHA-256 sidecar โดยไม่ overwrite ไฟล์เดิม.
- `ONEDATA_BACKUP_FILE=... ONEDATA_RESTORE_DATABASE=onedata_restore_<run-id> ONEDATA_RESTORE_CONFIRM=RESTORE_TO_NEW_DATABASE npm run target:restore:verify` ตรวจ checksum และ restore ลง database ใหม่เท่านั้น; script ไม่ drop database ที่ restore แล้ว.
- `ONEDATA_UAT_BASE_URL=... ONEDATA_UAT_WEB_URL=... ONEDATA_UAT_EVIDENCE_DIR=/private/var/onedata/uat-evidence npm run target:uat:evidence` เก็บหลักฐาน gate แบบ JSON/Markdown ที่มีเฉพาะ HTTP status และ aggregate shape; ต้องใช้ directory แบบ absolute ที่ไม่ใช่ root และไม่เก็บ payload, cookie, token หรือ PII.
- ตรวจ aggregate API metrics ที่ `/api/health/metrics` จากเครือข่าย monitoring เท่านั้น และส่ง status/error/latency metrics ต่อไปยังระบบ monitoring กลางโดยไม่ส่ง path parameter, cookie, token หรือ payload.

## 4. Deploy/rollback order

1. backup + migration dry run + maintenance/cutover window
2. รัน `migrate deploy` เป็น controlled step
3. start API แล้วตรวจ `/api/health/live`, `/api/health/ready`, contract version และ log error rate
4. start web และ worker profile (worker ต้องเปิดหลัง schedule approval เท่านั้น)
5. ทดสอบ Portal launch, workspace scope, leave read/create และ integration health แบบ synthetic/staging
6. หาก fail ให้หยุด worker, ปิด write feature flag, rollback web/API image และรักษา database migration/ข้อมูลที่ audit ได้

Worker เปิดใช้งานด้วย `--profile worker` และ `ONEDATA_WORKER_ENABLED=true` เท่านั้น. Monthly mode ต้องเปิดแยกด้วย `ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED=true` และ schedule ที่อนุมัติแล้วต่อ affiliation; เริ่มจาก retry/manual mode และเฝ้าดู delivery/audit/reconciliation ก่อน.

## 5. Operational checks

- API liveness/readiness, database connection และ container restart count
- เก็บ `target:uat:evidence` ทุก gate โดยผูกกับ commit/build/environment และตรวจว่า artifact ไม่มีข้อมูลดิบ; หาก local development เปิด dev auth ให้บันทึก `ONEDATA_UAT_EXPECT_ME_STATUS=200` เป็นข้อยกเว้น ไม่ใช่ security approval
- auth 401/403/429 rate, durable replay rejection, session revoke/idle expiry/rotation และ origin rejection
- public edge probe result, proxy-added shared rate-limit policy marker, `429`/`Retry-After` evidence และ monitoring sink/alert delivery; ไม่ถือ per-process limiter เป็น shared enforcement
- People sync run status, unmapped employee count และ leave snapshot batch status
- delivery `RETRYABLE_FAILURE`/`FAILED`, locked-period responses, reconciliation `MISMATCH/BLOCKED`, source hash/row-count mismatch และ schedule ที่หมดอายุ/ถูก pause
- worker lock contention, run duration, last successful retry/monthly run และ alertเมื่อไม่มี successful run ตาม SLA
- auth maintenance run และจำนวน session/replay ที่ cleanup ได้; หาก cleanup ล้มเหลวต้องแจ้งเตือนโดยไม่ log token หรือ session payload
- ห้าม log raw token, password, cookie, เลขบัตร, เบอร์โทรศัพท์ หรือ payload ใบลาครบชุด

## 6. Auth session operations

- Portal launch `jti` ถูกเก็บใน `PortalLaunchReplay` ด้วย unique key เดียวกันทุก API replica; การตรวจ replay ต้องผ่านฐานข้อมูลเดียวกัน ห้ามเปลี่ยน production provider กลับเป็น in-memory guard.
- `POST /api/v1/auth/rotate` หมุน opaque session cookie แบบ atomic โดย revoke session เดิมและคง absolute expiry เดิม; ใช้เมื่อมีรอบ session rotation หรือหลัง policy/permission เปลี่ยน.
- รัน `npm run worker:once -w @onedata/api` จาก restricted worker/cron เพื่อทำ leave worker และลบ authentication material ที่หมดอายุ; หากต้องการ cleanup อย่างเดียวให้ตั้ง worker mode/feature flags ไม่ให้ทำ monthly delivery และตรวจ log report ก่อนเปิด process.
- การ revoke role/membership จาก Portal ต้องมีขั้นตอน revoke session ของ subject และยืนยันด้วย request ถัดไป; ระบบจะ revoke session เมื่อ mapping/employee ไม่ active แต่การ propagation แบบ push จาก Portal ยังเป็นงาน integration ถัดไป.
