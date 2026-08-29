# One Data System — Migration Plan

## Laravel + Vue/Inertia → NestJS + Next.js

- สถานะ: Target migration plan — Phase 0/1 foundation เริ่มใช้งานแบบ coexistence แล้ว; domain migration ยังไม่เริ่ม cutover
- วันที่: 29 สิงหาคม 2569 (2026)
- เจ้าของระบบ: One Data System / Yala PAO
- เอกสารที่เกี่ยวข้อง: [Blueprint](../One%20Data%20System%20-%20Reimplementation%20Blueprint.md), [Architecture](../ARCHITECTURE.md), [Integration Contract](INTEGRATION_CONTRACT.md)

> Deployment และฐานข้อมูล target ให้ใช้ [Controlled Deployment Runbook](DEPLOYMENT_RUNBOOK.md) ร่วมกับแผนนี้ โดยห้ามใช้ `prisma db push` กับ production database.

เอกสารนี้กำหนดวิธีเปลี่ยน stack ของ One Data จาก current implementation ที่เป็น Laravel 11 + Vue 3/TypeScript/Inertia ไปเป็น target architecture ที่เป็น NestJS + Next.js/TypeScript โดยรักษา business boundary, ข้อมูลที่ตรวจสอบย้อนหลังได้ และการเชื่อมกับ Portal/Special-Allowances ให้ต่อเนื่อง

## Implementation checkpoint — 29 สิงหาคม 2569

มี target workspace ที่ build และรันได้แยกจากระบบเดิมแล้ว:

- `apps/api` และ `apps/web` ใช้ NestJS/Next.js ตาม target stack โดยยังไม่เปลี่ยน route ownership ของ Laravel
- `packages/contracts` ล็อก API/permission/leave status metadata v1.4
- API smoke tests ตรวจ health, contract metadata, request-id, security headers และ deny-by-default `/api/v1/me`
- Portal launch-token verifier/exchange ตรวจ HS256 signature, issuer, audience, expiry, required claims และ replay ภายใน process แล้วสร้าง local session แบบ opaque ที่เก็บเฉพาะ hash พร้อม permission snapshot จาก role/position allowlist; Next.js มี launch bridge ที่ `/auth/portal/launch` สำหรับ local integration แต่ยังไม่ใช่ production cutover
- `docker-compose.target.yml` สร้าง API/web image แยกที่พอร์ต `3100/3101`; ใช้ฐานข้อมูล development แยกและยังไม่ผูกข้อมูลจริง. API มี production config validation, idle session timeout, CSRF origin policy และ per-process rate-limit foundation แล้ว แต่ยังไม่ใช่ production security sign-off

จุดนี้เป็นการสร้างทางเดิน migration ไม่ใช่การประกาศว่า People/Leave พร้อม cutover. Prisma schema, local development database, synthetic seed, initial migration, production Compose template และ [deployment runbook](DEPLOYMENT_RUNBOOK.md) เริ่มทำแล้ว; People read/create, Leave Paper-first state-transition slice, provisional server-side day calculation/overlap guard, Next.js leave page/server actions, local Portal session exchange, capability guard, production security guard foundation, Special master-data projection boundary, Special leave snapshot adapter และ worker foundation เริ่มทำแล้ว. Adapter ทำ prepare/deliver แบบเก็บ batch immutable, idempotency/source hash, employee rows ครบ scope และ retry metadata; worker มี database lock, retry due delivery, approved schedule gate, reconciliation API/UI และ optional monthly orchestration แต่ยังปิด scheduled delivery และยังไม่ real-data cutover. Initial migration ผ่านการตรวจ deploy/status กับ MySQL ชั่วคราวแล้ว แต่ยังต้องทำ baseline ฐานข้อมูลเดิม, staging/restore rehearsal และ data-owner approval. Provisional rule ยังไม่ใช่ HR Rulebook และยังไม่มี quota engine. ขั้นถัดไปคือ UAT/pilot, permission scope/delegation ที่ละเอียดขึ้น, distributed session/replay policy, ตั้งค่าและ dry-run real People import, production reconciliation/alerting และ contract test กับ Special ก่อนเปิด write endpoint ให้ผู้ใช้จริง.

