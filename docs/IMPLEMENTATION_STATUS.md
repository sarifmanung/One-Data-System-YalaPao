# One Data Implementation Status

อัปเดตล่าสุด: 29 สิงหาคม 2569 (2026)

เอกสารนี้เป็น checkpoint ของการลงมือทำตาม [Blueprint](../One%20Data%20System%20-%20Reimplementation%20Blueprint.md) และ [Architecture](../ARCHITECTURE.md) โดยแยกสิ่งที่ build/test แล้วออกจากสิ่งที่ยังไม่ควรนำไปใช้จริง

## ทำแล้วในรอบ Foundation

| Area | สถานะ | หลักฐาน |
| --- | --- | --- |
| Shared contract | เสร็จระดับ foundation | `packages/contracts`, contract version `1.4`, typed One Data capabilities, `PAPER_APPROVED` effective status, snapshot reconciliation/schedule summaries และ fixture ที่ไม่มี `CONFIRMED` |
| NestJS API | เสร็จระดับ foundation | `apps/api`, `/api/health/live`, `/api/health/ready`, `/api/v1/system/contract` |
| HTTP boundary | เสร็จระดับ foundation | request-id, API envelope, problem-details, validation configuration และ aggregate response metrics ที่ไม่เก็บ PII |
| Auth boundary | เสร็จระดับ local + staging-test foundation | Portal HS256 token verification/exchange, issuer/audience/expiry/jti replay checks แบบ database-backed, opaque session token ที่เก็บเฉพาะ SHA-256 hash, secure httpOnly cookie, session rotation/revocation audit, SSO test double/negative runner และ development fallback ที่ปิดเป็นค่าเริ่มต้น |
| Tenant boundary | guard เสร็จระดับ session foundation | session workspace derive จาก active employee membership; `x-tenant-id` เลือกได้เฉพาะ workspace ที่ identity มีสิทธิ์ |
| Next.js web | เสร็จระดับ local development | `/tenant-dashboard`, `/leave`, `/auth/portal/launch`, runtime API health/current user และ server actions ของ Paper-first leave workflow ตาม reference direction |
| Docker | เสร็จระดับ local + staging foundation | `docker-compose.target.yml`, production template, `docker-compose.target.staging.yml`, API `3100`, web `3101`, แยกจาก Laravel compose และมี staging preflight |
| People master-data projection | เสร็จระดับ local real-data shadow run | `SpecialMasterDataClient`, transaction/idempotent upsert ด้วย source ID, effective membership, soft-inactivate, `SourceUserProjection` และ `MasterDataSyncRun`; local contract test กับ Special จริงผ่าน: 38 หน่วยงาน, 267 บุคลากร, 43 users และ idempotent re-sync ผ่าน; มี endpoint รายงาน source-user/Portal mapping แล้ว แต่ยังไม่มี user-to-employee mapping ที่ยืนยันจาก source |
| Authorization | เสร็จระดับ local scoped foundation | Portal role/position → One Data capability allowlist, operation scope matrix (`self`/`tenant`/`affiliation`), session permission snapshot, server-side route guard, delegated approver assignment API และ self/requester paper-result separation |
| Production security guard foundation | เสร็จระดับ staging/local integration foundation | staging/production config fail-fast, idle session timeout, secure-cookie validation, CSRF origin policy, explicit trusted-proxy policy, security headers, database-backed replay/session revocation, session rotation, maintenance cleanup และ auth/mutation rate limit; edge/shared limiter ยังต้องทำที่ gateway |
| Special leave snapshot adapter | เสร็จระดับ local integration foundation | prepare complete snapshot จาก `PAPER_APPROVED` พร้อม employee rows ครบ scope, source hash/idempotency, immutable batch, service-token client, delivery history, reconciliation summary, retry metadata และ period/version acknowledgement guard; ยังไม่เปิด real-data delivery |
| Leave snapshot worker | เสร็จระดับ local integration foundation | API image มี `worker`/`worker:once`, MySQL named lock, retry due deliveries, approved schedule gate, optional previous-month cutoff orchestration และ affiliation-scoped system identity; ปิดด้วย `ONEDATA_WORKER_ENABLED=false` เป็นค่าเริ่มต้น |
| Prisma migration/deployment foundation | เสร็จระดับ local integration foundation | initial/forward migrations, `migrate deploy`, schema-drift check, production Compose template, backup/checksum และ restore-to-new-database verification scripts กับ [deployment runbook](DEPLOYMENT_RUNBOOK.md); ตรวจ tooling กับ MySQL ชั่วคราวแล้ว แต่ยังไม่ baseline ฐานข้อมูลเดิมหรือ production-like restore rehearsal |
| UAT/pilot operating foundation | เสร็จระดับ planning + local evidence/shadow | [UAT/Pilot/Cutover Plan](UAT_PILOT_CUTOVER_PLAN.md), [Release Readiness](RELEASE_READINESS.md), test matrix, G0–G5 gate, reconciliation/rollback checklist, snapshot/schedule monitor, `scripts/target-uat-smoke.sh` และ aggregate-only `scripts/target-uat-evidence.sh`; local evidence ผ่านโดยใช้ dev-auth override แต่ยังไม่มี staging/real-data pilot |
| Prisma/People/Leave vertical slice | เสร็จระดับ local development | schema + synthetic seed, People read, Leave `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED`, `CANCELLED/VOIDED`, provisional server-side day calculation, fixed-decimal requested days, holiday exclusion, active-request overlap guard, Paper-first UI/server actions และ durable audit/outbox |
| Leave Rulebook foundation | เสร็จระดับ local development | versioned/effective-dated `LeavePolicyProfile`/`LeavePolicyRule`, draft/publish API, legal-basis/approval audit, active leave-type validation และ production guard ที่ไม่อนุญาต provisional calculation |
| Regression checks | ผ่าน | target typecheck, target build, API 19 suites/69 tests, shell syntax/tooling checks, staging Compose/preflight with dummy values, SSO test double/negative runner, UAT evidence script, legacy Vite build, Docker health smoke และ browser workflow smoke ด้วยข้อมูลสังเคราะห์ |

