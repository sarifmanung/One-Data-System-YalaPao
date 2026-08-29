# One Data Implementation Status

อัปเดตล่าสุด: 29 สิงหาคม 2569 (2026)

เอกสารนี้เป็น checkpoint ของการลงมือทำตาม [Blueprint](../One%20Data%20System%20-%20Reimplementation%20Blueprint.md) และ [Architecture](../ARCHITECTURE.md) โดยแยกสิ่งที่ build/test แล้วออกจากสิ่งที่ยังไม่ควรนำไปใช้จริง

## ทำแล้วในรอบ Foundation

| Area | สถานะ | หลักฐาน |
| --- | --- | --- |
| Shared contract | เสร็จระดับ foundation | `packages/contracts`, contract version `1.2`, typed One Data capabilities, `PAPER_APPROVED` effective status, fixture ที่ไม่มี `CONFIRMED` |
| NestJS API | เสร็จระดับ foundation | `apps/api`, `/api/health/live`, `/api/health/ready`, `/api/v1/system/contract` |
| HTTP boundary | เสร็จระดับ foundation | request-id, API envelope, problem-details, validation configuration |
| Auth boundary | เสร็จระดับ local integration foundation | Portal HS256 token verification/exchange, issuer/audience/expiry/jti replay checks, opaque session token ที่เก็บเฉพาะ SHA-256 hash, secure httpOnly cookie และ development fallback ที่ปิดเป็นค่าเริ่มต้น |
| Tenant boundary | guard เสร็จระดับ session foundation | session workspace derive จาก active employee membership; `x-tenant-id` เลือกได้เฉพาะ workspace ที่ identity มีสิทธิ์ |
| Next.js web | เสร็จระดับ shell + launch bridge | `/tenant-dashboard`, `/auth/portal/launch`, runtime API health/current user, responsive visual shell ตาม reference direction |
| Docker | เสร็จระดับ local foundation | `docker-compose.target.yml`, API `3100`, web `3101`, แยกจาก Laravel compose |
| People master-data projection | เสร็จระดับ local integration foundation | `SpecialMasterDataClient`, transaction/idempotent upsert ด้วย source ID, effective membership, soft-inactivate และ `MasterDataSyncRun`; endpoint `POST /api/v1/people/sync/special` ยังรอ token/URL จริง |
| Authorization | เสร็จระดับ local integration foundation | Portal role/position → One Data capability allowlist, session permission snapshot, server-side route guard และ self/requester paper-result separation |
| Prisma/People/Leave vertical slice | เสร็จระดับ local development | schema + synthetic seed, People read, Leave `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED`, `CANCELLED/VOIDED`, durable audit/outbox |
| Regression checks | ผ่าน | target typecheck, target build, API 5 suites/13 tests, legacy Vite build, local และ Docker smoke test |

## ยังไม่เสร็จและห้ามตีความว่า production-ready

- production Prisma migration/backup/restore policy (local schema + database แยกมีแล้ว)
- permission scope matrix แบบละเอียดครบทุกโมดูลและ delegated approver configuration (People/Leave capability guard รุ่นแรกทำแล้ว)
- production session hardening เช่น distributed replay/revocation strategy, CSRF policy, session rotation และ operational cleanup
- People import/reconciliation จาก Special-Allowances ด้วย URL/token จริง, real-data mapping และการ map Portal user กับ employee
- Leave quota/policy engine, complete snapshot และ production acceptance rules (state machine/revision/audit/outbox foundation มีแล้ว)
- Special-Allowances adapter, retry/outbox, monthly cutoff/locked-period adjustment และ reconciliation UI
- worker process, document/DOCX, report access, backup/restore และ operational observability
- UAT กับข้อมูล/บัญชีจริงและ pilot 3 รพ.สต.

## คำสั่งตรวจซ้ำ

```bash
npm run target:typecheck
npm run target:test
npm run target:build
npm run build
docker compose -f docker-compose.target.yml up --build -d
```

การทดสอบรอบนี้ใช้เฉพาะข้อมูลที่สร้างจาก fixture และ health/contract/session/master-data unit endpoints ไม่อ่านหรือส่งข้อมูลลับ และไม่เปลี่ยนแปลงฐานข้อมูลของ Laravel, Portal หรือ Special-Allowances. Sync endpoint จะปฏิเสธเมื่อยังไม่ตั้งค่า Special URL/token; session เก็บเฉพาะ hash ในฐานข้อมูลและไม่คืน raw token ใน JSON response.

## Security note

`npm audit --omit=dev --audit-level=high` รายงาน 6 high-severity advisories ใน Prisma config dependency และ Next.js transitive dependencies (PostCSS/sharp). คำสั่งแก้แบบอัตโนมัติเป็น `--force` และเสนอการเปลี่ยน major/minor version นอก baseline จึงยังไม่รันโดยอัตโนมัติ; ต้องวาง upgrade/compatibility test ก่อน production.