## 1. คำตัดสินหลัก

| เรื่อง | คำตัดสิน |
| --- | --- |
| Business architecture | Modular Monolith; ไม่แยก People, Leave หรือ Integration เป็น microservice ในรอบแรก |
| Repository | ใช้ repository/workspace เดียวได้ เพื่อให้ทีม 2 คนดูแล contract และ shared packages ร่วมกัน |
| Deployable process | แยก `web`, `api` และ worker ได้ แม้อยู่ใน repository เดียว |
| Backend | NestJS + TypeScript เป็นเจ้าของ domain use case, authorization, transaction และ REST API |
| Frontend | Next.js + TypeScript + App Router เป็น presentation layer; ไม่มี business authority อยู่ที่ browser |
| Database | ใช้ฐานข้อมูล One Data แยกจาก Portal และ Special-Allowances; ไม่อ่าน/เขียนฐานข้อมูลข้ามระบบ |
| Data access | Prisma เป็น default ORM พร้อม migration ที่ review ได้; ใช้ parameterized SQL/read model สำหรับรายงานที่เหมาะสม |
| Authentication | Portal ยังคงเป็น identity/SSO entry; NestJS ตรวจ launch token และออก secure httpOnly local session |
| Integration | คง versioned REST contract, complete snapshot, idempotency, source hash และ reconciliation |
| Cutover | ใช้ strangler migration แบบ coexistence และ feature flag; ห้าม big-bang cutover ที่ไม่มี rollback |

## 2. เป้าหมายและสิ่งที่ไม่ทำ

### เป้าหมาย

- ให้ target UX/UI ของระบบอ้างอิงทำได้ด้วย shared Next.js shell และ workspace context เดียวกัน
- ย้าย People/Organization, Leave และ Special-Allowances integration โดยไม่ทำให้ข้อมูลหรือสถานะใบลาขาดช่วง
- ทำให้ API เป็น contract กลางสำหรับ web, worker, Portal และ integration ในอนาคต
- รักษา scope ระดับ `affiliation` และ `tenant` ให้ตรวจสอบได้ใน server ทุกคำขอ
- เปิดให้เพิ่ม Vehicles, Stock, Assets, Finance และโมดูลใหม่ภายหลังโดยไม่รื้อ platform

### ไม่ทำใน migration รอบแรก

- ไม่ย้ายทุกโมดูลของระบบอ้างอิงให้เสร็จก่อนเปิดใช้ People/Leave
- ไม่คัดลอก Laravel controller, Blade/Inertia page หรือ Vue component แบบ line-by-line
- ไม่ย้ายสูตรและ calculation engine ของ ฉ.10/11 มาไว้ใน One Data
- ไม่เชื่อมฐานข้อมูลของ `Special-Allowances`, `carbooking-yala-pao` หรือ Portal โดยตรง
- ไม่สร้าง online leave approval, digital signature หรือ Word template จริงจนกว่าจะมี rulebook/แบบฟอร์มที่เจ้าของรับรอง

## 3. ภาพปัจจุบันและภาพเป้าหมาย

### Current baseline

```text
Laravel 11 application
├── PHP controllers / services / Eloquent models
├── Inertia responses
├── Vue 3 + TypeScript pages
├── Laravel session/auth middleware
├── MySQL + database queue/outbox
└── Special-Allowances REST adapter
```

Repository ปัจจุบันมี foundation ของ tenant, affiliation, person, external mapping, leave revision, export batch, audit และ outbox รวมทั้งหน้า dashboard, People, Leave และ integration slice แต่ยังไม่ใช่ implementation ครบทุกโมดูลของระบบอ้างอิง

### Target baseline

```text
One Data workspace
├── apps/web
│   └── Next.js + TypeScript + App Router
├── apps/api
│   └── NestJS + TypeScript + REST/OpenAPI
├── apps/worker
│   └── NestJS worker หรือ API image ที่ใช้ worker command
└── packages
    ├── contracts   OpenAPI / DTO schemas / generated types
    ├── ui          shared design-system และ table/form primitives
    ├── config      TypeScript, lint, format และ test config
    └── domain      เฉพาะ shared value types ที่ไม่ผูกกับ persistence
```

