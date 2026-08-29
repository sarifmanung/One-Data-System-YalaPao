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
- monthly leave snapshot แบบเต็มงวด มี version, SHA-256 source hash, idempotency, complete-reset payload และ delivery history; target API มีคำสั่ง prepare/deliver แบบ manual แล้ว
- Special-Allowances internal API สำหรับอ่าน master data และรับ leave snapshot
- Docker Compose สำหรับการพัฒนาแบบมี MySQL แยกฐานข้อมูล

Target contract กำหนดให้เฉพาะใบลา `PAPER_APPROVED` ที่ยังมีผลเท่านั้นถูกนำไปสร้าง snapshot ให้ระบบ ฉ. ระบบ Special ยังเป็นเจ้าของสูตร การคำนวณ period ผลลัพธ์ และรายงาน ส่วนการสร้าง Word/DOCX ถูกเลื่อนไปหลังจากมีแบบฟอร์มมาตรฐานและกฎที่ฝ่ายบุคคลรับรอง

## Target workspace foundation (NestJS + Next.js)

Laravel/Vue เดิมยังทำงานแยกตามปกติ ส่วน target workspace อยู่ใน `apps/api`, `apps/web` และ `packages/contracts`:

```bash
npm run target:typecheck
npm run target:test
npm run target:build
docker compose -f docker-compose.target.yml up --build -d
```

สำหรับ migration/deployment ของ target ให้ดู [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md). ฐานข้อมูลใหม่ใช้ `DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:db:migrate`; production ห้ามใช้ `prisma db push` หรือ `--accept-data-loss`.

เปิด dashboard preview ที่ `http://localhost:3101/tenant-dashboard`, Portal launch bridge ที่ `http://localhost:3101/auth/portal/launch?token=...` และ API ที่ `http://localhost:3100/api/health/live`. Compose target มีฐานข้อมูล development แยกที่ `13307` และ seed สังเคราะห์สำหรับทดสอบเท่านั้น; ไม่มีข้อมูลบุคลากรจริง และ authentication จะปฏิเสธโดยค่าเริ่มต้นจนกว่าจะตั้งค่า Portal secret และ launch token ตามแผน.

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

การส่งจริงยังเป็นคำสั่ง manual ใน checkpoint นี้; worker foundation มีแล้วแต่ scheduled delivery ยังปิดไว้ และ reconciliation UI เป็นงานถัดไป.

Target worker foundation มีคำสั่งดังนี้:

- `npm run worker:once -w @onedata/api` — รัน retry/monthly orchestration หนึ่งรอบและจบ process
- `npm run worker -w @onedata/api` — รัน loop ตาม `ONEDATA_WORKER_INTERVAL_MS`
- Docker Compose ใช้ `--profile worker`; worker และ monthly delivery ปิดเป็นค่าเริ่มต้น ต้องเปิด `ONEDATA_WORKER_ENABLED=true` และ `ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED=true` แยกกัน

worker จะ retry เฉพาะ delivery ที่ถึงเวลา, ใช้ MySQL named lock กันหลาย instance และ monthly mode จะไม่สร้าง batch ซ้ำเมื่อ period/affiliation มี batch อยู่แล้ว. Reconciliation UI และ policy อนุมัติ schedule ยังต้องทำก่อน production.

Target API จะ fail-fast หาก `NODE_ENV=production` แต่ขาด database/Portal secret/CORS หรือใช้ development auth/insecure cookie. Cookie-authenticated mutation ต้องมี origin ที่อยู่ใน `CORS_ORIGIN`; API มี security headers, idle session timeout และ per-process rate limit เป็นชั้นป้องกันเบื้องต้น. ก่อนเปิดหลาย replica ต้องเพิ่ม distributed replay/session revocation และ rate limiting ที่ reverse proxy/WAF.

Target API มีคำสั่ง sync สำหรับผู้ดูแลที่มี capability `employee.master-data.sync` (Portal role/position จะถูก map เป็น allowlist ฝั่ง One Data; `PEOPLE_SYNC_ADMIN` หรือ role development ใช้ใน local test ได้):

- `POST /api/v1/people/sync/special`
- `POST /api/v1/people/identity-mappings/portal` สำหรับผู้ดูแลจับคู่ Portal subject กับ employee ที่ตรวจสอบแล้ว

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

## ขอบเขตที่ยังต้องทำต่อ

- เชื่อม Portal module manifest/launch URL และจับคู่ organization code จริง
- ทดสอบข้อมูลจริง 38 รพ.สต. และแก้ mapping บัญชี Portal ↔ บุคลากรให้ครบ
- ตัดสินใจ/รับรองกฎวันลาและแบบ Word จริงก่อนสร้าง document module
- เพิ่ม scheduled monthly snapshot ที่ผ่านการอนุมัติ, reconciliation UI และ production alerting (worker/retry foundation มีแล้ว แต่ปิด scheduled delivery เป็นค่าเริ่มต้น)
- เพิ่ม module อื่นภายหลัง เช่น จองรถ โดยรักษา module boundary และ data ownership เดิม
