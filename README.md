# One Data System — Yala PAO

ระบบศูนย์กลางข้อมูลบุคลากรและการลา รุ่นเริ่มต้นของสถาปัตยกรรม Modular Monolith ตาม [Blueprint](<One Data System - Reimplementation Blueprint.md>) และ [Architecture baseline](ARCHITECTURE.md)

รายละเอียด field และ protocol ของการเชื่อม Special อยู่ที่ [Integration Contract](docs/INTEGRATION_CONTRACT.md)

## สิ่งที่มีในรุ่นแรก

- Laravel 11 + Vue 3 + TypeScript + Inertia + Tailwind
- local session login สำหรับ development และ Portal SSO launch token แบบ HS256
- Organization/tenant scope, บุคลากร และ external ID mapping
- ใบลาใน Laravel/Vue spike ปัจจุบันยังใช้ `DRAFT → CONFIRMED → CANCELLED/VOID` (legacy เท่านั้น; ไม่ใช่ target state machine)
- Target leave workflow สำหรับ NestJS/Next.js คือ Paper-first `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED` พร้อม `CANCELLED/VOIDED`, revision, audit และ outbox; draft คำนวณวันแบบ provisional ฝั่ง server ด้วย fixed-decimal/holiday/overlap guard และยังรอ HR Rulebook ก่อนใช้งานจริง
- Target web มีหน้า `/leave` และ server actions สำหรับสร้าง/ส่ง/ยกเลิกใบลา บันทึกผลจากเอกสารกระดาษ และ void ตาม capability; ยังไม่สร้าง Word/DOCX จนกว่าจะมีแบบฟอร์มมาตรฐาน
- monthly leave snapshot แบบเต็มงวด มี version, SHA-256 source hash, idempotency, employee rows ครบ scope, reconciliation และ delivery history; target API มีคำสั่ง prepare/deliver และหน้า monitor แล้ว
- Special-Allowances internal API สำหรับอ่าน master data และรับ leave snapshot
- Docker Compose สำหรับการพัฒนาแบบมี MySQL แยกฐานข้อมูล

Target contract กำหนดให้เฉพาะใบลา `PAPER_APPROVED` ที่ยังมีผลเท่านั้นถูกนำไปสร้าง snapshot ให้ระบบ ฉ. ระบบ Special ยังเป็นเจ้าของสูตร การคำนวณ period ผลลัพธ์ และรายงาน ส่วนการสร้าง Word/DOCX ถูกเลื่อนไปหลังจากมีแบบฟอร์มมาตรฐานและกฎที่ฝ่ายบุคคลรับรอง

Leave Rulebook รุ่น foundation เก็บกฎแบบ versioned/effective-dated แยกตาม affiliation, ประเภทบุคลากร และประเภทการลา ผ่าน `GET/POST /api/v1/leave/policies` และ `POST /api/v1/leave/policies/:id/publish`. เฉพาะ policy สถานะ `PUBLISHED` ที่ครอบคลุมช่วงวันลาทั้งช่วงเท่านั้นที่ใช้คำนวณ; policy `DRAFT` ไม่ถูกนำไปใช้ และการแก้กฎที่ publish แล้วต้องสร้าง version ใหม่. ใน local/dev ค่า `ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES=true` อนุญาตกฎชั่วคราวสำหรับการทดสอบเท่านั้น; production default เป็น `false` และ API จะปฏิเสธการคำนวณจนกว่าจะมี rulebook ที่รับรองแล้ว.

## Target workspace foundation (NestJS + Next.js)

Laravel/Vue เดิมยังทำงานแยกตามปกติ ส่วน target workspace อยู่ใน `apps/api`, `apps/web` และ `packages/contracts`:

```bash
npm run target:typecheck
npm run target:test
npm run target:build
docker compose -f docker-compose.target.yml up --build -d
```