`apps/web` ไม่ควร import Prisma หรือเข้าฐานข้อมูลโดยตรง. `apps/api` เป็นจุดเดียวที่ตัดสิน authorization, scope, transition, transaction และ audit. `packages/contracts` แชร์ชนิดข้อมูลเพื่อป้องกัน web/API drift แต่ไม่ควรย้าย business rule ที่ต้องป้องกันไว้ใน server ไปไว้ใน package ฝั่ง browser

## 4. ขอบเขตโมดูลของ NestJS API

```text
apps/api/src/modules
├── platform
│   ├── auth
│   ├── session
│   ├── authorization
│   ├── audit
│   ├── files
│   └── outbox
├── organization
│   ├── affiliations
│   ├── tenants
│   ├── work-groups
│   └── memberships
├── people
│   ├── persons
│   ├── employees
│   ├── employment-history
│   └── external-mappings
├── leave
│   ├── leave-types
│   ├── policies
│   ├── holidays
│   ├── requests
│   ├── quota
│   └── snapshots
├── documents
│   ├── templates
│   ├── render-runs
│   └── artifacts
└── integrations
    └── special-allowances
```

ทุก module ใช้รูปแบบเดียวกัน:

```text
module/
├── domain/       entities, value objects, transition rules
├── application/  commands, queries, DTOs, ports
├── infrastructure/ repositories, Prisma adapters, external clients
└── presentation/ controllers, serializers, OpenAPI decorators
```

Controller รับ request และส่งต่อ use case เท่านั้น. การ query ต้องผ่าน repository/read model ที่ได้รับ scope แล้ว. โมดูลหนึ่งไม่ควรแก้ตารางของอีกโมดูลโดยตรง

## 5. แผน migration แบบเป็นระยะ

### Phase 0 — Freeze contract และเตรียม rollback

ผลลัพธ์ที่ต้องได้ก่อนเขียน feature ใหม่:

- ยืนยัน source of truth: Special เป็น master projection ในช่วง migration, One Data เป็น owner ของ leave source
- ยืนยัน leave state: `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED`; ใช้ `CANCELLED/VOIDED` สำหรับรายการที่ไม่มีผล และเฉพาะ `PAPER_APPROVED` ที่ยังมีผลส่ง snapshot
- แช่แข็ง Integration Contract v1.1 และทำตัวอย่าง payload/response/error ให้ครบ
- สร้าง data dictionary จาก Laravel migrations/models โดยแยก `business invariant` ออกจาก implementation detail
- กำหนด feature flag ราย capability และ route ownership ว่า Laravel หรือ Nest/Next เป็นผู้ให้บริการ
- ทำ backup/restore และ migration dry run บนฐานข้อมูลสำเนา ไม่ใช้ production database เป็นสนามทดลอง

Exit criteria:

- สามารถ rollback web/API รุ่นใหม่ได้โดยไม่ทำให้ Laravel เดิมเสียหาย
- มี baseline count/hash ของ people, memberships, leaves, revisions, mappings, batches และ audit ที่ตรวจซ้ำได้
- มี owner ของแต่ละ contract และผู้อนุมัติการ cutover

### Phase 1 — สร้าง NestJS API foundation

- สร้าง NestJS app, configuration validation, structured error envelope, correlation ID และ health/readiness endpoint
- เชื่อม MySQL ผ่าน Prisma ในฐานข้อมูลแยกของ One Data
- สร้าง session, Portal launch-token exchange, scope context และ permission guard
- ทำ audit/outbox abstraction และ transaction boundary
- เปิด `GET /api/v1/me`, `GET /api/v1/workspaces` และ health endpoint แบบ read-only ก่อน
- ทำ OpenAPI document ใน CI และ contract test กับ consumer ที่กำหนด

ห้ามเปิด write endpoint จริงจน tenant isolation, auth, audit และ error handling ผ่าน test ขั้นต่ำ

### Phase 2 — สร้าง Next.js shell

