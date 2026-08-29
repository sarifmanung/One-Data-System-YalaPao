# One Data Implementation Status

อัปเดตล่าสุด: 29 สิงหาคม 2569 (2026)

เอกสารนี้เป็น checkpoint ของการลงมือทำตาม [Blueprint](../One%20Data%20System%20-%20Reimplementation%20Blueprint.md) และ [Architecture](../ARCHITECTURE.md) โดยแยกสิ่งที่ build/test แล้วออกจากสิ่งที่ยังไม่ควรนำไปใช้จริง

## ทำแล้วในรอบ Foundation

| Area | สถานะ | หลักฐาน |
| --- | --- | --- |
| Shared contract | เสร็จระดับ foundation | `packages/contracts`, contract version `1.3`, typed One Data capabilities, `PAPER_APPROVED` effective status, fixture ที่ไม่มี `CONFIRMED` |
| NestJS API | เสร็จระดับ foundation | `apps/api`, `/api/health/live`, `/api/health/ready`, `/api/v1/system/contract` |
| HTTP boundary | เสร็จระดับ foundation | request-id, API envelope, problem-details, validation configuration |
| Auth boundary | เสร็จระดับ local integration foundation | Portal HS256 token verification/exchange, issuer/audience/expiry/jti replay checks, opaque session token ที่เก็บเฉพาะ SHA-256 hash, secure httpOnly cookie และ development fallback ที่ปิดเป็นค่าเริ่มต้น |
| Tenant boundary | guard เสร็จระดับ session foundation | session workspace derive จาก active employee membership; `x-tenant-id` เลือกได้เฉพาะ workspace ที่ identity มีสิทธิ์ |
| Next.js web | เสร็จระดับ local development | `/tenant-dashboard`, `/leave`, `/auth/portal/launch`, runtime API health/current user และ server actions ของ Paper-first leave workflow ตาม reference direction |
| Docker | เสร็จระดับ local foundation | `docker-compose.target.yml`, API `3100`, web `3101`, แยกจาก Laravel compose |
| People master-data projection | เสร็จระดับ local integration foundation | `SpecialMasterDataClient`, transaction/idempotent upsert ด้วย source ID, effective membership, soft-inactivate และ `MasterDataSyncRun`; endpoint `POST /api/v1/people/sync/special` ยังรอ token/URL จริง |
| Authorization | เสร็จระดับ local integration foundation | Portal role/position → One Data capability allowlist, session permission snapshot, server-side route guard และ self/requester paper-result separation |
| Production security guard foundation | เสร็จระดับ local integration foundation | production config fail-fast, idle session timeout, secure-cookie validation, CSRF origin policy, security headers และ auth/mutation rate limit; distributed replay/revocation/edge limiter ยังไม่เสร็จ |
| Special leave snapshot adapter | เสร็จระดับ local integration foundation | prepare complete snapshot จาก `PAPER_APPROVED`, source hash/idempotency, immutable batch, service-token client, delivery history, retry metadata และ period/version acknowledgement guard; ยังไม่เปิด real-data delivery |
| Leave snapshot worker | เสร็จระดับ local integration foundation | API image มี `worker`/`worker:once`, MySQL named lock, retry due deliveries, optional previous-month cutoff orchestration และ affiliation-scoped system identity; ปิดด้วย `ONEDATA_WORKER_ENABLED=false` เป็นค่าเริ่มต้น |
| Prisma migration/deployment foundation | เสร็จระดับ local integration foundation | initial migration `20260829210000_initial_target_schema`, `migrate deploy`, production Compose template และ [deployment runbook](DEPLOYMENT_RUNBOOK.md); ตรวจ deploy/status กับ MySQL ชั่วคราวแล้ว แต่ยังไม่ baseline ฐานข้อมูลเดิมหรือ restore rehearsal |
| UAT/pilot operating foundation | เสร็จระดับ planning + local smoke | [UAT/Pilot/Cutover Plan](UAT_PILOT_CUTOVER_PLAN.md), test matrix, G0–G5 gate, reconciliation/rollback checklist และ `scripts/target-uat-smoke.sh`; local read-only smoke ผ่าน แต่ยังไม่มี staging/real-data pilot |
| Prisma/People/Leave vertical slice | เสร็จระดับ local development | schema + synthetic seed, People read, Leave `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED`, `CANCELLED/VOIDED`, provisional server-side day calculation, fixed-decimal requested days, holiday exclusion, active-request overlap guard, Paper-first UI/server actions และ durable audit/outbox |
| Regression checks | ผ่าน | target typecheck, target build, API 12 suites/42 tests, legacy Vite build, Docker health smoke และ browser workflow smoke ด้วยข้อมูลสังเคราะห์ |