สำหรับ migration/deployment ของ target ให้ดู [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md). ฐานข้อมูลใหม่ใช้ `DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:db:migrate`; production ห้ามใช้ `prisma db push` หรือ `--accept-data-loss`.

Staging ใช้ `docker-compose.target.production.yml` ร่วมกับ `docker-compose.target.staging.yml` โดยรับ image, database URL และ secret จาก environment/secret store. ตรวจค่าที่ resolve แล้วโดยไม่พิมพ์ secret ด้วย `ONEDATA_STAGING_ENV_FILE=/private/path/onedata-staging.env npm run target:staging:preflight`; preflight จะบังคับ API hardened mode, secure cookie, CSRF origin, rate limit, metrics, explicit trusted proxy และปิด worker/monthly delivery ไว้ก่อน.

ทดสอบ Portal SSO บน staging ด้วย test double และ test identity ที่เตรียมไว้เท่านั้นได้ด้วย `npm run target:sso:negative`. Runner ตรวจ valid exchange, session `/me`, rotation, logout, invalid/expired/issuer/audience/signature/future token และ durable replay; secret, cookie และ response payload อยู่ใน runtime temporary files และไม่ถูกพิมพ์หรือ commit.

ตรวจ Special-Allowances leave snapshot contract ใน CI/local ได้ด้วย `npm run target:special:contract`. ชุดนี้ครอบคลุม response ที่ผิดรูปแบบ, period/version acknowledgement ที่ไม่ตรงกัน, network/timeout, HTTP 408/429/5xx ที่ retry ได้ และ validation/locked-period 4xx ที่ต้องหยุดโดยไม่ retry; การทดสอบกับ Special staging จริงยังต้องใช้ period และ credential สำหรับทดสอบที่ owner อนุมัติ.

ตรวจ public reverse proxy และ observability gate ได้ด้วย `ONEDATA_EDGE_BASE_URL=https://staging.onedata.example.org ONEDATA_EDGE_EXPECTED_ORIGIN=https://staging.onedata.example.org npm run target:edge:check`. ค่าเริ่มต้นจะบังคับ HTTPS, HSTS, request ID, CORS, aggregate metrics และ header `X-RateLimit-Policy: shared` ที่ต้องถูกเติมโดย gateway/proxy (ไม่ใช่ให้แอปปลอมค่า); optional 429 probe ใช้ได้เฉพาะช่วงทดสอบ staging ที่กำหนดไว้.

แผน UAT/pilot/cutover และ test matrix อยู่ที่ [UAT/Pilot/Cutover Plan](docs/UAT_PILOT_CUTOVER_PLAN.md). ตรวจ target แบบ read-only ได้ด้วย `scripts/target-uat-smoke.sh` และสร้างหลักฐาน aggregate-only สำหรับ gate ได้ด้วย `scripts/target-uat-evidence.sh` โดยไม่เก็บ payload, cookie, token หรือ PII.

เปิด dashboard preview ที่ `http://localhost:3101/tenant-dashboard`, Portal launch bridge ที่ `http://localhost:3101/auth/portal/launch?token=...` และ API ที่ `http://localhost:3100/api/health/live`. Compose target มีฐานข้อมูล development แยกที่ `13307` และ seed สังเคราะห์เป็นค่าเริ่มต้น; ใน local สามารถตั้งค่า Special URL/token แล้วสั่ง master-data sync เพื่อทำ real-data shadow run ได้ โดยข้อมูลจะถูกเขียนเฉพาะ target local database. Authentication จะปฏิเสธโดยค่าเริ่มต้นจนกว่าจะตั้งค่า Portal secret/launch token หรือเปิด development auth สำหรับ local test.

## เริ่มรันในเครื่อง