- สร้าง root layout, typography, color token, sidebar, header, notification, responsive breakpoint และ empty/loading/error state
- ทำ workspace switcher ระหว่าง `tenant` และ `affiliation`
- ให้ navigation แสดงตาม capability ที่ API คืนมา แต่การซ่อนเมนูไม่ใช่การป้องกันสิทธิ์
- ทำ server-side request helper ไปยัง same-origin `/api/v1` และไม่เก็บ access/launch token ใน localStorage
- สร้าง component primitive สำหรับ card, table, filter, drawer, modal, confirmation และ form error
- ทำ dashboard read-only ให้เทียบกับ visual direction ของระบบอ้างอิงก่อนเพิ่ม mutation

### Phase 3 — ย้าย People/Organization

- เพิ่ม read projection จาก Special: affiliation/tenant, employee, position, employment start และ external IDs
- ใช้ `source_system`, `source_id`, `source_revision`, `source_updated_at` และ `last_seen_at` เพื่อ reconciliation
- แยก `person`, `employee`, `membership` และ `employment/job history`; ห้ามใช้ชื่อหรือ PII เป็น primary identity
- ย้าย create/edit/disable/merge ให้เป็น application command ที่ atomic และ idempotent
- ทำ import report: inserted, updated, unchanged, disabled, unmapped, conflict และ rejected
- เปรียบเทียบยอดและ hash ระหว่าง Laravel projection, Special source และ Nest projection

ช่วงแรกอาจให้ Laravel เป็น read/write owner ของหน้าจอเดิม และให้ Nest อ่านจาก projection สำเนาเพื่อ shadow compare. ห้ามให้สองระบบเขียน aggregate เดียวกันโดยไม่มี owner ชัดเจน

### Phase 4 — ย้าย Leave MVP

- ย้าย leave types, policy profile, holiday calendar, request/revision และ quota read model
- คำนวณวันลาที่ server จาก date range, holiday/weekend policy และ leave rule ที่ versioned
- ตรวจ overlap, scope, employee active membership และ transition ก่อน commit
- ทำ `DRAFT`, `SUBMITTED`, `PAPER_APPROVED`, `PAPER_REJECTED`, `CANCELLED`, `VOIDED` พร้อม actor, reason, timestamp และ revision; `CONFIRMED` ไม่ใช้ใน target state machine
- สร้าง UI รายการ/ปฏิทิน/ฟอร์มบน Next.js ให้ใช้ state จาก API ไม่คำนวณยอดสำคัญเอง
- เก็บ document boundary ไว้รองรับ Word/PDF ภายหลัง; MVP ยังรอแบบฟอร์มจริงและ rulebook ตาม owner decision

### Phase 5 — ย้าย Special-Allowances integration

- ย้าย master-data client และ leave-snapshot client มาอยู่ใน NestJS integration module
- ใช้ service credential แยกจาก Portal session และส่ง `Idempotency-Key`, correlation ID, source cutoff/hash
- สร้าง batch/item/delivery/retry/reconciliation read model ใน One Data
- ตรวจ unmapped employee, invalid leave type, period state และ locked-period response ก่อนส่งจริง
- เริ่มด้วย dry-run, shadow snapshot และ compare response ก่อนเปิด live write
- ให้ Special เป็นเจ้าของสูตร, period, lock/adjustment, result และ report ตลอด migration

### Phase 6 — Pilot และ cutover

1. ทีมภายในใช้ synthetic fixture และทดสอบ 1 tenant
2. pilot 3 รพ.สต. โดยเปิด Next.js/NestJS เฉพาะ People/Leave/Special
3. ขยายเป็น 10 แห่งหลังผ่าน reconciliation และ support exit criteria
4. ขยายครบ 38 แห่งเมื่อ data migration, aggregate และ transfer fixture ผ่าน
5. ปิด Laravel route เฉพาะ capability ที่ย้ายแล้ว ไม่ปิดทั้งระบบในครั้งเดียว
6. เก็บ read-only archive/log ของระบบเดิมตาม retention policy ก่อน decommission

## 6. กลยุทธ์ route และ feature cutover