## ยังไม่เสร็จและห้ามตีความว่า production-ready

- production backup/restore rehearsal และการอนุมัติ baseline ฐานข้อมูลเดิม (migration policy, initial/forward migration, schema check, checksum/restore verification tooling และ runbook มีแล้ว)
- permission scope matrix แบบละเอียดครบทุกโมดูลและ owner sign-off (base `self`/`tenant`/`affiliation` matrix และ delegated approver configuration รุ่นแรกทำแล้ว)
- production session hardening ที่ยังเหลือ เช่น edge/shared rate limit, Portal role/membership revocation propagation และ proxy/maintenance operational rehearsal (database-backed replay/revocation, session rotation, explicit trusted-proxy policy และ cleanup foundation มีแล้ว)
- People reconciliation จาก Special-Allowances, การ map Portal user กับ employee และการยืนยันผลกับ data owner (local shadow import และ source-user projection/report ผ่านแล้ว; ยังต้องทำ mapping ที่ตรวจรับและ sign-off)
- HR-approved leave Rulebook/official legal basis, quota/balance engine, half-day policy, holiday ownership, complete snapshot และ production acceptance rules (versioned policy draft/publish foundation และ provisional day calculation/state machine/revision/audit/outbox foundation มีแล้ว; ห้ามถือ provisional rule เป็นกฎสิทธิ์จริง)
- locked-period adjustment/correction contract, production alerting และ production schedule approval/owner sign-off (worker retry/monthly, approved schedule gate และ reconciliation UI foundation มีแล้ว แต่ยังปิด scheduled delivery)
- document/DOCX, report access และ production operational observability (leave UI เป็น form workflow แล้ว แต่ยังไม่มีการสร้าง Word/DOCX; aggregate metrics และ aggregate-only UAT evidence tooling มีแล้ว แต่ยังต้องเชื่อม dashboard/alerting และซ้อม backup/restore ใน staging/production-like environment)
- UAT กับข้อมูล/บัญชีจริงและ pilot 3 รพ.สต.
- staging restore rehearsal, production-like real-data shadow run, owner sign-off และ pilot ตาม [UAT/Pilot/Cutover Plan](UAT_PILOT_CUTOVER_PLAN.md)