```bash
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

บัญชี development จาก seed คือ `admin` / ค่าตั้งต้น `password` ควรเปลี่ยนผ่าน `ONEDATA_SEED_ADMIN_PASSWORD` ทันทีเมื่อใช้ร่วมกับผู้อื่น

## เริ่มด้วย Docker

```bash
cp .env.example .env
php artisan key:generate
docker compose up -d --build
```

ค่าเริ่มต้นเปิดที่ `http://localhost:8088` และใช้ MySQL volume ชื่อ `onedata-mysql-data` การ deploy จริงควรใช้ database/user แยกของ One Data บน shared-infra และไม่ใช้ค่า secret ใน `.env.example`

ถ้า deploy ร่วมกับ `shared-infra` และ `Special-Allowances` ให้ใช้ override ที่ต่อ app/scheduler เข้า external network `webproxy`:

```bash
docker compose -f docker-compose.yml -f docker-compose.shared.yml up -d --build
```

## เชื่อมระบบ Special-Allowances

ตั้งค่าที่ทั้งสองระบบให้ใช้ token เดียวกัน:

```dotenv
# One Data
# ใช้ชื่อ allowance-backend ได้เมื่อรันด้วย shared-infra/webproxy override
SPECIAL_ALLOWANCES_BASE_URL=http://allowance-backend:3000
SPECIAL_ALLOWANCES_INTEGRATION_TOKEN=<random-long-token>
SPECIAL_ALLOWANCES_DRY_RUN=true

# Special-Allowances/backend
ONEDATA_INTEGRATION_TOKEN=<random-long-token>
```

ก่อนส่งจริงต้องมี period แบบ `NORMAL` และสถานะ `OPEN` ใน Special. Target NestJS ใช้ `SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION=1.0` เป็นค่าเริ่มต้นเพื่อเข้ากับ DTO ปัจจุบันของ Special; เปลี่ยนเป็น `1.1` ได้เมื่อ source upstream รองรับ field additive ตาม Integration Contract แล้ว. ตัวแปร `SPECIAL_ALLOWANCES_DRY_RUN` เป็นของ Laravel/Vue baseline เดิม ไม่ใช่สวิตช์ของ target adapter.

API contract ที่เปิดให้ One Data เรียกใช้:

- `GET /internal/api/v1/master-data/health-centers`
- `GET /internal/api/v1/master-data/employees`
- `GET /internal/api/v1/master-data/users`
- `POST /internal/api/v1/periods/{YYYY-MM}/leave-snapshot`

การ sync master data เป็นการดึงจาก Special เข้ามา One Data ส่วน leave snapshot เป็นการส่งจาก One Data ไป Special แบบ complete snapshot รายเดือน การ retry ใช้ idempotency key และ source hash ไม่ใช้การเขียนฐานข้อมูลข้ามระบบ

Target One Data API สำหรับ snapshot:

- `POST /api/v1/integrations/special/leave-snapshots/prepare` — สร้างหรือคืน batch เดิมจาก period/cutoff/source hash
- `POST /api/v1/integrations/special/leave-snapshots/{batchId}/deliver` — ส่ง batch ที่เตรียมไว้และบันทึกผลการส่ง
- `GET /api/v1/integrations/special/leave-snapshots/{batchId}` — อ่านสถานะ batch/delivery สำหรับผู้ดูแล
- `GET /api/v1/integrations/special/leave-snapshots` — อ่านประวัติ batch พร้อม reconciliation summary
- `GET/POST /api/v1/integrations/special/leave-snapshots/schedules` — อ่านหรือบันทึก monthly schedule ฉบับร่าง
- `POST /api/v1/integrations/special/leave-snapshots/schedules/{id}/approve|pause` — อนุมัติหรือหยุด schedule

หน้า monitor อยู่ที่ `/leave/snapshots`; แสดงจำนวนที่เตรียม/รับจริง, period/version acknowledgement และ mismatch โดยไม่แสดง payload เต็ม. การส่งอัตโนมัติยังปิดเป็นค่าเริ่มต้นและต้องเปิดทั้ง worker/monthly flag กับ schedule ที่สถานะ `APPROVED`.