| Capability | ระยะเริ่มต้น | ระยะ cutover |
| --- | --- | --- |
| Portal launch/SSO | Laravel ปัจจุบันเป็น reference | NestJS ตรวจ token + local session |
| Dashboard | เทียบข้อมูล Laravel กับ Nest read model | Next.js อ่าน Nest API |
| People | current UI/reference + shadow projection | Next.js write ผ่าน NestJS command |
| Leave | current workflow เป็น baseline | Next.js write ผ่าน NestJS state machine |
| Special snapshot | contract เดิมเป็น reference | NestJS worker เป็นผู้ส่งจริงเพียงรายเดียว; worker foundation มีแล้วแต่ยังปิด scheduled delivery |
| Reports/documents | ใช้ artifact/route เดิมที่ยังจำเป็น | ย้ายทีละ report หลัง source/query ผ่าน contract |
| Vehicles/Stock/Assets/Finance | ยังแยก/ยังไม่เริ่ม | เพิ่มเป็น module ภายหลังตาม priority |

กติกา cutover:

- capability หนึ่งต้องมี write owner เพียงระบบเดียว
- read shadow ทำได้ แต่ต้องติดป้ายว่าไม่ใช่ source of truth
- feature flag ต้องมี audit และ kill switch
- migration job ต้อง rerun ได้โดยไม่สร้างข้อมูลซ้ำ
- ก่อนเปลี่ยน write owner ต้องหยุด write ชั่วคราวสั้น ๆ, backup, reconcile และประกาศหน้าต่าง cutover

## 7. แผนย้ายข้อมูล

### 7.1 ตาราง/aggregate ที่ต้องย้ายหรือ map

| Current Laravel concept | Target concept | วิธี |
| --- | --- | --- |
| users / portal fields | identities + local sessions | ไม่ย้าย password เป็น source; map external identity และสร้าง session ใหม่ |
| affiliations / tenants | organization hierarchy | map ด้วย stable external code, ไม่ใช้ชื่อเป็น key |
| persons / employees | people + employees | preserve IDs ผ่าน legacy reference และสร้าง target UUID/ID |
| tenant memberships | effective-dated memberships | สร้าง history พร้อม `valid_from/valid_to` |
| external ID mappings | integration mappings | unique ตาม source system + source ID + entity type |
| leave requests | leave requests + current revision | แปลง status ผ่าน explicit mapping และเก็บ legacy status |
| leave revisions | immutable revision history | ตรวจ checksum/actor/time และไม่ overwrite historical row |
| leave export batches/items | integration batches/deliveries | preserve idempotency/source hash/delivery result |
| audit events | audit log | map actor/resource/action; redaction ก่อนนำเข้า |
| outbox events | ไม่ย้ายเป็น pending โดยตรง | ย้ายเฉพาะ event ที่ reconcile แล้วหรือ mark as historical |

### 7.2 หลักการ migration

- ใช้ staging tables หรือ import schema เพื่อ validate ก่อนเขียน target tables
- ทุก record มี `legacy_source` และ `legacy_id` สำหรับ traceability
- แปลงวันที่/เวลาให้ระบุ timezone และแยกปี พ.ศ./ค.ศ. ที่แสดงผลออกจาก canonical date
- ห้ามนำ secret, password hash ที่ไม่จำเป็น หรือ PII ลง log
- ตัวเลขเงิน/อัตรา/จำนวนวันใช้ decimal policy ที่กำหนด ไม่แปลงผ่าน binary float
- ตรวจ duplicate, orphan, unmapped, invalid date, invalid membership และ overlap ก่อน cutover
- ทำ report `source_count`, `target_count`, `matched`, `missing`, `extra`, `conflict`, `hash_mismatch`

### 7.3 Acceptance ของข้อมูล

- บุคลากร active และ inactive ตรงกับ source ที่ cutoff เดียวกัน
- ทุก leave ที่มีผลมี person/employee/membership mapping ครบ
- การคำนวณวันลาของกรณีตัวอย่างตรงกับ expected fixture
- complete snapshot ที่สร้างจาก target มี row count/source hash ตามที่ตรวจรับ
- rerun migration ให้ผลเหมือนเดิมและไม่เพิ่ม duplicate

## 8. SSO และ session migration