## คำสั่งตรวจซ้ำ

```bash
npm run target:typecheck
npm run target:test
npm run target:build
npm run build
docker compose -f docker-compose.target.yml up --build -d
# Production-like migration uses the controlled deploy command; see docs/DEPLOYMENT_RUNBOOK.md
DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:db:migrate
# Staging config preflight (use a private env file outside the repository)
ONEDATA_STAGING_ENV_FILE=/private/path/onedata-staging.env npm run target:staging:preflight
# Staging SSO test double + invalid/replay/session checks (test identity only)
ONEDATA_SSO_BASE_URL=https://onedata-staging.example.org \
  ONEDATA_SSO_TEST_SECRET="$STAGING_SSO_TEST_SECRET" \
  ONEDATA_SSO_TEST_ISSUER=yala-pao-health-portal-staging \
  ONEDATA_SSO_TEST_AUDIENCE=one_data_staging \
  ONEDATA_SSO_ORIGIN=https://onedata-staging.example.org \
  ONEDATA_SSO_EXPECT_SECURE_COOKIE=true npm run target:sso:negative
# Read-only target smoke (set ONEDATA_UAT_WEB_URL for the web probe)
ONEDATA_UAT_BASE_URL=http://localhost:3100 ONEDATA_UAT_WEB_URL=http://localhost:3101 ./scripts/target-uat-smoke.sh
# Aggregate-only UAT evidence; local dev auth may require ONEDATA_UAT_EXPECT_ME_STATUS=200
ONEDATA_UAT_BASE_URL=http://localhost:3100 ONEDATA_UAT_WEB_URL=http://localhost:3101 \
  ONEDATA_UAT_EVIDENCE_DIR=/private/var/onedata/uat-evidence npm run target:uat:evidence
```

ชุด automated tests ใช้ fixture และ unit/contract endpoints โดยไม่เปิดข้อมูลส่วนบุคคลใน log. เพิ่ม local real-data shadow run แบบอ่านจาก Special ผ่าน service token แล้วเขียนเฉพาะ target local database: ตรวจพบ 38 หน่วยงาน, 267 บุคลากร และ 43 users โดยไม่แก้ไขฐานข้อมูล Laravel, Portal หรือ Special-Allowances และไม่ทำ leave snapshot delivery. Token ถูกส่งผ่าน runtime environment เท่านั้น ไม่อยู่ใน repository หรือ JSON response.

`target:uat:evidence` เก็บเพียง HTTP status, contract/metrics shape และผล smoke ลง JSON/Markdown; ไม่เก็บ response payload, cookie, token, identity, IP หรือข้อมูลบุคคล. หลักฐาน local ที่ตั้ง `ONEDATA_UAT_EXPECT_ME_STATUS=200` เป็นข้อยกเว้นของ development auth และไม่ใช้แทนการทดสอบ deny-by-default ใน staging/production.

## Security note

`npm audit --omit=dev --audit-level=high` รายงาน 6 high-severity advisories ใน Prisma config dependency และ Next.js transitive dependencies (PostCSS/sharp). คำสั่งแก้แบบอัตโนมัติเป็น `--force` และเสนอการเปลี่ยน major/minor version นอก baseline จึงยังไม่รันโดยอัตโนมัติ; ต้องวาง upgrade/compatibility test ก่อน production.