## ยังไม่เสร็จและห้ามตีความว่า production-ready

- production backup/restore rehearsal และการอนุมัติ baseline ฐานข้อมูลเดิม (migration policy, initial migration และ runbook มีแล้ว)
- permission scope matrix แบบละเอียดครบทุกโมดูลและ delegated approver configuration (People/Leave capability guard รุ่นแรกทำแล้ว)
- production session hardening ที่ยังเหลือ เช่น distributed replay/revocation strategy, session rotation, proxy trust policy และ operational cleanup (idle timeout/CSRF origin/security headers/rate-limit foundation มีแล้ว)
- People import/reconciliation จาก Special-Allowances ด้วย URL/token จริง, real-data mapping และการ map Portal user กับ employee
- HR-approved leave Rulebook, quota/balance engine, half-day policy, complete snapshot และ production acceptance rules (provisional day calculation/state machine/revision/audit/outbox foundation มีแล้ว; ห้ามถือ provisional rule เป็นกฎสิทธิ์จริง)
- reconciliation UI, locked-period adjustment/correction contract และ production schedule approval (worker retry/monthly foundation มีแล้ว แต่ยังปิด scheduled delivery)
- document/DOCX, report access และ operational observability (leave UI เป็น form workflow แล้ว แต่ยังไม่มีการสร้าง Word/DOCX; backup/restore ยังต้องซ้อมใน staging/production-like environment)
- UAT กับข้อมูล/บัญชีจริงและ pilot 3 รพ.สต.
- staging restore rehearsal, real-data shadow run, owner sign-off และ pilot ตาม [UAT/Pilot/Cutover Plan](UAT_PILOT_CUTOVER_PLAN.md)

## คำสั่งตรวจซ้ำ

```bash
npm run target:typecheck
npm run target:test
npm run target:build
npm run build
docker compose -f docker-compose.target.yml up --build -d
# Production-like migration uses the controlled deploy command; see docs/DEPLOYMENT_RUNBOOK.md
DATABASE_URL="$ONEDATA_TARGET_DATABASE_URL" npm run target:db:migrate
# Read-only target smoke (set ONEDATA_UAT_WEB_URL for the web probe)
ONEDATA_UAT_BASE_URL=http://localhost:3100 ONEDATA_UAT_WEB_URL=http://localhost:3101 ./scripts/target-uat-smoke.sh
```

การทดสอบรอบนี้ใช้เฉพาะข้อมูลที่สร้างจาก fixture และ health/contract/session/master-data unit endpoints ไม่อ่านหรือส่งข้อมูลลับ และไม่เปลี่ยนแปลงฐานข้อมูลของ Laravel, Portal หรือ Special-Allowances. Sync endpoint จะปฏิเสธเมื่อยังไม่ตั้งค่า Special URL/token; session เก็บเฉพาะ hash ในฐานข้อมูลและไม่คืน raw token ใน JSON response.

## Security note

`npm audit --omit=dev --audit-level=high` รายงาน 6 high-severity advisories ใน Prisma config dependency และ Next.js transitive dependencies (PostCSS/sharp). คำสั่งแก้แบบอัตโนมัติเป็น `--force` และเสนอการเปลี่ยน major/minor version นอก baseline จึงยังไม่รันโดยอัตโนมัติ; ต้องวาง upgrade/compatibility test ก่อน production.