1. Portal ส่ง short-lived signed launch token ไปยัง One Data target entry point
2. NestJS ตรวจ `iss`, `aud`, `exp`, `jti`, signature และ replay protection
3. NestJS map `sub` ไปยัง local identity และ person/employee mapping ที่ผ่านการตรวจ
4. NestJS ออก secure, httpOnly, same-site session cookie
5. Next.js เรียก API ด้วย session เดิม; permission/scope ถูกประเมินซ้ำใน NestJS
6. หาก mapping ไม่ครบ ให้เข้า restricted onboarding/mapping state ไม่สร้างบุคลากรซ้ำจากชื่อ

ในช่วง coexistence ควรใช้ Portal เป็นจุดเข้าเดียว และกำหนด return URL ของแต่ละ capability ให้ชัด. Local development login อาจคงไว้เฉพาะ profile development และต้องปิด/จำกัดเมื่อเข้า UAT/production

## 9. API และ contract migration

### หลักการ

- `/api/v1` เป็น public application API สำหรับ Next.js และ approved consumers
- `/internal/api/v1` เป็น service-to-service contract สำหรับ Special/worker ที่มี credential และ scope แยก
- response มี stable envelope, error code, correlation ID และ validation details ที่ไม่เปิด secret/PII เกินจำเป็น
- command ที่มีผลข้างเคียงใช้ชื่อชัด เช่น `/confirm`, `/cancel`, `/sync`, `/send` และตรวจ idempotency
- OpenAPI เป็น artifact ที่ review และ test ได้ ไม่สร้าง type จาก implementation แบบอัตโนมัติโดยไม่มีการตรวจ

worker ใช้ `npm run worker:once -w @onedata/api` สำหรับ manual run หรือ `npm run worker -w @onedata/api` สำหรับ loop ตาม interval. ต้องเปิด `ONEDATA_WORKER_ENABLED=true` เฉพาะ environment ที่ผ่านการอนุมัติ; monthly orchestration เปิดเพิ่มด้วย `ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED=true`. ทุก run จำกัด scope ด้วย affiliation และใช้ MySQL named lock เพื่อไม่ให้หลาย process ส่ง batch เดียวกันพร้อมกัน.

### API compatibility

ระหว่าง migration ให้รักษา payload semantics เดิมของ [Integration Contract](INTEGRATION_CONTRACT.md) ก่อนเปลี่ยนชื่อ/รูปแบบ. ถ้าต้องเพิ่ม field ให้ additive และ version เมื่อเปลี่ยน meaning. ห้ามให้ Laravel และ Nest ส่ง leave snapshot ของ period เดียวกันพร้อมกัน

## 10. Test strategy

### API/domain

- unit: state transition, quota, calendar, decimal, mapping และ policy
- integration: Prisma transaction, unique constraint, rollback, outbox และ idempotency
- authorization: deny-by-default, tenant/affiliation isolation และ role/capability matrix
- contract: OpenAPI schema, Special request/response, error/locked-period และ retry

### Web/E2E

- Portal launch → local session → workspace switch
- dashboard baseline และ empty/loading/error states
- employee onboarding success/failure rollback
- leave create/confirm/cancel/void, overlap, holiday/weekend และ quota
- snapshot prepare/send/retry/reconciliation
- responsive UX สำหรับ desktop/tablet/mobile ที่ผู้ใช้จริงใช้

### Migration/reconciliation

- migration dry run ซ้ำหลายครั้ง
- source/target count and hash
- shadow read comparison
- rollback หลัง cutover capability เดียว
- fixture 1 tenant/12 คน และ fixture เป้าหมาย 38 tenants/267 people

### Anti-requirement regression

ทุกข้อใน `REF-DEF-001–012` และผล audit v1.7 ต้องมี negative test หรือ acceptance test ที่อ้างอิงได้ โดยเฉพาะ partial save, self-approval, float artifact, silent save, cascade deletion, stale summary และ cross-scope access

## 11. Deployment topology

```text
Reverse Proxy / TLS
├── /              → onedata-web (Next.js)
├── /api           → onedata-api (NestJS)
└── /internal      → service routes / restricted API policy

Shared private Docker network
├── onedata-web
├── onedata-api
├── onedata-worker
├── one_data MySQL database/user
├── optional Redis/BullMQ when enabled
└── Special-Allowances API/database boundary
```