Target worker foundation มีคำสั่งดังนี้:

- `npm run worker:once -w @onedata/api` — รัน retry/monthly orchestration หนึ่งรอบและจบ process
- `npm run worker -w @onedata/api` — รัน loop ตาม `ONEDATA_WORKER_INTERVAL_MS`
- Docker Compose ใช้ `--profile worker`; worker และ monthly delivery ปิดเป็นค่าเริ่มต้น ต้องเปิด `ONEDATA_WORKER_ENABLED=true` และ `ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED=true` แยกกัน

worker จะ retry เฉพาะ delivery ที่ถึงเวลา, ใช้ MySQL named lock กันหลาย instance และ monthly mode จะไม่สร้าง batch ซ้ำเมื่อ period/affiliation มี batch อยู่แล้ว. Monthly mode จะเลือกเฉพาะ affiliation ที่มี schedule `APPROVED`, contract version ตรงกับ configuration และถึง cutoff แล้ว; production ยังต้องผ่าน schedule owner/alerting/UAT approval.

Target API จะ fail-fast หาก `NODE_ENV=staging|production` แต่ขาด database/Portal secret/CORS/trusted-proxy allowlist, ปิด CSRF/rate-limit/metrics หรือใช้ development auth/insecure cookie. Cookie-authenticated mutation ต้องมี origin ที่อยู่ใน `CORS_ORIGIN`; API มี security headers, HSTS, idle session timeout, database-backed launch-token replay/session revocation, session rotation และ per-process rate limit เป็นชั้นป้องกันเบื้องต้น. ต้องวาง rate limiting ที่ reverse proxy/WAF/shared gateway ก่อนเปิดหลาย replica; รายละเอียด gate อยู่ที่ [Edge Gateway & Observability Gate](docs/EDGE_GATEWAY_OBSERVABILITY.md).

Auth session มี `POST /api/v1/auth/rotate` สำหรับหมุน opaque cookie session โดยไม่ต่อ absolute expiry; `worker:once`/maintenance worker จะลบ session และ launch replay ที่หมดอายุตาม retention policy. ห้ามนำ token ดิบไปเก็บใน log หรือ audit metadata.

Target API มีคำสั่ง sync สำหรับผู้ดูแลที่มี capability `employee.master-data.sync` (Portal role/position จะถูก map เป็น allowlist ฝั่ง One Data; `PEOPLE_SYNC_ADMIN` หรือ role development ใช้ใน local test ได้):

- `POST /api/v1/people/sync/special`
- `GET /api/v1/people/identity-mappings/portal` สำหรับดู source-user/Portal mapping reconciliation
- `POST /api/v1/people/identity-mappings/portal` สำหรับผู้ดูแลจับคู่ Portal subject กับ employee ที่ตรวจสอบแล้ว
- `GET/POST /api/v1/authorization/delegated-approvers` และ `POST /api/v1/authorization/delegated-approvers/{id}/revoke` สำหรับ delegated assignment ที่มี workspace/effective-date/audit

คำสั่งนี้จะทำงานได้เมื่อกำหนด `SPECIAL_ALLOWANCES_BASE_URL` และ `SPECIAL_ALLOWANCES_INTEGRATION_TOKEN`; จะสร้าง projection ด้วย source ID, เก็บประวัติ membership และบันทึก `MasterDataSyncRun` โดยไม่ลบข้อมูลเดิม

## ตรวจสอบคุณภาพ

```bash
php artisan test
npm run build
find app config routes database -type f -name '*.php' -print0 | xargs -0 -n1 php -l
```

ฝั่ง Special-Allowances:

```bash
cd ../Special-Allowances/backend
npm run build
```

Target operations tooling:

```bash
DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:schema:check
ONEDATA_STAGING_ENV_FILE=/private/path/onedata-staging.env \
  npm run target:staging:preflight
ONEDATA_SSO_BASE_URL=https://onedata-staging.example.org \
  ONEDATA_SSO_TEST_SECRET="$STAGING_SSO_TEST_SECRET" \
  ONEDATA_SSO_TEST_ISSUER=yala-pao-health-portal-staging \
  ONEDATA_SSO_TEST_AUDIENCE=one_data_staging \
ONEDATA_SSO_ORIGIN=https://onedata-staging.example.org \
  ONEDATA_SSO_EXPECT_SECURE_COOKIE=true \
  npm run target:sso:negative
npm run target:special:contract
ONEDATA_EDGE_BASE_URL=https://staging.onedata.example.org \
  ONEDATA_EDGE_EXPECTED_ORIGIN=https://staging.onedata.example.org \
  npm run target:edge:check
ONEDATA_BACKUP_DIR=/private/backup/onedata \
  ONEDATA_DB_HOST="$ONEDATA_DB_HOST" ONEDATA_DB_PORT="$ONEDATA_DB_PORT" \
  ONEDATA_DB_USER="$ONEDATA_DB_USER" ONEDATA_DB_NAME="$ONEDATA_DB_NAME" \
  npm run target:backup
ONEDATA_UAT_BASE_URL=http://localhost:3100 \
  ONEDATA_UAT_WEB_URL=http://localhost:3101 \
  ./scripts/target-uat-smoke.sh
ONEDATA_UAT_BASE_URL=http://localhost:3100 \
  ONEDATA_UAT_WEB_URL=http://localhost:3101 \
  ONEDATA_UAT_EVIDENCE_DIR=/private/var/onedata/uat-evidence \
  npm run target:uat:evidence
```

`target:schema:check` ต้องรันกับฐานที่มี migration history ใน staging/production; local `db push` ใช้ `ONEDATA_SCHEMA_CHECK_ALLOW_UNAPPLIED=true` ได้เฉพาะ disposable database. `target:backup` สร้าง SQL backup พร้อม sidecar SHA-256 โดยไม่ overwrite ไฟล์เดิม และ `target:restore:verify` restore ได้เฉพาะฐานใหม่ที่ตั้งชื่อ `onedata_restore_<name>` พร้อม confirmation ที่ชัดเจน. Metrics แบบ aggregate ที่ไม่เก็บ path/IP/identity/payload อยู่ที่ `/api/health/metrics` และควรเปิดให้เฉพาะเครือข่าย monitoring. `target:uat:evidence` ต้องระบุ `ONEDATA_UAT_EVIDENCE_DIR` เป็น absolute non-root directory และสร้าง JSON/Markdown ที่เก็บเฉพาะผลตรวจรวม; ค่า auth probe เริ่มต้นคือ 401. หาก local development เปิด dev auth จน `/api/v1/me` ตอบ 200 ให้ตั้ง `ONEDATA_UAT_EXPECT_ME_STATUS=200` เฉพาะการตรวจ local และห้ามตีความเป็น production security pass.

## ขอบเขตที่ยังต้องทำต่อ

- เชื่อม Portal module manifest/launch URL และจับคู่ organization code จริง
- ทดสอบข้อมูลจริง 38 รพ.สต. และแก้ mapping บัญชี Portal ↔ บุคลากรให้ครบ
- ตัดสินใจ/รับรองกฎวันลาและแบบ Word จริงก่อนสร้าง document module
- เปิด scheduled monthly snapshot หลัง schedule owner, reconciliation/alerting และ UAT approval ผ่าน (worker/schedule/reconciliation foundation มีแล้ว แต่ปิด scheduled delivery เป็นค่าเริ่มต้น)
- ทำ UAT evidence ตาม [Release Readiness](docs/RELEASE_READINESS.md) และ staging/pilot จริง; local evidence ที่ผ่านเป็นเพียง G0 checkpoint
- เพิ่ม module อื่นภายหลัง เช่น จองรถ โดยรักษา module boundary และ data ownership เดิม