- web/API/worker ใช้ image และ release tag ที่ระบุได้
- worker ต้องไม่รันซ้ำหลาย instance โดยไม่มี job lock/idempotency
- secret อยู่ใน deployment secret store หรือ `.env` ที่ไม่ commit
- readiness ต้องตรวจ dependency ที่จำเป็น และ liveness ต้องไม่ทำให้ database ถูกเขียน
- migration ของ schema ทำแบบ controlled step ก่อนเปิด application version ใหม่
- backup/restore และ log retention ต้องทดสอบแยกตาม application boundary

## 12. ความเสี่ยงและวิธีลดความเสี่ยง

| ความเสี่ยง | ผลกระทบ | วิธีลด |
| --- | --- | --- |
| เขียนสองระบบพร้อมกัน | duplicate/ข้อมูลขัดกัน | กำหนด single write owner และ feature flag |
| Prisma schema ต่างจาก Laravel | migration ข้อมูลผิด | ใช้ data dictionary, staging, count/hash และ dry run |
| Next UI คิด rule เอง | quota/status ผิด | API เป็น authority, client validation เป็นเพียง UX |
| SSO mapping ไม่ครบ | ผู้ใช้เข้าระบบไม่ได้/สร้างคนซ้ำ | external ID mapping queue และ restricted state |
| API contract drift | snapshot ล้มเหลว | OpenAPI + contract test + additive versioning |
| ทีม 2 คนรับ scope ใหญ่เกินไป | ส่งมอบช้า/คุณภาพตก | เปิดเฉพาะ People/Leave/Special ก่อน, โมดูลอื่นแยก backlog |
| ใช้ Redis/worker เร็วเกินจำเป็น | operation ซับซ้อน | เริ่มจาก outbox/database job แล้ววัด workload |
| cleanup/rollback ไม่ครบ | official data สูญหาย | archive/void/reversal, backup และ rollback rehearsal |

## 13. Definition of Done ของการย้าย

การย้าย capability ใดถือว่าเสร็จเมื่อ:

- API, authorization, audit และ transaction tests ผ่าน
- Next.js UI ใช้ API target และไม่มี database access ฝั่ง web
- source/target reconciliation ผ่านตามเกณฑ์ของ capability
- มี runbook deploy, rollback, monitoring และ support
- ไม่มี write path เก่าที่ทำงานพร้อมกันโดยไม่ได้รับการควบคุม
- ผ่าน UAT ของผู้ใช้จริงใน scope ที่กำหนด
- มีเอกสาร data ownership และ operational owner

การย้ายทั้งระบบถือว่าเสร็จเมื่อ People/Organization, Leave และ Special integration ผ่าน pilot ครบ 38 แห่ง, outstanding reconciliation เป็นศูนย์หรือมี waiver ที่อนุมัติ, และระบบเดิมถูกลดบทบาทเป็น archive/retirement ตามแผน

## 14. ลำดับงานที่ควรทำถัดไป

1. อนุมัติเอกสาร Blueprint/Architecture/Migration Plan ชุดนี้
2. ตรวจ current Laravel migrations/models กับ source ของ Special และ Portal ให้ได้ data dictionary ที่ตรงกัน
3. ล็อก OpenAPI/Integration Contract v1 และ error codes
4. สร้าง target workspace + NestJS health/API skeleton + Next.js shell แบบ read-only
5. ทำ fixture 1 tenant/12 คน แล้วเพิ่ม fixture 38 tenants/267 people สำหรับ reconciliation
6. ย้าย auth/workspace scope ก่อน People write
7. ย้าย People แล้วจึงย้าย Leave และ snapshot integration
8. ทำ pilot/rollback rehearsal ก่อนเปิดให้ผู้ใช้งานจริง

จนกว่าจะผ่าน Phase 0–1 ไม่ควรขยาย current Laravel/Vue ด้วยโมดูลใหม่จำนวนมาก เพราะจะเพิ่มงานย้ายและทำให้มี business rule สองชุด. โค้ดปัจจุบันใช้เป็น reference, fixture source และ migration safety net ต่อไป
