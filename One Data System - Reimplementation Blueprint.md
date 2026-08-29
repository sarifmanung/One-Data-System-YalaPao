# One Data System — Reimplementation Blueprint

เอกสารวิเคราะห์ระบบเพื่อการสร้างใหม่แบบ Clean-Room

- เวอร์ชันเอกสาร: 1.31 — Edge Gateway & Observability Gate Checkpoint
- แก้ไขล่าสุด: 30 สิงหาคม 2569 (2026)
- วันที่สำรวจ: 10–11 สิงหาคม และ 29 สิงหาคม 2569 (2026)
- ขอบเขตที่สำรวจ: หน่วยงาน รพ.สต. 1 แห่ง และสังกัดระดับองค์การบริหารส่วนจังหวัดที่เชื่อมกัน
- บัญชีที่ใช้สำรวจ: บัญชีผู้ดูแลระบบซึ่งมองเห็นทั้งขอบเขต “หน่วยงาน” และ “สังกัด”
- วิธีสำรวจ: ใช้งานหน้าจอตามปกติใน Chrome ทั้ง read-only discovery และ end-to-end mutation ด้วยข้อมูลสังเคราะห์ในระบบทดลองที่เจ้าของอนุญาต ครอบคลุม create/edit/approve/reject/cancel/delete/activate/lock-toggle ตาม workflow ที่เข้าถึงได้ รวมถึงการตรวจ UX/UI, tenant/affiliation workspace, เอกสาร/รายงาน และการกระจายประกาศ
- ข้อจำกัดความปลอดภัย: ใช้ข้อมูลสังเคราะห์ที่มี tag เฉพาะ, ไม่แก้ระเบียนจริงที่มีอยู่ก่อน, คืนค่าการตั้งค่า/วงรอบและล้างระเบียนทดสอบที่ลบได้, ไม่ตรวจ cookie/token/local storage และไม่นำข้อมูลส่วนบุคคลมาใส่ในเอกสาร; หลัง audit รอบ 29 สิงหาคมตรวจยืนยันว่า marker ถูกล้างครบและ dashboard กลับสู่ baseline บุคลากร 12 คน, ปฏิบัติงาน/ลา/ไปราชการวันนี้ 0 รายการ โดยไม่แตะประวัติเดิมของระบบ

## Revision History

| Version | วันที่       | การเปลี่ยนแปลง                                                                                                                                                                                                                                                                   |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 10 ส.ค. 2569 | Clean-room discovery, screen/API inventory และ reimplementation blueprint ฉบับแรก                                                                                                                                                                                                |
| 1.1     | 10 ส.ค. 2569 | เพิ่มข้อมูลเป้าหมาย: อบจ.ยะลา, รพ.สต. 38 แห่ง และบุคลากร 267 คน                                                                                                                                                                                                                  |
| 1.2     | 10 ส.ค. 2569 | ปรับลำดับพัฒนาเป็น People/Organization Core → Leave → ฉ.10/11 → Excel/Report และเพิ่ม Calculation Run/Snapshot/Pilot rollout                                                                                                                                                     |
| 1.3     | 10 ส.ค. 2569 | ทดสอบซ้ำแบบไม่เปลี่ยนข้อมูล: ยืนยันโครงสร้างประวัติการทำงานที่ใช้กับ ฉ.11, control การพิจารณาใบลา, วงจรไปราชการ และ parameters ของรายงาน ฉ.11; ระบุช่องว่างว่าไม่พบ ฉ.10 ใน catalog ระบบอ้างอิง                                                                                  |
| 1.4     | 11 ส.ค. 2569 | ทดสอบ mutation แบบ end-to-end ด้วยข้อมูลสังเคราะห์ใน People, Leave/Duty, Schedule, Inventory, Assets, Vehicles, Finance gate, Settings และ Announcement; เพิ่มกฎที่ยืนยันจริง, defect/anti-requirement register, transactional/SoD/decimal/reversal guardrails และบันทึก cleanup |
| 1.5     | 29 ส.ค. 2569 | ปิดทิศทาง MVP เป็น People Core + ระบบลาแบบ Word-first/ลงนามกระดาษ + เชื่อมระบบ Special-Allowances เดิมผ่าน API; เพิ่มฐานประกาศการลา อบจ. พ.ศ. 2569, paper-result verification, SSO Portal boundary, cutoff/lock/adjustment policy และตัดการสร้าง calculation engine ซ้ำใน One Data |
| 1.6     | 29 ส.ค. 2569 | ปรับ implementation baseline ตามคำตัดสินล่าสุด: People/Organization + ระบบลาแบบเรียบง่าย + Special API ก่อน; เลื่อน Word/paper-result และ online approval; กำหนด `CONFIRMED` เป็นสถานะที่มีผล, complete reset snapshot, API master-data และ One Data เป็นผู้ส่ง snapshot |
| 1.7     | 29 ส.ค. 2569 | สำรวจซ้ำแบบละเอียดทั้งสอง workspace และ workflow ที่เข้าถึงได้, ยืนยัน UX/UI เป้าหมายและ cleanup baseline; ล็อก target stack เป็น NestJS + Next.js, แยก current Laravel/Vue baseline ออกจาก migration target และเพิ่มแผนย้ายระบบแบบ incremental |
| 1.8     | 29 ส.ค. 2569 | ล็อก workflow ใบลาแบบ Paper-first: `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED`, ใช้ `PAPER_APPROVED` เป็นสถานะมีผลเพียงสถานะเดียว, เลิกใช้ `CONFIRMED` เป็นสถานะปฏิบัติการ และปรับเอกสาร/สัญญา integration ให้สอดคล้องกัน |
| 1.9     | 29 ส.ค. 2569 | เริ่ม implementation target workspace แบบ coexistence: เพิ่ม shared contracts v1.1, NestJS API/Next.js web foundation, SSO verifier, API envelope, request-id, tenant-context boundary, audit sink, Docker Compose แยก และ automated smoke tests โดยคง Laravel/Vue เดิมไว้ |
| 1.10    | 29 ส.ค. 2569 | เพิ่ม Portal launch-token exchange, local session แบบ opaque/hash, session guard, logout, Next.js launch bridge และทดสอบการ map external identity → employee → active workspace โดยยังไม่เปิดใช้ข้อมูลจริง |
| 1.11    | 29 ส.ค. 2569 | เพิ่ม Special-Allowances master-data projection boundary: validated client, source-ID upsert, effective membership, soft-inactivate, durable sync run และ admin sync endpoint โดยยังไม่ตั้งค่า source/token จริง |
| 1.12    | 29 ส.ค. 2569 | เพิ่ม One Data capability permission allowlist จาก Portal role/position, session permission snapshot, server-side route guard สำหรับ People/Leave และบังคับ SoD สำหรับผู้บันทึกผลใบลากระดาษ; เพิ่ม contract version 1.2 |
| 1.13    | 29 ส.ค. 2569 | เพิ่ม provisional server-side leave calculation: working/calendar-day mode, holiday exclusion, fixed two-decimal requested days, date-range validation, active-request overlap guard และ calculation basis; ย้ำว่ายังไม่ใช่ HR Rulebook หรือ quota engine ที่รับรองแล้ว |
| 1.14    | 29 ส.ค. 2569 | เพิ่ม Next.js Paper-first leave page และ server actions สำหรับสร้าง/ส่ง/ยกเลิกใบลา บันทึกผลเอกสารกระดาษ และ void; เพิ่ม automated workflow tests และ browser smoke test บน Docker target โดย cleanup ข้อมูลสังเคราะห์แล้ว |
| 1.15    | 29 ส.ค. 2569 | เพิ่ม Special-Allowances leave snapshot adapter รุ่นแรก: prepare complete snapshot จาก `PAPER_APPROVED`, immutable batch, SHA-256/idempotency, service-token delivery, response period/version guard และ retry/delivery history; ตรวจพบ source DTO ปัจจุบันยังรับ v1.0 จึงเพิ่ม compatibility mode ก่อนประสาน contract v1.1 |
| 1.16    | 29 ส.ค. 2569 | เพิ่ม worker foundation ใน API image สำหรับ retry delivery ที่ถึงกำหนด, optional monthly previous-month prepare/deliver, affiliation-scoped system identity, MySQL named lock และ worker/once commands; ปิด scheduled execution เป็นค่าเริ่มต้นและเพิ่ม Docker worker profile |
| 1.17    | 29 ส.ค. 2569 | เพิ่ม production security guard foundation: fail-fast environment validation, idle session timeout, secure-cookie checks, CSRF origin policy, security headers และ auth/mutation rate limit; เพิ่ม security test coverage และระบุ distributed replay/session revocation กับ edge limiter เป็นงานก่อน production sign-off |
| 1.18    | 29 ส.ค. 2569 | เพิ่ม Prisma initial migration baseline ที่ตรวจ deploy บน MySQL ชั่วคราว, คำสั่ง `migrate deploy`, production Compose template และ deployment runbook สำหรับ migration, backup/restore, baseline ฐานข้อมูลเดิม, rollback และ worker activation; ย้ำว่ายังไม่ใช่ production sign-off จนกว่าจะทำ staging/restore rehearsal และ data-owner approval |
| 1.19    | 29 ส.ค. 2569 | เพิ่มแผน UAT/pilot/cutover แบบ coexistence ตั้งแต่ G0 ถึง rollout 38 รพ.สต., test matrix ด้าน SSO/tenant/People/Leave/Special/operations, reconciliation checklist, exit criteria และ rollback triggers; เพิ่ม read-only UAT smoke script โดยย้ำว่าสถานะปัจจุบันพร้อม G0/G1 แต่ยังไม่พร้อม production cutover |
| 1.20    | 29 ส.ค. 2569 | ทำ local real-data shadow run กับ Special-Allowances สำเร็จ 38 หน่วยงาน/267 บุคลากร/43 users; พบว่า `areaKey` เป็นระดับพื้นที่ที่ซ้ำได้ จึงแก้ target mapping ให้ใช้ source ID เป็น tenant identity/code และเก็บ `areaKey` เป็น classification; ยืนยัน idempotent re-sync และระบุว่ายังไม่มี user-to-employee mapping จาก source |
| 1.21    | 29 ส.ค. 2569 | เพิ่ม source-user projection และรายงาน reconciliation สำหรับเตรียมการจับคู่ Portal user → employee โดยไม่เดา mapping อัตโนมัติ |
| 1.22    | 29 ส.ค. 2569 | เพิ่ม permission scope (`self`/`tenant`/`affiliation`) และ delegated approver foundation พร้อม guard ป้องกัน requester บันทึกผลกระดาษหรือ void ใบลาตนเอง |
| 1.23    | 29 ส.ค. 2569 | เพิ่ม versioned/effective-dated Leave Rulebook foundation, draft/publish API, legal-basis/approval audit และ production guard ที่ไม่ใช้ provisional rule |
| 1.24    | 29 ส.ค. 2569 | เพิ่ม snapshot reconciliation summary/UI, complete employee-row snapshot, affiliation-scoped schedule approval gate และขยับ shared contract เป็น v1.4 |
| 1.25    | 29 ส.ค. 2569 | เพิ่ม durable Portal launch-token replay, database-backed session revoke/rotation, auth cleanup worker, explicit trusted-proxy policy และ audit สำหรับ login/logout/rotation |
| 1.26    | 29 ส.ค. 2569 | เพิ่ม schema-drift/migration check, backup + SHA-256 sidecar, restore-to-new-database verification และ aggregate operational metrics ที่ไม่เก็บ PII |
| 1.27    | 29 ส.ค. 2569 | เพิ่ม aggregate-only UAT evidence script, local dev-auth override ที่ต้องระบุชัดเจน, release-readiness gate G0–G5 checkpoint และนโยบายเก็บหลักฐานที่ไม่บันทึก payload/cookie/token/PII |
| 1.28    | 29 ส.ค. 2569 | เพิ่ม staging Compose overlay, production-like `NODE_ENV=staging` validation, staging env template และ preflight ที่ตรวจ resolved configuration โดยไม่พิมพ์ secret; ปิด dev-auth/provisional rules/worker/monthly delivery เป็นค่าเริ่มต้น |
| 1.29    | 29 ส.ค. 2569 | เพิ่ม SSO test double และ negative authentication runner สำหรับ valid exchange, session/rotation/logout, invalid/expired issuer/audience/signature/future token และ durable replay โดยไม่ใช้ Portal credential จริง |
| 1.30    | 30 ส.ค. 2569 | เพิ่ม Special-Allowances snapshot contract negative suite: strict response validation, retry/non-retry HTTP matrix, network failure handling และ guard เมื่อ period/version acknowledgement ไม่ตรงกัน; เพิ่ม focused command และปรับ G1/UAT readiness |
| 1.31    | 30 ส.ค. 2569 | เพิ่ม edge/proxy/observability gate: staging ตรวจ host-port/network boundary, public HTTPS/HSTS/CORS/request-id, aggregate metrics privacy และ proxy-provided shared rate-limit marker/429 evidence; ปิด runtime security override ที่ไม่ควรปิดใน staging/production |

## วิธีอ่านระดับความมั่นใจ

- **[CONFIRMED]** เห็นจากหน้าจอ ฟอร์ม ข้อความกำกับ เส้นทาง หรือทรัพยากรที่เบราว์เซอร์เรียกโดยตรง
- **[INFERRED]** อนุมานจากโครงสร้าง UI ชื่อรายงาน ความสัมพันธ์ระหว่างหน้าจอ หรือรูปแบบธุรกิจที่สอดคล้องกัน แต่ยังไม่ได้ยืนยันด้วยการทำรายการจริง
- **[UNKNOWN]** หลักฐานไม่พอ ต้องยืนยันกับเจ้าของระบบ ผู้ใช้ปลายทาง หรือการทดสอบในสภาพแวดล้อมที่ได้รับอนุญาต

### แหล่งที่มาของข้อกำหนด

- **[OBSERVED]** พบจาก One Data System ตามวิธีสำรวจด้านบน; ใช้คู่กับระดับความมั่นใจเดิม `CONFIRMED/INFERRED/UNKNOWN`.
- **[MUTATION-VERIFIED]** ยืนยันด้วยการทำรายการสังเคราะห์จนเห็นผลลัพธ์/สถานะ/ยอดที่เปลี่ยนจริง แล้วล้างหรือคืนค่าตามที่ระบุใน Appendix B.
- **[OWNER-CONFIRMED]** เจ้าของโครงการยืนยันให้ใช้เป็นบริบทหรือข้อกำหนดของระบบใหม่.
- **[LEGAL-SOURCE]** ตรวจจากประกาศ/แบบฟอร์มของหน่วยงานรัฐที่มีผลกับขอบเขตบุคลากรเป้าหมาย; ต้องเก็บเลขที่ ฉบับ และวันมีผลใน Rulebook.
- **[CODEBASE-VERIFIED]** ตรวจจาก source code/เอกสารของระบบที่เจ้าของโครงการอนุญาต เช่น Special-Allowances, SSO Portal และ shared-infra; ไม่ใช่หลักฐานของระบบอ้างอิง GMTech.
- **[PROPOSED]** ข้อเสนอด้านผลิตภัณฑ์ สถาปัตยกรรม หรือกระบวนการพัฒนา; ต้องผ่านการอนุมัติก่อนถือเป็น requirement.
- **[OPEN]** Decision item ที่ยังต้องมีเจ้าของคำตอบ หลักฐาน และสถานะอนุมัติ.

> เอกสารนี้สกัด “ความต้องการทางธุรกิจ” จากระบบอ้างอิง ไม่ใช่คำสั่งให้คัดลอกหน้าจอ โค้ด เทคโนโลยี หรือข้อจำกัดของระบบเดิมแบบ 1:1

> **Effective implementation baseline:** ส่วน `Implementation Addendum v1.31` ท้ายเอกสารเป็น checkpoint/decision ล่าสุดของเจ้าของโครงการ และใช้ร่วมกับ edge/proxy/observability gate, Special contract negative gate, SSO test gate, staging/G1 preflight, release gate ใน [Release Readiness](docs/RELEASE_READINESS.md), UAT/pilot/cutover ของ `Implementation Addendum v1.19`, auth/session ของ `Implementation Addendum v1.25`, snapshot reconciliation/schedule ของ `Implementation Addendum v1.24`, versioned Leave Rulebook ของ `Implementation Addendum v1.23`, permission/delegation ของ `Implementation Addendum v1.22`, source-user reconciliation ของ `Implementation Addendum v1.21`, real-data shadow sync ของ `Implementation Addendum v1.20`, migration/deployment ของ `Implementation Addendum v1.18`, security ของ `Implementation Addendum v1.17`, worker ของ `Implementation Addendum v1.16`, integration ของ `Implementation Addendum v1.15`, UI ของ `Implementation Addendum v1.14`, authorization ของ `Implementation Addendum v1.12`, provisional calculation ของ `Implementation Addendum v1.13` และ workflow ใบลาของ `Implementation Addendum v1.8`. addenda ก่อนหน้าเก็บไว้เพื่อ traceability โดย Laravel/Vue หมายถึง current implementation baseline ส่วน NestJS/NextJS หมายถึง target architecture.

> **Implementation checkpoint 29 สิงหาคม 2569:** target workspace เริ่มทำงานแบบแยกจาก Laravel/Vue แล้วที่ `apps/api`, `apps/web` และ `packages/contracts`. API foundation มี health/readiness, request-id, API envelope, problem-details, deny-by-default development auth boundary, tenant-context helper, HS256 Portal launch-token verifier/exchange, hashed local session/logout, Portal role/position → One Data capability mapping, server-side permission guard และ Special master-data projection boundary; web foundation มี Next.js dashboard shell, `/auth/portal/launch` bridge, runtime current-user read และ Paper-first leave page/server actions สำหรับสร้าง ส่ง ยกเลิก บันทึกผลกระดาษ และ void ตาม capability. Docker Compose target ใช้พอร์ต `3100/3101` และมี MySQL development แยกบน `13307` พร้อม Prisma schema/seed สังเคราะห์. People/Leave vertical slice มี read/create/state-transition API, capability checks และ audit/outbox ในฐานข้อมูลทดสอบแล้ว; leave draft คำนวณจำนวนวันฝั่ง server ด้วย provisional working/calendar-day rule, ตัดวันหยุดที่มีข้อมูล, เก็บค่าทศนิยมแบบ fixed-decimal และป้องกัน active-request overlap. กติกานี้เป็น development foundation เท่านั้น ยังต้องผูกกับ HR Rulebook/สิทธิ์โควตาที่รับรองก่อน production. Browser smoke ยืนยัน flow สร้าง → ส่ง → บันทึก `PAPER_APPROVED` โดยผู้ตรวจแยกบัญชี → `VOIDED` และคืนข้อมูลทดลองเป็นสถานะที่ไม่มีผลแล้ว. Master-data sync มี validated source-ID upsert, effective membership, soft-inactivate และ sync report; local real-data shadow run กับ Special สำเร็จแล้ว แต่ยังไม่มี user-to-employee mapping ที่ยืนยันจาก source. Special leave snapshot adapter มี prepare/deliver แบบ immutable batch, source hash/idempotency, service-token client, response guard, complete employee rows, reconciliation summary และ retry metadata แล้ว; worker foundation มี retry due delivery, optional monthly orchestration, MySQL named lock และ approved schedule gate โดยยังปิด scheduled execution เป็นค่าเริ่มต้น. Production security foundation มี fail-fast config, idle session timeout, secure-cookie check, CSRF origin policy, security headers, explicit trusted-proxy policy, database-backed launch-token replay/session revocation, session rotation, auth audit/cleanup และ per-process rate limit แล้ว. Migration/operations foundation เพิ่ม schema-drift check, backup + SHA-256 sidecar, restore-to-new-database verification และ aggregate response metrics ที่ไม่เก็บ path/IP/identity/payload; ยังต้องต่อ monitoring/alerting กลาง. มี Prisma initial/forward migrations ที่ deploy ตรวจบน MySQL ชั่วคราว, production Compose template และ deployment runbook สำหรับ controlled migration, backup/restore, baseline ฐานข้อมูลเดิม และ rollback แล้ว แต่ยังต้องทำ staging/restore rehearsal, edge rate limit, Portal role/membership revocation propagation, schedule owner/permission sign-off, locked-period adjustment, production alerting, DOCX และ production real-data acceptance ก่อน production sign-off.

## Target Product Baseline

| รายการ                 | Baseline สำหรับระบบใหม่                                                              | สถานะ                               |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| สังกัดระดับบน          | องค์การบริหารส่วนจังหวัดยะลา 1 แห่ง                                                  | [OWNER-CONFIRMED]                   |
| หน่วยงานปฏิบัติการ     | รพ.สต. 38 แห่ง                                                                       | [OWNER-CONFIRMED]                   |
| บุคลากร                | 267 คน ณ วันที่ 10 สิงหาคม 2569 และมีแนวโน้มเพิ่ม                                    | [OWNER-CONFIRMED]                   |
| กลุ่มเป้าหมาย          | เจ้าหน้าที่ทุกคนของ รพ.สต. ที่สังกัด อบจ.ยะลา                                        | [OWNER-CONFIRMED]                   |
| กลุ่มเปิดใช้ Leave แรก | ข้าราชการ อบจ. ที่ฝ่ายบุคคลยืนยันว่าอยู่ใต้ประกาศ ก.จ. พ.ศ. 2569; สถานะอื่นเปิดตาม policy profile ที่รับรองแล้ว | [OWNER-CONFIRMED + LEGAL GUARDRAIL] |
| โครงสร้างรุ่นแรก       | `อบจ.ยะลา → รพ.สต. → บุคลากร`                                                        | [OWNER-CONFIRMED]                   |
| First production scope | People/Organization Core, ระบบลาแบบเรียบง่าย และเชื่อมระบบ ฉ.10/11 เดิมผ่าน API; Word/document module เป็นระยะถัดไป | [OWNER-CONFIRMED]                    |
| ระบบคำนวณ ฉ.10/11      | ใช้ `Special-Allowances` ที่พัฒนาเสร็จแล้วเป็นเจ้าของสูตร รอบคำนวณ ผลลัพธ์ และรายงาน; One Data ส่งข้อมูลลาเท่านั้น | [OWNER-CONFIRMED + CODEBASE-VERIFIED] |
| จุดเข้าใช้งาน/SSO       | เชื่อม `yala-pao-public-health-portal` ด้วย launch-token contract; ไม่สร้างบัญชี/รหัสผ่านข้ามระบบซ้ำ | [OWNER-CONFIRMED + CODEBASE-VERIFIED] |
| Target application stack | NestJS + TypeScript สำหรับ API/domain และ Next.js + TypeScript สำหรับ web UI; ใช้ repository เดียวแต่แยก process/container | [OWNER-CONFIRMED] |
| Current implementation baseline | Laravel 11 + Vue 3/TypeScript/Inertia ที่มีอยู่ใน repository ปัจจุบัน; ใช้เป็นหลักฐาน/ต้นแบบระหว่าง migration ไม่ใช่ target stack | [CODEBASE-VERIFIED + PROPOSED MIGRATION] |
| การขยายระบบ            | เพิ่ม รพ.สต./บุคลากรและต่อโมดูลอื่นแบบ incremental                                   | [OWNER-CONFIRMED]                   |
| Clinical/patient data  | ยังไม่ยืนยันว่าอยู่ในขอบเขต; baseline นี้ถือเฉพาะงานบริหารหลังบ้านจนกว่าจะมีคำตัดสิน | [OPEN]                              |

> ตัวเลข 247 คนที่ปรากฏในบทสนทนาวางแผนก่อนหน้าเป็นข้อมูลเดิม; เอกสารฉบับนี้ใช้ 267 คนเป็น baseline ล่าสุด **[OWNER-CONFIRMED]**

---

## 1. Executive Summary

One Data System ที่สำรวจเป็นระบบบริหารงานหลังบ้านสำหรับหน่วยบริการสุขภาพขนาดเล็กถึงกลางภายใต้สังกัดเดียวกัน โดยรวมข้อมูลบุคลากร เวร การลา/ไปราชการ เอกสารราชการ วัสดุ ครุภัณฑ์ ยานพาหนะ และการเงินไว้ในพื้นที่ทำงานเดียว **[OBSERVED: CONFIRMED]** ระบบใหม่มีเป้าหมายเริ่มต้นชัดเจนที่ อบจ.ยะลา 1 แห่ง รพ.สต. 38 แห่ง และบุคลากร 267 คน **[OWNER-CONFIRMED]**

ผู้ใช้หลักที่อนุมานได้มี 4 กลุ่มทางธุรกิจ:

1. เจ้าหน้าที่หน่วยงาน — ดูหรือบันทึกข้อมูลตามงานของตน เช่น เวร การลา การใช้รถ และรายการรับจ่าย **[INFERRED; สิทธิ์จริงยัง UNKNOWN]**
2. ผู้ดูแลหน่วยงาน — จัดการบุคลากร ข้อมูลหลัก เอกสาร สต็อก ทรัพย์สิน ยานพาหนะ และการตั้งค่าหน่วยงาน **[CONFIRMED ว่าบัญชีที่สำรวจเห็นความสามารถเหล่านี้]**
3. ผู้ดูแลสังกัด — ดูภาพรวมทุกหน่วยงาน จัดการวงรอบแผนการเงิน ข้อมูลรายรับ การย้ายบุคลากร กะทำงาน และประกาศ **[CONFIRMED]**
4. บทบาทผู้ลงนาม/ผู้อนุมัติตามหน้าที่ — ผู้อำนวยการ ผู้ตรวจ ผู้อนุมัติ เจ้าหน้าที่พัสดุ ผู้จ่ายเงิน และผู้อนุมัติใช้รถ ซึ่งเป็น “บทบาททางเอกสารและกระบวนงาน” ไม่จำเป็นต้องเท่ากับ role สำหรับเข้าสู่ระบบ **[CONFIRMED ว่ากำหนดบุคคลในหน้าตั้งค่าได้; ขอบเขตอำนาจจริง UNKNOWN]**

ปัญหาที่ระบบแก้คือการลดข้อมูลแยกส่วนและงานเอกสารซ้ำซ้อน โดยใช้ข้อมูลบุคลากร หน่วยงาน ตารางเวร ลา พัสดุ ทรัพย์สิน และการเงินร่วมกันเพื่อสร้างรายงานและแบบราชการหลายชนิด **[INFERRED จากการเชื่อมโยงหน้าจอและรายงาน]** ระบบยังช่วยให้สังกัดมองภาพรวมและกำกับการเปิด/ปิดแผนของหน่วยงานย่อยได้ **[CONFIRMED]**

การทดสอบ mutation รอบ 11 สิงหาคมยืนยันว่า workflow หลายส่วนทำงานจริง แต่ยังพบพฤติกรรมที่ **ห้ามตีความเป็น requirement ของระบบใหม่** ได้แก่ การสร้างบุคลากรที่ commit เพียงบาง aggregate แม้หน้าจอแจ้งล้มเหลว, ผู้ใช้เดียวกันยื่นและอนุมัติใบลาของตนเองได้, การลบข้อมูลวงจรชีวิตบางชนิดแบบ cascade, ค่าเสื่อมแสดง floating-point artifact และข้อมูลสรุประดับสังกัดบางจุดไม่สอดคล้องกันชั่วคราว **[MUTATION-VERIFIED]**. ระบบใหม่จึงต้องใช้ atomic command, segregation of duties, immutable history/reversal, fixed decimal และ consistency/reconciliation test เป็น acceptance gate ไม่ใช่ลอกพฤติกรรมระบบอ้างอิงตามตรง.

ข้อสรุปสำหรับการสร้างใหม่:

- ออกแบบเป็นแพลตฟอร์ม multi-organization ที่มีสองขอบเขตชัดเจน: `affiliation` และ `tenant/unit` **[CONFIRMED]**
- ให้ `affiliation = อบจ.ยะลา` และ `tenant/unit = รพ.สต.` ในรุ่นแรก แต่ไม่ hard-code จำนวน 38 แห่งหรือสังกัดเดียวใน schema **[OWNER-CONFIRMED + PROPOSED]**
- สร้าง People/Organization Core ให้ถูกต้องก่อน โดยแยกบุคคล โปรไฟล์ บัญชี การสังกัด และประวัติการจ้างออกจากกัน **[PROPOSED]**
- ใช้ People Core และระบบลาแบบ Paper-first เป็นความสามารถใหม่ของ One Data; ใช้ `Special-Allowances` เดิมเป็นเจ้าของการคำนวณ ฉ.10/11 และเชื่อมด้วย API แบบ versioned **[OWNER-CONFIRMED + CODEBASE-VERIFIED]**
- รุ่นแรกไม่ทำ online approval สำหรับใบลา: ผู้ใช้กรอกและส่งใบลาใน One Data แล้วดำเนินการพิมพ์/ลงนามภายนอกตามวิธีปฏิบัติงาน; เจ้าหน้าที่ผู้รับผิดชอบบันทึกผลเอกสารกลับเข้าระบบ **[OWNER-CONFIRMED]**
- ส่งให้ Special-Allowances เฉพาะใบลาสถานะ `PAPER_APPROVED` ที่ยังมีผล; `DRAFT`, `SUBMITTED`, `PAPER_REJECTED`, `CANCELLED` และ `VOIDED` ไม่เป็น input การคำนวณ **[OWNER-CONFIRMED]**
- แยก “สิทธิ์เข้าใช้ระบบ” ออกจาก “ตำแหน่ง/หน้าที่/ผู้ลงนามในเอกสาร” ตั้งแต่ต้น
- ใช้ข้อมูลหลักร่วมกันและสร้างเอกสารจากข้อมูลที่มีโครงสร้าง แทนการกรอกซ้ำ
- กำหนด workflow, state transition, audit trail และกติกาล็อกข้อมูลให้เป็นข้อกำหนดส่วนกลาง
- ให้การเงิน พัสดุ ทรัพย์สิน และยานพาหนะเชื่อมกันผ่านรหัสอ้างอิง แต่ไม่บังคับให้ทุกโมดูล deploy พร้อมกัน
- หลีกเลี่ยงการนำข้อจำกัด UI เดิม เช่น สิทธิ์เพียงสองชื่อหรือการค้นหาที่ไม่สม่ำเสมอ มาเป็นข้อจำกัดของระบบใหม่

---

## 2. System Context

### 2.1 ตำแหน่งของระบบใน ecosystem

```mermaid
flowchart LR
    Staff[เจ้าหน้าที่หน่วยงาน] --> ODS[ระบบบริหารงานกลาง]
    TenantAdmin[ผู้ดูแลหน่วยงาน] --> ODS
    AffAdmin[ผู้ดูแลสังกัด] --> ODS
    Signer[ผู้ลงนาม/ผู้อนุมัติ] --> ODS

    ODS --> People[บุคลากรและสิทธิ์]
    ODS --> Work[เวร ลา ไปราชการ]
    ODS --> Supply[วัสดุและสต็อก]
    ODS --> Asset[ครุภัณฑ์และยานพาหนะ]
    ODS --> Finance[แผนและผลการเงิน]
    ODS --> Docs[PDF / เอกสารราชการ / Excel]

    Affiliation[สังกัด] -->|กำหนดข้อมูลหลักและวงรอบ| ODS
    ODS -->|ภาพรวมหลายหน่วยงาน| Affiliation
    ODS -.-> Support[ช่องทางสนับสนุนภายนอก]
    ODS -.-> Analytics[Web analytics / performance telemetry]
```

- ผู้ใช้หนึ่งคนสามารถสลับระหว่างขอบเขตหน่วยงานและสังกัดได้จากตัวเลือกองค์กร **[CONFIRMED]**
- หน่วยงานย่อยสืบทอดข้อมูลหรือการกำกับบางส่วนจากสังกัด เช่น ประเภทรายรับ กะทำงาน การเปิด/ปิดแผน และประกาศ **[CONFIRMED]**
- สังกัดอ่านข้อมูลข้ามหน่วยงาน เช่น จำนวนบุคลากร รายงาน ฉ.5/การลา และภาพรวมแผนการเงิน **[CONFIRMED]**
- ระบบสร้างเอกสาร PDF/งานพิมพ์จำนวนมาก และมีการส่งออก Excel ในหน้าการเงินบางหน้า **[CONFIRMED]**
- พบช่องทางช่วยเหลือผ่าน Line OA และแบบฟอร์มภายนอก รวมถึงบริการ web analytics/rum ภายนอก **[CONFIRMED]**
- ไม่พบหน้าตั้งค่า API key, webhook, SSO หรือการ sync กับระบบราชการอื่น **[CONFIRMED ว่าไม่พบใน navigation ที่สำรวจ; การมีอยู่เบื้องหลัง UNKNOWN]**

#### 2.1.1 Target ecosystem ที่ตัดสินใจแล้วสำหรับรุ่นแรก

```mermaid
flowchart LR
    User[บุคลากร/เจ้าหน้าที่] --> Portal[yala-pao-public-health-portal\nSSO และสิทธิ์เข้าโมดูล]
    Portal -->|launch token อายุสั้น| OneData[One Data Web + Core API]
    OneData --> People[People/Organization]
    OneData --> Leave[Leave Paper-first]
    Leave -->|เฉพาะผลเอกสารภายนอกที่ยืนยันแล้ว\nscoped internal API| Special[Special-Allowances API]
    OneData -->|BFF/adapter สำหรับหน้าจอรวม| Special
    Special --> Calc[สูตร ฉ.10/11 รอบคำนวณ\nlock adjustment และ report เดิม]
    OneData -. shared Docker network .-> Infra[shared-infra]
    Special -. shared Docker network .-> Infra
    Portal -. shared Docker network .-> Infra
```

- Portal เป็นเจ้าของ login, account recovery, module access และ launch token; One Data สร้าง session ของตนหลังตรวจ token และใช้ `portal_user_id`/`sub` เป็น external identity mapping **[CODEBASE-VERIFIED + PROPOSED ADOPTION]**.
- One Data เป็นเจ้าของ People/Organization และ Leave; `Special-Allowances` เป็นเจ้าของสูตร ตัวแปรที่ไม่ใช่การลา รอบคำนวณ lock/adjustment ผลลัพธ์ และรายงาน ฉ.10/11 **[OWNER-CONFIRMED + CODEBASE-VERIFIED]**.
- ระบบอยู่บน server/network เดียวกันได้ แต่ต้องแยก database/schema credential และ service account ตามขอบเขต; ห้าม query หรือเขียนฐานข้อมูลของอีกระบบโดยตรง.
- หน้าจอ One Data สามารถแสดง/สั่งงานข้อมูล ฉ.10/11 ผ่าน BFF/adapter ได้ แต่ business command ต้องไปจบที่ Special-Allowances API และใช้ permission/audit ของระบบเจ้าของข้อมูล.
- ระยะ MVP ใช้ synchronous REST สำหรับการ sync รายเดือนและการอ่านผล; transactional outbox/event เป็นกลไกเพิ่มภายหลังเมื่อมี consumer หรือปริมาณงานที่คุ้มกับความซับซ้อน.

### 2.2 ขอบเขตองค์กร

| ระดับ                    | หน้าที่หลัก                                                | ข้อมูลที่เป็นเจ้าของ                                             | ความสัมพันธ์                                                   |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| สังกัด (`affiliation`)   | กำกับหน่วยงานย่อย ข้อมูลหลักร่วม วงรอบการเงิน รายงานรวม    | รายการรายรับ, กะ, ประกาศ, การจัดลำดับหน่วยงาน, สิทธิ์ระดับสังกัด | มีหลายหน่วยงาน **[CONFIRMED]**                                 |
| หน่วยงาน (`tenant/unit`) | ปฏิบัติงานประจำวันและเก็บรายการธุรกรรม                     | บุคลากร, เวร, ลา, สต็อก, ทรัพย์สิน, รถ, แผน/ผลการเงิน            | อยู่ใต้สังกัดหนึ่งแห่งในตัวอย่าง **[CONFIRMED]**               |
| บุคคล (`employee/user`)  | เป็นทั้งข้อมูลบุคลากร ผู้ใช้ ผู้ขอ ผู้อนุมัติ หรือผู้ลงนาม | โปรไฟล์ การจ้าง ใบอนุญาต บทบาทการเข้าถึง                         | บุคคลเดียวอาจได้รับสิทธิ์ทั้งหน่วยงานและสังกัด **[CONFIRMED]** |

Target deployment รุ่นแรก **[OWNER-CONFIRMED]**:

```text
องค์การบริหารส่วนจังหวัดยะลา (1 affiliation)
└── รพ.สต. 38 แห่ง (38 tenants)
    └── บุคลากรรวม 267 คน ณ 10 ส.ค. 2569
```

ข้อมูลนี้ยืนยัน topology เชิงธุรกิจของรุ่นแรก แต่ไม่ยืนยันว่าบุคลากรหนึ่งคนมี membership พร้อมกันหลาย รพ.สต. ได้หรือไม่ หรือเจ้าหน้าที่กองสาธารณสุขของ อบจ. ต้องอยู่ในทะเบียนบุคลากรชุดเดียวกัน **[OPEN]**

Environment อ้างอิงที่ทดสอบรอบนี้มีเพียง 1 tenant ใต้สังกัดและ baseline บุคลากร 12 คน **[MUTATION-VERIFIED]** จึงยังยืนยันไม่ได้ว่า aggregate dashboard, transfer และ report จะถูกต้องเมื่อครบ 38 รพ.สต./267 คน; การทดสอบ scale/cross-tenant ต้องใช้ seed สังเคราะห์แยกต่างหากก่อน pilot.

### 2.3 ขอบเขตที่ไม่ควรสมมติ

- รุ่นแรกยืนยันหนึ่งสังกัด (อบจ.ยะลา) กับ รพ.สต. 38 แห่ง **[OWNER-CONFIRMED]**; การรองรับหลาย อบจ. หรือสังกัดซ้อนชั้นเป็น future capability ที่ยัง **[OPEN]** และ schema ไม่ควรปิดทางไว้.
- การย้าย รพ.สต., ช่วยราชการ, รักษาการ หรือมีหลาย membership พร้อมกันยัง **[OPEN]**; ห้ามออกแบบเป็น `employees.tenant_id` ที่แก้ทับประวัติ.
- มีข้อความว่าข้อมูลพื้นฐานบางอย่างเปลี่ยนได้โดย “ผู้ดูแลระบบสูงสุด” แต่บัญชีที่สำรวจเห็น role ใน UI เพียง “เจ้าหน้าที่/ผู้ดูแล” **[CONFIRMED ข้อความ; โครงสร้าง role ขั้นสูง UNKNOWN]**
- ไม่ทราบว่าระบบเชื่อม HR, บัญชี, e-Saraban, SSO ภาครัฐ หรือระบบคลังภายนอกอยู่แล้วหรือไม่ **[UNKNOWN]**
- ไม่ควรสมมติว่าข้อมูลผู้ป่วย/เวชระเบียน/HDC อยู่ในขอบเขตของรุ่นแรกจนกว่าเจ้าของโครงการจะยืนยัน **[OPEN]**

---

## 3. Module Map

```text
One Data System
├── ขอบเขตหน่วยงาน
│   ├── ภาพรวม
│   │   └── Dashboard หน่วยงาน
│   ├── บุคลากรและงานประจำ
│   │   ├── ตารางเวร / ตารางการปฏิบัติงาน
│   │   ├── พนักงาน / ผังองค์กร
│   │   ├── วันหยุดราชการ
│   │   ├── ลา / ไปราชการ / โควตา / ปฏิทิน
│   │   └── เอกสารและรายงาน
│   ├── วัสดุ
│   │   ├── คลังวัสดุ
│   │   ├── รับเข้า
│   │   ├── เบิกจ่าย
│   │   ├── แผนเบิกประจำปี
│   │   └── ร้านค้า/บริษัท
│   ├── ทรัพย์สิน
│   │   ├── ครุภัณฑ์ (พ.ด.2)
│   │   ├── ที่ดินและสิ่งก่อสร้าง (พ.ด.1)
│   │   └── ค่าเสื่อม/จำหน่าย/ประโยชน์/ผู้รับผิดชอบ/ซ่อม
│   ├── ยานพาหนะ
│   │   ├── ทะเบียนรถ
│   │   ├── ผู้มีสิทธิ์ใช้รถ
│   │   ├── คำขอใช้รถ (แบบ 3)
│   │   ├── บันทึกการใช้ (แบบ 4)
│   │   ├── อุบัติเหตุ (แบบ 5)
│   │   ├── ซ่อมบำรุง (แบบ 6)
│   │   └── เชื่อมทะเบียนครุภัณฑ์
│   ├── การเงิน
│   │   ├── แผนใช้จ่ายเงินบำรุง
│   │   └── รายรับ-รายจ่ายรายเดือน / เทียบแผน
│   └── ตั้งค่าหน่วยงาน / ผู้ลงนาม / ลายเซ็น
└── ขอบเขตสังกัด
    ├── Dashboard สังกัด
    ├── รายงานรวมหลายหน่วยงาน
    ├── หน่วยงานและลำดับการแสดงผล
    ├── บุคลากรทุกหน่วยงาน
    ├── ย้ายบุคลากรโดยตรง
    ├── คำขอย้ายบุคลากร
    ├── การเงินรวม
    │   ├── Dashboard การเงิน
    │   ├── วงรอบ/ชนิดแผนและการล็อก
    │   └── ข้อมูลหลักรายการรายรับ
    ├── ผู้ใช้งานระดับสังกัด
    ├── ประเภทกะ
    ├── ประกาศ
    └── ตั้งค่าสังกัด / ผู้ลงนาม
```

ทุกกิ่งหลักในแผนผังพบจากเมนูหรือหน้าที่เปิดได้ **[CONFIRMED]** การจัดกลุ่มเป็น bounded context สำหรับสร้างใหม่เป็นข้อเสนอ **[INFERRED/RECOMMENDED]**

---

## 4. Screen Inventory

### 4.1 ขอบเขตหน่วยงาน

| Route ที่พบ                           | หน้าจอ                              | องค์ประกอบ/การกระทำสำคัญ                                                         | สถานะ       |
| ------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| `/tenant-dashboard`                   | Dashboard หน่วยงาน                  | KPI บุคลากร สถานะวันนี้ ขนาดองค์กร อัตรากำลังตามกลุ่ม/ตำแหน่ง สรุปการเงิน        | [CONFIRMED] |
| `/schedule`                           | ตารางเวร                            | เดือน/ปี, ตารางบุคลากร×วัน, แท็บเวร/การปฏิบัติงาน, รวมชั่วโมง/ค่าตอบแทน, ผู้ตรวจ | [CONFIRMED] |
| `/employees`                          | บุคลากร                             | KPI, ผังองค์กร/รายการ, ค้นหา, สถานะ, เพิ่ม/จัดการ                                | [CONFIRMED] |
| `/employees/new`                      | เพิ่มบุคลากร                        | ข้อมูลบุคคล การจ้าง ที่อยู่ ใบอนุญาต ประวัติการจ้าง บัญชีและ role                | [CONFIRMED] |
| `/employees/{id}/edit`                | แก้ไขบุคลากร                        | active, ข้อมูลบุคคล/การจ้าง, ประวัติการทำงานสำหรับ ฉ.11, บัญชีและ role           | [CONFIRMED] |
| `/holidays`                           | วันหยุด                             | เลือกปีและแสดงวันหยุดราชการรายเดือน                                              | [CONFIRMED] |
| `/leaves`                             | ลา/ไปราชการ                         | โควตา ปฏิทิน ประวัติ ตัวกรอง ขอ/พิมพ์เอกสาร                                      | [CONFIRMED] |
| `/reports`                            | เอกสาร/รายงาน                       | ตัวกรองเดือน/ปี เลขหนังสือ วันที่ ผู้ลงนาม และรายงาน 17 แบบ                      | [CONFIRMED] |
| `/reports/duty-table`                 | รายงานตารางเวร                      | ตัวอย่างหน้ารายงาน/พิมพ์จากเดือน ปี ผู้อนุมัติ                                   | [CONFIRMED] |
| `/reports/ch11-compensation-request`  | ใบขอรับเงินค่าตอบแทน ฉ.11           | เดือน ปี ผู้ลงนาม                                                                | [CONFIRMED] |
| `/reports/ch11-disbursement-memo`     | บันทึกขออนุมัติเบิกจ่าย ฉ.11        | เดือน ปี ผู้ลงนาม วันที่ และเลขที่หนังสือแยกกลุ่มการจ้าง                         | [CONFIRMED] |
| `/reports/ch11-disbursement-evidence` | หลักฐานการจ่ายเงิน ฉ.11             | เดือน ปี หัวหน้าผู้ควบคุม                                                        | [CONFIRMED] |
| `/reports/ch11-payment-claim-summary` | สรุปคำขอรับเงินรายเดือน ฉ.11        | เดือน ปี ผู้รับรอง                                                               | [CONFIRMED] |
| `/reports/ch11-annual-summary`        | ตารางสรุปทั้งปี ฉ.11                | เดือน ปี ผู้รับรอง                                                               | [CONFIRMED] |
| `/reports/ch11-annual-request`        | แบบคำขอรับเงินค่าตอบแทน ฉ.11 ทั้งปี | ผู้ลงนาม วันที่ เดือนคิดอายุงาน ช่วงคำขอ และข้อมูลประชุมคณะกรรมการ               | [CONFIRMED] |
| `/supplies`                           | คลังวัสดุ                           | ค้นหา เรียง ตารางรหัส/หมวด/ชนิด/หน่วย/min/max/คงเหลือ/มูลค่า เพิ่มวัสดุ          | [CONFIRMED] |
| `/stock-in`                           | รายการรับเข้า                       | ค้นหาและตารางเลขรับ/ใบส่งของ/ผู้ขาย/วันที่/มูลค่า/จำนวนรายการ                    | [CONFIRMED] |
| `/stock-in/new`                       | สร้างรับเข้า                        | ผู้ขาย ผู้ทำรายการ ใบส่งของ วันที่ รายการวัสดุ จำนวน ราคาต่อหน่วย ยอดรวม         | [CONFIRMED] |
| `/stock-out`                          | รายการเบิก                          | ค้นหาและตารางใบเบิก/กลุ่มงาน/วันที่/มูลค่า/จำนวนรายการ                           | [CONFIRMED] |
| `/stock-out/new`                      | สร้างเบิก                           | วันที่ กลุ่มงาน ผู้ทำรายการ หมายเหตุ ค้นวัสดุ จำนวน ยอดรวม                       | [CONFIRMED] |
| `/annual-plan`                        | แผนเบิกประจำปี                      | ค้นหา ตารางเลขแผน ปีงบ กลุ่มงาน จำนวน/ยอดเบิก สถานะตรวจสอบ                       | [CONFIRMED] |
| `/annual-plan/new`                    | สร้างแผนเบิก                        | ปีงบ กลุ่มงาน หมายเหตุ วัสดุและจำนวน; บันทึกแล้วล็อก                             | [CONFIRMED] |
| `/stores`                             | ร้านค้า/บริษัท                      | ค้นหา ตารางข้อมูลติดต่อ เพิ่ม/จัดการ                                             | [CONFIRMED] |
| `/durable-assets`                     | ทะเบียนทรัพย์สิน                    | แท็บครุภัณฑ์/ที่ดินและสิ่งก่อสร้าง KPI ค้นหา ชนิด สถานะ pagination               | [CONFIRMED] |
| `/durable-assets/new?form=KRUPAN`     | เพิ่มครุภัณฑ์                       | ข้อมูลหลัก รายละเอียด ค่าเสื่อม จำหน่าย ประโยชน์ ผู้รับผิดชอบ ซ่อม               | [CONFIRMED] |
| `/durable-assets/new?form=LAND`       | เพิ่มที่ดิน/สิ่งก่อสร้าง            | ที่ตั้ง เนื้อที่ เอกสารสิทธิ์ โครงสร้าง ขนาด การได้มา ราคา และแท็บวงจรชีวิต      | [CONFIRMED] |
| `/vehicles`                           | ทะเบียนยานพาหนะ                     | KPI/ตาราง/ปฏิทิน ค้นหา พิมพ์แบบทะเบียน/รายเดือน เพิ่มรถ                          | [CONFIRMED] |
| `/vehicles/{id}`                      | รายละเอียดยานพาหนะ                  | ข้อมูลรถ ผู้มีสิทธิ์ คำขอใช้ บันทึกใช้ อุบัติเหตุ ซ่อมบำรุง เชื่อมครุภัณฑ์       | [CONFIRMED] |
| `/finance`                            | แผนการเงินหน่วยงาน                  | ปีงบ รุ่นแผน รายได้คาดการณ์ ยอดยกมา รายจ่ายแต่ละแหล่ง คงเหลือ/ยกไป               | [CONFIRMED] |
| `/finance/monthly`                    | รายรับ-รายจ่ายรายเดือน              | ภาพรวม รายรับ รายจ่าย เทียบแผน กราฟ Oct–Sep พิมพ์/Excel                          | [CONFIRMED] |
| `/tenant-settings`                    | ตั้งค่าหน่วยงาน                     | โลโก้ ข้อมูลหนังสือ ที่อยู่ CUP/ขนาดองค์กร ผู้ลงนาม/ผู้ปฏิบัติ                   | [CONFIRMED] |

### 4.2 ขอบเขตสังกัด

| Route ที่พบ                     | หน้าจอ               | องค์ประกอบ/การกระทำสำคัญ                                                        | สถานะ                               |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `/affiliation-dashboard`        | Dashboard สังกัด     | จำนวนหน่วยงาน/บุคลากร ค่าเฉลี่ย กลุ่มตำแหน่ง สถานะอัตรากำลัง ค้นหา/เจาะหน่วยงาน | [CONFIRMED]                         |
| `/affiliation-reports`          | รายงานรวม            | ฉ.5 และสรุปการลาเดือน/ปี พร้อม preview PDF/พิมพ์                                | [CONFIRMED]                         |
| `/affiliation-tenants`          | หน่วยงาน             | กลุ่มตามอำเภอและ drag เพื่อเรียงลำดับในเอกสารรวม                                | [CONFIRMED]                         |
| `/affiliation-tenant-employees` | บุคลากรทุกหน่วยงาน   | ค้นหาชื่อ/เลขประจำตัว กรองหน่วยงาน/สถานะ แสดงกลุ่มตามหน่วยงาน                   | [CONFIRMED]                         |
| `/employee-transfer`            | ย้ายบุคลากร          | ขั้นที่ 1 เลือกบุคคล → ขั้นที่ 2 หน่วยงานปลายทาง → ขั้นที่ 3 ยืนยัน             | [CONFIRMED]                         |
| `/employee-transfer-requests`   | คำขอย้าย             | กรอง pending/approved/rejected/canceled; อนุมัติ/ปฏิเสธ                         | [CONFIRMED UI; ไม่มีข้อมูลตัวอย่าง] |
| `/finance/dashboard`            | Dashboard การเงินรวม | ผลรวมทุกหน่วยงาน แผน/จริง สถานะการบันทึก การใช้จ่าย                             | [CONFIRMED]                         |
| `/finance/cycle`                | วงรอบแผน             | เปิด/ปิดแผนปกติ/เพิ่มเติม/เปลี่ยนแปลง ล็อกสถานะ ติดตามหน่วยงาน รายงานรวม        | [CONFIRMED]                         |
| `/finance/revenue-items`        | รายการรายรับหลัก     | ปีงบ เพิ่ม คัดลอกจากปีอื่น เรียง เปิด/ปิดรายการ และ flag ประเภท                 | [CONFIRMED]                         |
| `/affiliation-settings`         | ตั้งค่าสังกัด        | โลโก้ ข้อมูลพื้นฐานแบบ read-only ผู้ลงนาม ข้อความท้ายเอกสาร                     | [CONFIRMED]                         |
| `/affiliation-employees`        | ผู้ใช้ระดับสังกัด    | สร้างบุคลากรใหม่หรือให้สิทธิ์บุคลากรหน่วยงานเดิม เลือก role และถอนสิทธิ์        | [CONFIRMED]                         |
| `/affiliation-shift-types`      | ประเภทกะ             | รหัส ชื่อ เวลา ชั่วโมง ฐานค่าตอบแทน เพิ่ม/แก้ไข                                 | [CONFIRMED]                         |
| `/affiliation-announcements`    | ประกาศ               | ข้อความ ผู้สร้าง วันที่ สถานะ active เพิ่ม/จัดการ                               | [CONFIRMED]                         |

### 4.3 Surface ที่ไม่พบ

- หน้า login, ลืมรหัสผ่าน, เชิญผู้ใช้ และจัดการ session — เริ่มสำรวจจากสถานะที่ login แล้ว **[UNKNOWN]**
- หน้าจัดการ role/permission matrix แบบละเอียด — ไม่พบในเมนู **[CONFIRMED ว่าไม่พบ; อาจอยู่ระดับสูงกว่า UNKNOWN]**
- audit log ส่วนกลาง — ไม่พบ แม้หลายตารางมี “แก้ไขล่าสุดโดย/เวลา” **[CONFIRMED]**
- bulk import wizard หรือ template CSV/Excel — ไม่พบ **[CONFIRMED ในหน้าที่สำรวจ]**
- notification inbox/email configuration — ไม่พบ; เมนูบัญชีมีเพียง diagnostics สำหรับ push ซึ่งรายงานว่าเบราว์เซอร์ปัจจุบันไม่รองรับ **[CONFIRMED]**
- รายงาน/route ชื่อ ฉ.10 — ไม่พบใน catalog 17 แบบ; มีหมวด `พตส.` จำนวน 0 ซึ่งยัง mapping ไม่ได้ **[CONFIRMED ว่าไม่พบ/OPEN ความสัมพันธ์]**

---

## 5. Feature Inventory

### 5.1 Dashboard และโครงสร้างองค์กร

- Dashboard หน่วยงานแสดงจำนวนบุคลากร สถานะมาปฏิบัติงาน/ลา/ไปราชการ กลุ่มตำแหน่ง ขนาดองค์กร อัตรากำลัง และการเงิน **[CONFIRMED]**
- Dashboard สังกัดรวมจำนวนหน่วยงาน บุคลากร ค่าเฉลี่ย ตำแหน่ง และความครบ/ขาด/เกินของอัตรากำลัง **[CONFIRMED]**
- หน่วยงานถูกจัดกลุ่มตามอำเภอและเรียงลำดับแบบ drag-and-drop; ลำดับนี้ถูกใช้ในเอกสารสรุป **[CONFIRMED]**
- มีตัวสลับ scope ในบัญชีเดียวและแสดง role ของแต่ละ scope **[CONFIRMED]**
- เกณฑ์จัดขนาดองค์กรและสูตรอัตรากำลังจริงไม่ปรากฏใน UI **[UNKNOWN]**

### 5.2 บุคลากรและสิทธิ์

- โปรไฟล์บุคลากรรวมข้อมูลตัวตน การเกิด เพศ ที่อยู่ การจ้าง กลุ่มงาน ตำแหน่ง ใบประกอบวิชาชีพ และประวัติการจ้าง **[CONFIRMED]**
- วันที่เริ่มงานใช้คำนวณอายุงาน; ส่วนประวัติการทำงานมีข้อความชัดว่า “ใช้ในการคำนวณ ฉ11” และเก็บชื่อสถานที่ทำงาน ระดับพื้นที่ สถานะทำงานปัจจุบัน flag “นำไปคิด ฉ11” วันเริ่ม และวันสิ้นสุด **[CONFIRMED จากข้อความฟอร์ม]**
- ระดับพื้นที่ในประวัติการทำงานมี 7 ค่า: พื้นที่เฉพาะระดับ 1/2, พื้นที่ชุมชนเมือง, พื้นที่ปกติระดับ 1/2/3 และไม่ระบุ **[CONFIRMED]**; ความหมาย อัตรา และ effective-date rule ของแต่ละค่ายัง **[UNKNOWN]**
- สามารถตั้งสถานะ active/inactive และค้น/กรองบุคลากร **[CONFIRMED]**
- ช่องทางเข้าระบบประกอบด้วยอีเมลแบบไม่บังคับ โทรศัพท์บังคับ และ role บังคับ **[CONFIRMED]**
- role ที่พบในตัวเลือกมี “เจ้าหน้าที่” และ “ผู้ดูแล” เท่านั้น **[CONFIRMED]**
- ระดับสังกัดสามารถสร้างบุคลากรใหม่หรือให้สิทธิ์แก่บุคลากรหน่วยงานเดิมโดยไม่ทำสำเนาข้อมูล **[CONFIRMED จากข้อความ UI]**
- รายการข้ามหน่วยงานรองรับการค้นชื่อ/เลขประจำตัวและกรองหน่วยงาน/สถานะ **[CONFIRMED]**
- มีทั้งการย้ายโดยผู้ดูแลแบบ 3 ขั้น และคำขอย้ายที่อนุมัติ/ปฏิเสธได้ **[CONFIRMED]**

### 5.3 ตารางเวร วันหยุด ลา และไปราชการ

- ตารางเวรรายเดือนเป็น matrix บุคลากร×วัน มีการแก้เวรในแต่ละ cell สรุปชั่วโมงและค่าตอบแทน **[CONFIRMED]**
- ประเภทกะส่วนกลางมีรหัส ชื่อ เวลาเริ่ม/สิ้นสุด จำนวนชั่วโมง และฐานค่าตอบแทน “ต่อกะ/ต่อชั่วโมง” **[CONFIRMED]**
- กะตัวอย่าง: เช้า 08:30–12:00 (3.5 ชม.), เที่ยง 12:00–13:00 (1 ชม.), บ่าย 13:00–16:30 (3.5 ชม.) **[CONFIRMED]**
- หน้าตารางแสดงวันหยุดและบันทึกผู้แก้ไขล่าสุด **[CONFIRMED]**
- หน้าวันหยุดเลือกปีและแสดงวันหยุดราชการ; ไม่พบการเพิ่ม/แก้ในขอบเขตที่สำรวจ **[CONFIRMED]**
- หน้าลาแสดงโควตา ปฏิทิน ประวัติ สถานะ และปุ่มพิมพ์เอกสาร **[CONFIRMED]**
- ประเภทลาที่พบ 11 ประเภท พร้อมเพดาน: ป่วย 60 วัน/ปี, คลอดบุตร 90 วัน/ครั้ง, กิจส่วนตัว 30 วัน/ปี, พักผ่อน 20 วัน/ปีและสะสม 10 วัน, อุปสมบท/ฮัจย์ 120 วัน/ครั้ง, ช่วยเหลือภริยาคลอดบุตร 15 วัน/ครั้ง, ฟื้นฟูสมรรถภาพอาชีพ 240 วัน/ครั้ง; อีก 4 กลุ่มแสดงเป็นไม่จำกัด **[CONFIRMED ตาม UI; กฎอายุงานและข้อยกเว้น UNKNOWN]**
- แบบขอลามีประเภท วันที่เริ่ม วันที่สิ้นสุด และบันทึก **[CONFIRMED]**
- แบบไปราชการมีประเภท (`ไปอบรม`, `ไปราชการ`), เรื่อง, วันที่เริ่ม/สิ้นสุด, ยานพาหนะ และผู้ร่วมเดินทางแบบไม่บังคับ **[CONFIRMED]**
- ตัวกรองสถานะใบลามี `รออนุมัติ`, `อนุมัติแล้ว`, `ไม่อนุมัติ`, `ยกเลิก`; รายการ pending เปิดแผงรายละเอียดได้ และบัญชีผู้ดูแลหน่วยงานเห็นปุ่ม `อนุมัติ`, `ไม่อนุมัติ`, `ยกเลิกการลา` และพิมพ์ใบลา **[CONFIRMED UI; ไม่ได้กด action]**
- ข้อความสถานะเดียวกันแสดงต่างกันระหว่างตาราง (`รออนุมัติ`) กับแผงรายละเอียด (`รอดำเนินการ`) **[CONFIRMED]**; ระบบใหม่ควรมี canonical status และแยก display label.
- รายการไปราชการตัวอย่างไม่แสดงสถานะอนุมัติ; แผงรายละเอียดมี `แก้ไขคำขอ`, `ลบคำขอไปราชการ` และพิมพ์เอกสาร **[CONFIRMED UI; ไม่ได้กด action]** จึงห้ามนำ state machine ของใบลาไปใช้กับไปราชการโดยอัตโนมัติ.
- ผู้อนุมัติที่ถูกต้อง ลำดับ/การมอบหมายอำนาจ วิธีนับวันลา วันหยุด/วันทับซ้อน การแก้ย้อนหลัง และเงื่อนไขยกเลิกหลังอนุมัติยัง **[UNKNOWN]**

### 5.4 เอกสารและรายงานหน่วยงาน

พบรายงาน 17 แบบ **[CONFIRMED]**:

1. ตารางเวร 1 แบบ
2. กลุ่ม OT 4 แบบ: ใบลงชื่อ, ใบสำคัญรับเงิน, สรุป, ขออนุมัติ
3. กลุ่ม ฉ.11 จำนวน 6 แบบ: ใบขอรับเงินค่าตอบแทน, บันทึกขออนุมัติเบิกจ่าย, หลักฐานการจ่ายเงิน, ตารางสรุปคำขอรับเงินรายเดือน, ตารางสรุปทั้งปี, แบบคำขอรับเงินค่าตอบแทนทั้งปี
4. สรุปการลา 1 แบบ
5. กลุ่มวัสดุ 4 แบบ: คงเหลือ, บัญชีรับ-จ่าย-คงเหลือ, สรุปมูลค่ารายเดือน, รายละเอียดคงเหลือปีงบประมาณ
6. ทะเบียนฝึกอบรม 1 แบบ

รองรับตัวกรองเดือน/ปี เลขหนังสือ วันที่ การกำหนดผู้จัดทำ/ผู้ตรวจ/ผู้อนุมัติ และ PDF/พิมพ์ **[CONFIRMED]** สำหรับ ฉ.11 พบ parameter เฉพาะรายงานเพิ่ม ได้แก่ ผู้ลงนาม/ผู้รับรอง/หัวหน้าผู้ควบคุม เลขที่หนังสือแยกกลุ่มการจ้าง เดือนคิดอายุงาน ช่วงเดือนคำขอ และเลขที่/วันที่ประชุมคณะกรรมการ **[CONFIRMED]** สูตรและ layout ทางราชการฉบับสุดท้ายยัง **[UNKNOWN]**

ใน catalog ที่สำรวจพบ `ฉ11` 6 รายงาน แต่ไม่พบรายงานหรือหมวดชื่อ `ฉ10`; พบหมวด `พตส.` แสดงจำนวน 0 เท่านั้น **[CONFIRMED]** การที่ ฉ.10 กับ พตส. เป็นเรื่องเดียวกัน คนละชื่อ หรือคนละแบบฟอร์มยัง **[OPEN]** และห้ามสรุปจาก UI นี้.

### 5.5 วัสดุและสต็อก

- ข้อมูลวัสดุ: รหัส หมวด ประเภท ชื่อ หน่วย ที่เก็บ min/max คงเหลือ มูลค่า และ audit ล่าสุด **[CONFIRMED]**
- ประเภทวัสดุ 19 กลุ่ม ครอบคลุมสำนักงาน การแพทย์ วิทยาศาสตร์ คอมพิวเตอร์ ยานพาหนะ เชื้อเพลิง ไฟฟ้า งานบ้าน ก่อสร้าง ฯลฯ **[CONFIRMED]**
- การเลือกบางประเภทเติมหมวดอัตโนมัติ เช่น วัสดุสำนักงาน → วัสดุคงคลัง **[CONFIRMED ตัวอย่างหนึ่ง; mapping ทั้งหมด UNKNOWN]**
- รับเข้าบันทึกใบส่งของ วันที่ ผู้ขาย ผู้ทำรายการ รายการวัสดุ จำนวน ราคาต่อหน่วย และยอดรวม **[CONFIRMED]**
- เบิกจ่ายบันทึกวันที่ กลุ่มงาน ผู้ทำรายการ หมายเหตุ วัสดุ จำนวน และยอดรวม **[CONFIRMED]**
- กลุ่มงานของผู้ทำรายการถูกเติมอัตโนมัติในใบเบิก **[CONFIRMED]**
- แผนเบิกประจำปีระบุปีงบ กลุ่มงาน วัสดุและจำนวน; เมื่อบันทึกจะล็อกและหากต้องเปลี่ยนต้องลบแผน **[CONFIRMED จากข้อความ UI]**
- ข้อมูลร้านค้า/บริษัทมีชื่อ ที่อยู่ ผู้ติดต่อ โทรศัพท์ และหมายเหตุ/เงื่อนไขจัดส่ง **[CONFIRMED]**
- ผลกระทบสต็อกของรับเข้า/เบิกจ่ายและรายงาน ledger **[INFERRED อย่างมีเหตุผล]**
- วิธีตีราคาคงเหลือ (FIFO/เฉลี่ย/ราคาล่าสุด), การกันสต็อกติดลบ, lot/expiry, approval และการย้อนรายการ **[UNKNOWN]**

### 5.6 ครุภัณฑ์ ที่ดิน และสิ่งก่อสร้าง

- แยกทะเบียน พ.ด.2 (ครุภัณฑ์) กับ พ.ด.1 (ที่ดิน/สิ่งก่อสร้าง) **[CONFIRMED]**
- รหัสครุภัณฑ์ตามข้อความ UI: ประเภท 3 หลัก + ปี พ.ศ. 2 หลัก + running 4 หลัก **[CONFIRMED]**
- ครุภัณฑ์เก็บรูป ชื่อ รายละเอียด รหัส ประเภท สถานะ ยี่ห้อ/รุ่น serial เครื่อง/ตัวถัง ทะเบียน สี หน่วย ใบส่งของ วิธีได้มา ผู้ขาย/ผู้ให้ วันที่ได้มา ราคา แหล่งเงิน หนังสืออนุมัติ ประกัน และหมายเหตุ **[CONFIRMED]**
- ที่ดิน/สิ่งก่อสร้างเพิ่มที่ตั้ง ไร่/งาน/ตารางวา ประเภท/เลขโฉนด ประเภทอาคาร โครงสร้าง ชั้น และขนาด **[CONFIRMED]**
- วงจรชีวิตแยกแท็บค่าเสื่อม จำหน่าย ประโยชน์ ผู้รับผิดชอบ และซ่อม **[CONFIRMED]**
- ค่าเสื่อมเริ่มต้นเป็นเส้นตรง 5 ปีจากราคาทุน และแก้ค่าหลังบันทึก/สำรวจประจำปีได้ **[CONFIRMED จากข้อความ UI]**
- การจำหน่ายมีวันที่ วิธี หนังสืออนุมัติ มูลค่าขาย และคำนวณกำไร/ขาดทุนเทียบราคาทุน; วิธีได้แก่ ขาย แลกเปลี่ยน โอน แปรสภาพ ทำลาย **[CONFIRMED]**
- ประโยชน์รายปีเก็บปี พ.ศ. วิธี/รายละเอียด จำนวนเงิน และหลักการรับรายเดือน/รายปี **[CONFIRMED]**
- ผู้รับผิดชอบรายปีเก็บส่วนงาน ผู้ใช้ทรัพย์สิน และหัวหน้าส่วนงาน **[CONFIRMED]**
- ประวัติซ่อมเก็บครั้งที่ เลขหนังสือ วันที่ รายการปรับปรุง จำนวนเงิน ผู้ซ่อม/บริษัท และหมายเหตุ **[CONFIRMED]**

### 5.7 ยานพาหนะ

- ทะเบียนรถมีรูป ชื่อ รุ่น ปีผลิต ความจุเครื่อง ทะเบียน ราคา รูปแบบถือครอง วันที่ได้มา เลขไมล์เริ่มต้น และหมายเหตุ **[CONFIRMED]**
- มุมมองรองรับ card/table/calendar, ค้นหา, พิมพ์ทะเบียนรถแบบ 2 และรายงานรายเดือน **[CONFIRMED]**
- รถหนึ่งคันมีรายชื่อผู้มีสิทธิ์ใช้รถ; UI ระบุว่ามีเฉพาะผู้ได้รับอนุญาตที่ขอใช้ได้ **[CONFIRMED]**
- คำขอใช้รถ (แบบ 3) มีผู้ขอ ปลายทาง วัตถุประสงค์ เริ่ม/สิ้นสุด จำนวนผู้โดยสาร และพิมพ์เอกสาร **[CONFIRMED]**
- บันทึกใช้รถ (แบบ 4) มีผู้ใช้ สถานที่ เวลา/เลขไมล์ออก เวลา/เลขไมล์กลับ ระยะทางรวม และคนขับ **[CONFIRMED]**
- อุบัติเหตุ (แบบ 5) เก็บวันเวลา ความเร็ว สถานที่ ต้นทาง/ปลายทาง ความเสียหาย ข้อมูลคู่กรณี ผู้บาดเจ็บ พยาน ผู้สอบสวน สถานีและผลคดี **[CONFIRMED]**
- ซ่อมบำรุง (แบบ 6) เก็บเลขไมล์ รายการซ่อม จำนวนเงิน วันที่รับรถ สถานที่ซ่อม และหมายเหตุ **[CONFIRMED]**
- รถสามารถสร้างหรือเชื่อมกับครุภัณฑ์ประเภทยานพาหนะ **[CONFIRMED]** ตัวอย่างที่เห็นยังไม่ได้เชื่อม แม้มีครุภัณฑ์ลักษณะรถอีกระเบียนหนึ่ง จึงมีความเสี่ยงข้อมูลซ้ำ **[CONFIRMED สภาพตัวอย่าง; สาเหตุ UNKNOWN]**
- state machine คำขอรถและผู้อนุมัติจริงยังไม่ชัด; พบตัวอย่างสถานะ “ยกเลิก” **[UNKNOWN/CONFIRMED เฉพาะสถานะ]**

### 5.8 การเงินหน่วยงาน

- แผนแยกปีงบประมาณและรุ่นแผน **[CONFIRMED]**
- แสดงรายได้คาดการณ์ ยอดยกมา รายจ่ายเงินบำรุง รายจ่ายงบ อปท. ยอดรวม คงเหลือ และยกไป **[CONFIRMED]**
- หากสังกัดไม่เปิดวงรอบแผนปกติ ปุ่มสร้างรุ่นแผนถูกปิด **[CONFIRMED]**
- รายรับ/รายจ่ายจริงบันทึกรายเดือนแบบ inline edit และวางเดือน ต.ค.–ก.ย. **[CONFIRMED]**
- หน้ารายเดือนมีภาพรวม กราฟ รายรับ รายจ่าย และแผนเทียบจริง พร้อมพิมพ์/Excel **[CONFIRMED]**
- กราฟรายรับรายเดือนไม่นับยอดยกมา ขณะที่ยอดคงเหลือต้องใช้อ้างอิงยอดยกมา **[CONFIRMED จากข้อความ UI]**
- รายจ่ายมี 11 หมวดหลัก: ยา/เวชภัณฑ์, วัสดุ, ค่าตอบแทนทางการแพทย์, บริการทางการแพทย์, ครุภัณฑ์/ที่ดิน/สิ่งก่อสร้าง, ค่าใช้สอย, สาธารณูปโภค, ค่าจ้างลูกจ้างชั่วคราว, OT, ไปราชการ และสาธารณสุขอื่น **[CONFIRMED]**
- แสดงผลรวมแผน ผลจริง และผลต่าง (+/−) **[CONFIRMED]** แต่ทิศทางสูตรผลต่างและกติกาแก้ย้อนหลัง **[UNKNOWN]**

### 5.9 การเงินและข้อมูลหลักระดับสังกัด

- Dashboard รวมจำนวนหน่วยงาน ยอดยกมา รายได้คาดการณ์ รายจ่ายตามแหล่ง เงินยกไป อัตราใช้แผน จำนวนแผนล็อก และความครบถ้วนการบันทึก **[CONFIRMED]**
- วงรอบแผนมี 3 ชนิด: ปกติ (`BASE`), เพิ่มเติม และเปลี่ยนแปลง **[CONFIRMED]**
- สังกัดเปิด/ปิดวงรอบแต่ละชนิด; การปิดมีผลล็อกแผนชนิดนั้น **[CONFIRMED]**
- สังกัดติดตามรุ่น/สถานะของทุกหน่วยงานและออกรายงานรวมหลายมิติ รวมบุคลากร/ผู้รับจ้าง ครุภัณฑ์ แหล่งรายรับ และหมวดรายจ่าย **[CONFIRMED]**
- รายการรายรับกำหนดโดยสังกัด หน่วยงานกรอกเฉพาะจำนวนเงิน; รองรับคัดลอกจากปีอื่น เรียงลำดับ และ flag ยอดยกมา/งบ อปท. **[CONFIRMED]**
- ประเภทรายรับ 8 กลุ่ม: เงินคงเหลือ, เงินหมุนเวียนตามระเบียบ, ค่ารักษาพยาบาล, รายได้จาก อปท., รายได้ทรัพย์สิน, เงินจัดสรร, ดอกผลกองทุน และรายได้อื่น/บริจาค **[CONFIRMED]**

### 5.10 ตั้งค่า ประกาศ และการสนับสนุน

- ตั้งค่าหน่วยงานเก็บโลโก้ ชื่อ/ชื่อย่อ รหัสหน่วยบริการ ขนาด CUP เลขหนังสือ ที่อยู่ และผู้ทำหน้าที่/ผู้ลงนามหลายประเภท **[CONFIRMED]**
- ชื่อ ชื่อย่อ รหัสหน่วยบริการ ขนาด และ CUP เป็น read-only ในบัญชีที่สำรวจ **[CONFIRMED]**
- ตั้งค่าสังกัดมีข้อมูลพื้นฐาน read-only พร้อมข้อความว่าผู้ดูแลระบบสูงสุดเท่านั้นที่แก้ได้ และมีผู้ลงนาม/ข้อความท้ายเอกสารที่แก้ได้ **[CONFIRMED]**
- ลายเซ็นผู้ใช้รองรับพิมพ์ชื่อ อัปโหลดภาพ หรือวาด **[CONFIRMED]**
- โลโก้รองรับ PNG/JPG สูงสุด 2 MB **[CONFIRMED]**
- ประกาศมีข้อความ ผู้สร้าง วันที่ active; การเปิดประกาศใหม่ทันทีจะปิดประกาศอื่นทั้งหมด **[CONFIRMED จากข้อความฟอร์ม]**
- ช่องทางแจ้งปัญหาเปิด Line OA และฟอร์มภายนอก **[CONFIRMED]**

---

## 6. Roles & Permissions

### 6.1 แบบจำลองสิทธิ์ที่สังเกตได้

ระบบแสดง role สำหรับการเข้าถึงเพียง 2 ชื่อ คือ `เจ้าหน้าที่` และ `ผู้ดูแล` และผูก role แยกตาม scope หน่วยงาน/สังกัด **[CONFIRMED]** บุคคลเดียวสามารถมีสิทธิ์ระดับสังกัดโดยอ้างอิงข้อมูลบุคลากรเดิมจากหน่วยงาน ไม่ต้องสร้างข้อมูลซ้ำ **[CONFIRMED]**

อย่างไรก็ตาม มีข้อความถึง “ผู้ดูแลระบบสูงสุด” สำหรับแก้ข้อมูลพื้นฐานบางส่วน **[CONFIRMED]** จึงควรตีความว่า role ที่แสดงใน UI อาจเป็นเพียง simplified label ไม่ใช่ permission model ทั้งหมด **[INFERRED]**

```text
Identity
└── Person / Employee
    ├── Tenant membership(s)
    │   └── access role: STAFF | ADMIN
    ├── Affiliation membership(s)
    │   └── access role: STAFF | ADMIN
    └── Functional assignments
        ├── Director / Acting director
        ├── Document issuer / checker / approver
        ├── Procurement roles
        ├── Payer
        ├── Vehicle approver
        └── Affiliation signatories
```

ส่วน `Functional assignments` พบจากหน้าตั้งค่าและใช้เติมเอกสาร/กระบวนงาน **[CONFIRMED]** แต่ยังไม่ยืนยันว่ามอบสิทธิ์ทำรายการด้วย **[UNKNOWN]**

### 6.2 Role matrix จากสิ่งที่มองเห็น

ตารางนี้บันทึก “UI ที่บัญชีผู้ดูแลเห็น” ไม่ใช่ผลทดสอบ authorization ฝั่ง server เพราะไม่ทำรายการจริง และไม่มีบัญชีเจ้าหน้าที่สำหรับเปรียบเทียบ

| Capability                  |                                                        ผู้ดูแลหน่วยงาน |                       เจ้าหน้าที่หน่วยงาน |                                 ผู้ดูแลสังกัด |        เจ้าหน้าที่สังกัด |
| --------------------------- | ---------------------------------------------------------------------: | ----------------------------------------: | --------------------------------------------: | -----------------------: |
| ดู dashboard ของ scope      |                                                   เห็น **[CONFIRMED]** |                                 [UNKNOWN] |                          เห็น **[CONFIRMED]** |                [UNKNOWN] |
| ดู/จัดการบุคลากร            |                                   ปุ่มเพิ่ม/จัดการเห็น **[CONFIRMED]** |                                 [UNKNOWN] | directory + access grant เห็น **[CONFIRMED]** |                [UNKNOWN] |
| จัดตารางเวร                 |                                         cell แก้ไขเห็น **[CONFIRMED]** |                                 [UNKNOWN] |               กำหนดชนิดกะเห็น **[CONFIRMED]** |                [UNKNOWN] |
| ขอวันลา/ไปราชการ            |                                             ปุ่มขอเห็น **[CONFIRMED]** |                   น่าจะได้ **[INFERRED]** |                 รายงานรวมเห็น **[CONFIRMED]** |                [UNKNOWN] |
| พิจารณา/ยกเลิกใบลา          | แผงรายละเอียด pending แสดงอนุมัติ/ไม่อนุมัติ/ยกเลิก **[CONFIRMED UI]** |                                 [UNKNOWN] |                                     [UNKNOWN] |                [UNKNOWN] |
| แก้ไข/ลบไปราชการ            |                           แผงรายละเอียดแสดงแก้ไข/ลบ **[CONFIRMED UI]** |                                 [UNKNOWN] |                                     [UNKNOWN] |                [UNKNOWN] |
| สร้าง/แก้คลังและรายการสต็อก |                                   ปุ่มเพิ่ม/จัดการเห็น **[CONFIRMED]** |                                 [UNKNOWN] |                             ไม่พบโมดูลธุรกรรม |        ไม่พบโมดูลธุรกรรม |
| จัดการครุภัณฑ์/รถ           |                                ปุ่มเพิ่ม/แก้/ลบเห็น **[CONFIRMED UI]** |                                 [UNKNOWN] |           รายงานแผนรวมบางส่วน **[CONFIRMED]** |                [UNKNOWN] |
| ขอใช้รถ                     |                                          ปุ่มฟอร์มเห็น **[CONFIRMED]** | เฉพาะผู้ได้รับอนุญาต **[CONFIRMED rule]** |                                     [UNKNOWN] |                [UNKNOWN] |
| จัดทำแผนการเงินหน่วยงาน     |                                   เห็น แต่ขึ้นกับวงรอบ **[CONFIRMED]** |                                 [UNKNOWN] |            เปิด/ปิด/ติดตามได้ **[CONFIRMED]** |                [UNKNOWN] |
| บันทึกผลรายเดือน            |                                       inline edit เห็น **[CONFIRMED]** |                                 [UNKNOWN] |                  ดู aggregate **[CONFIRMED]** |                [UNKNOWN] |
| จัดการรายการรายรับหลัก      |                                                         ไม่พบใน tenant |                                     ไม่พบ | เพิ่ม/คัดลอก/เรียง/จัดการเห็น **[CONFIRMED]** |                [UNKNOWN] |
| ย้ายบุคลากรโดยตรง           |                                                                  ไม่พบ |                                     ไม่พบ |           workflow 3 ขั้นเห็น **[CONFIRMED]** |                [UNKNOWN] |
| อนุมัติคำขอย้าย             |                                                                  ไม่พบ |                                     ไม่พบ |         UI ระบุอนุมัติ/ปฏิเสธ **[CONFIRMED]** |                [UNKNOWN] |
| ตั้งค่าองค์กร/ผู้ลงนาม      |                                         แก้ได้บางฟิลด์ **[CONFIRMED]** |                                 [UNKNOWN] |                แก้ได้บางฟิลด์ **[CONFIRMED]** |                [UNKNOWN] |
| แก้ข้อมูลพื้นฐานที่ล็อก     |                                ข้อมูลบางส่วน read-only **[CONFIRMED]** |                  ไม่ควรได้ **[INFERRED]** |        ระบุว่าต้อง superadmin **[CONFIRMED]** | ไม่ควรได้ **[INFERRED]** |
| Export PDF/Excel            |                                เห็นในหน้าที่เกี่ยวข้อง **[CONFIRMED]** |                                 [UNKNOWN] |       เห็นในหน้าที่เกี่ยวข้อง **[CONFIRMED]** |                [UNKNOWN] |
| ดู audit log ส่วนกลาง       |                                                                  ไม่พบ |                                     ไม่พบ |                                         ไม่พบ |                    ไม่พบ |

### 6.3 Permission model ที่แนะนำ

ห้ามสร้างระบบใหม่ด้วย `if role == admin` เพียงอย่างเดียว ควรใช้ RBAC + scope + resource policy:

- Permission รูปแบบ `module.resource.action` เช่น `employee.profile.read`, `leave.document.issue`, `leave.paper-decision.record`, `leave.request.void`, `integration.special.sync`, `finance.cycle.close`.
- Scope รูปแบบ `self`, `workgroup`, `tenant`, `affiliation`, `platform`.
- Functional assignment มีผลเฉพาะการเลือกชื่อ/ลงนาม หรือเป็น policy condition ที่ระบุชัด ไม่ควรให้สิทธิ์โดยปริยาย.
- Action เสี่ยงสูง ได้แก่ ปิดวงรอบ ล็อกแผน ย้ายบุคลากร จำหน่ายทรัพย์สิน ลบระเบียน และแก้รายรับย้อนหลัง ต้องใช้ permission เฉพาะพร้อม audit.
- ผู้ดูแลสังกัดไม่ควรเห็น PII เกินจำเป็น; directory ข้ามหน่วยงานควรมี masking และเหตุผลการเข้าถึง.
- ทุก API ต้องบังคับ scope ฝั่ง server แม้ UI จะซ่อนปุ่มแล้ว.

สำหรับ MVP ผู้ใช้ทั่วไปมี `leave.request.self.create/read/submit/cancel`; HR/เจ้าหน้าที่ที่มอบหมายมี `leave.paper-decision.record` ตาม tenant/affiliation; auditor อ่านประวัติได้แต่แก้ไม่ได้. การดาวน์โหลด DOCX และ permission `leave.document.issue` เป็น document module ระยะถัดไป. Permission ที่พบในระบบอ้างอิงสำหรับ `leave.request.approve/reject` เป็นเพียง observed evidence และไม่ถูกนำมาใช้ใน target workflow รุ่นแรก.

---

## 7. Business Workflows

### 7.1 ลาและไปราชการ

#### 7.1.1 Workflow ของระบบอ้างอิง

```mermaid
stateDiagram-v2
    [*] --> Draft: ผู้ใช้เปิดฟอร์ม
    Draft --> Submitted: กรอกประเภท/ช่วงวันที่และบันทึก
    Submitted --> Pending: ตรวจ validation และโควตา
    Pending --> Approved: ผู้มีอำนาจอนุมัติ
    Pending --> Rejected: ผู้มีอำนาจปฏิเสธ
    Pending --> Cancelled: ผู้ขอยกเลิก
    Approved --> Cancelled: ยกเลิกภายใต้เงื่อนไข
    Approved --> Documented: พิมพ์/ออกเอกสาร
    Rejected --> [*]
    Cancelled --> [*]
    Documented --> [*]
```

- ฟอร์ม ประวัติ ปฏิทิน โควตา สถานะ pending และการพิมพ์ **[CONFIRMED]**
- ตัวกรองยืนยัน vocabulary ปลายทาง 4 สถานะ: `PENDING` (`รออนุมัติ`), `APPROVED`, `REJECTED`, `CANCELLED` **[CONFIRMED เฉพาะ label; code เป็นชื่อเสนอ]**; `Draft/Submitted` ใน diagram เป็นแบบจำลองแนะนำก่อนถึงรายการที่บันทึกแล้ว.
- บัญชีผู้ดูแลหน่วยงานทำ pending → approved และ pending → rejected ได้จริง; ใบลาที่อนุมัติแล้วส่งคำขอยกเลิกพร้อมเหตุผลไม่บังคับและเปลี่ยนเป็น `ยกเลิก` ได้จริง **[MUTATION-VERIFIED]**
- ระบบอ้างอิงยอมให้บัญชีเดียวกันสร้างและอนุมัติใบลาของตนเองโดยไม่มี confirmation เพิ่มเติม **[MUTATION-VERIFIED; REFERENCE DEFECT]**; ระบบใหม่ต้องห้าม `requester = approver` ตามปกติ และอนุญาต break-glass เฉพาะ policy ที่ลงนามพร้อมเหตุผล/audit.
- วันหยุดที่กำหนดไว้แสดงในปฏิทินและเลือกเป็นวันลาไม่ได้ในการทดสอบ; เมื่อยกเลิกใบลา โควตาคืนหลัง reload แต่ค่าบนหน้าปัจจุบันอาจ stale ชั่วคราว **[MUTATION-VERIFIED]**.
- ผู้อนุมัติตามระเบียบ จำนวนขั้น delegation/acting, comment/evidence, SLA และ transition หลัง approved ยัง **[UNKNOWN]**
- ไปราชการใช้ข้อมูลเรื่อง ยานพาหนะ และผู้ร่วมเดินทาง; subtype `ไปอบรม` เพิ่มเรื่อง หลักสูตร/โครงการ หน่วยงานผู้จัด สถานที่ ค่าใช้จ่าย และหมายเหตุ; สร้าง แก้ไข และลบได้จริงโดยไม่แสดง approval status **[MUTATION-VERIFIED]** จึงควรเป็น aggregate/workflow แยกต่างหาก.

#### 7.1.2 Target workflow รุ่นแรก — Paper-first และลงนามภายนอก

ระบบใหม่ไม่คัดลอก online approval ของระบบอ้างอิงใน MVP. ผู้ใช้กรอกและส่งข้อมูลใบลาใน One Data ส่วนการเสนอ ตรวจ และลงนามยังทำภายนอกตามวิธีปฏิบัติงานจริง. การสร้าง DOCX ตามแบบราชการเป็น document module ที่เปิดเพิ่มได้เมื่อได้รับแบบฟอร์มมาตรฐาน **[OWNER-CONFIRMED]**.

```mermaid
stateDiagram-v2
    [*] --> DRAFT: เริ่มกรอกใบลา
    DRAFT --> SUBMITTED: บันทึกและส่งใบลา
    SUBMITTED --> PAPER_APPROVED: เจ้าหน้าที่บันทึกผลเอกสารภายนอกว่าได้รับอนุญาต
    SUBMITTED --> PAPER_REJECTED: เจ้าหน้าที่บันทึกผลเอกสารภายนอกว่าไม่อนุญาต
    DRAFT --> CANCELLED: ผู้ใช้ยกเลิกแบบร่าง
    SUBMITTED --> CANCELLED: ยกเลิกก่อนทราบผล
    PAPER_APPROVED --> VOIDED: ยกเลิก/แก้ไขตามเอกสารภายนอก
    PAPER_REJECTED --> [*]
    CANCELLED --> [*]
    VOIDED --> [*]
```

- `PAPER_APPROVED` หมายถึง “เจ้าหน้าที่บันทึกผลจากเอกสารที่ลงนามภายนอกแล้ว” ไม่ใช่การอนุมัติทางราชการในระบบ.
- ผู้ยื่นส่งใบลาได้ แต่ห้ามบันทึก `PAPER_APPROVED` หรือ `PAPER_REJECTED` ให้รายการของตน; สิทธิ์นี้เป็นของ HR/เจ้าหน้าที่ผู้รับผิดชอบที่กำหนด และต้องเก็บ actor, เวลา, เลขที่/วันที่เอกสาร และเหตุผลการแก้ไข.
- ไฟล์ DOCX/สแกนฉบับลงนามยังไม่บังคับใน MVP; เมื่อเปิด document module แล้ว metadata, revision และ audit จะเป็นข้อมูลบังคับตามแบบฟอร์มที่รับรอง.
- การแก้ข้อมูลหลัง `SUBMITTED` หรือหลังมีเอกสารต้องสร้าง revision ตามกฎที่กำหนด; ห้ามเปลี่ยนเอกสารหรือผลกระดาษเดิมเงียบ ๆ.
- เฉพาะ `PAPER_APPROVED` ที่ยังไม่ `VOIDED/CANCELLED` และมีผลทับช่วงเดือนเป้าหมายเท่านั้นที่ Special-Allowances ใช้คำนวณ.
- ไปราชการไม่อยู่ใน first production scope และยังคงเป็น aggregate แยกจาก Leave.

### 7.2 ตารางเวรและค่าตอบแทน

```mermaid
flowchart LR
    A[สังกัดกำหนดประเภทกะ เวลา ชั่วโมง และฐานค่าตอบแทน] --> B[หน่วยงานเลือกเดือน/ปี]
    B --> C[มอบหมายกะให้บุคลากรรายวัน]
    C --> D[ระบบรวมชั่วโมงตามประเภทกะ]
    D --> E[คำนวณค่าตอบแทนตามต่อกะ/ต่อชั่วโมง]
    E --> F[ผู้ตรวจ/ผู้อนุมัติในเอกสาร]
    F --> G[รายงานตารางเวรและเอกสาร OT]
```

การเลือกหนึ่ง cell บันทึกอัตโนมัติและมีตัวเลือก `ว่าง/เช้า/เที่ยง/บ่าย` **[MUTATION-VERIFIED]**. ตัวอย่างกะเช้า 3.5 ชั่วโมงคำนวณยอด `144.375` ซึ่งสอดคล้องกับ `3.5 × 41.25` **[MUTATION-VERIFIED เฉพาะ rate/config นี้]**. เงื่อนไขวันหยุด เวรซ้อน อัตราอื่น การปัดเศษเป็นเงินจริง และ approval ก่อนออกเอกสารยัง **[UNKNOWN]**; ระบบใหม่ต้องแสดง save state/error และปัดเงินตาม rule ไม่ปล่อย silent auto-save หรือเศษเกิน precision.

### 7.3 สต็อกวัสดุ

```mermaid
flowchart TD
    Master[สร้างข้อมูลวัสดุ/หน่วย/ร้านค้า] --> Receipt[รับเข้า: ใบส่งของ ผู้ขาย จำนวน ราคา]
    Receipt --> OnHand[(คงเหลือและมูลค่า)]
    Plan[แผนเบิกประจำปี] --> Issue[เบิก: กลุ่มงาน วัสดุ จำนวน]
    OnHand --> Issue
    Issue --> OnHand
    Receipt --> Ledger[บัญชีรับ-จ่าย-คงเหลือ]
    Issue --> Ledger
    Ledger --> Reports[รายงานคงเหลือ/มูลค่ารายเดือน/ปีงบ]
```

- Master, receipt, issue, annual plan และรายงานพบจริง **[CONFIRMED]**
- รับเข้า 5 หน่วยทำให้คงเหลือ 5; ระบบป้องกันเบิก 6 และยอมให้เบิก 2; ลบใบเบิกคืน stock แล้วจึงลบใบรับได้ **[MUTATION-VERIFIED]**.
- ระบบปฏิเสธการลบใบรับที่มีจำนวนถูกเบิกต่อแล้ว พร้อมสั่งให้ลบรายการเบิกที่อ้างอิงก่อน จึงป้องกัน negative stock ในเส้นทางนี้ **[MUTATION-VERIFIED]**.
- เบิกวัสดุนอกแผนได้หลังแสดง confirmation และเมื่อสร้างแผนภายหลัง ระบบนับยอดเบิกก่อนสร้างแผนเข้า utilization ของปี/กลุ่มงาน/วัสดุเดียวกันทันที **[MUTATION-VERIFIED]**; semantics แบบย้อนหลังนี้ต้องให้เจ้าของงานตัดสินก่อนสร้างใหม่.
- แผนประจำปีบันทึกแล้วล็อกและเปลี่ยนโดยลบแผน **[MUTATION-VERIFIED]** ระบบใหม่ควรใช้ revision/void แทน hard delete **[RECOMMENDED]**.

### 7.4 วงจรชีวิตทรัพย์สิน

```mermaid
stateDiagram-v2
    [*] --> Registered: ลงทะเบียนการได้มา
    Registered --> InUse: พร้อมใช้งาน
    InUse --> Repaired: บันทึกซ่อม/ปรับปรุง
    Repaired --> InUse
    InUse --> Depreciated: คำนวณ/ปรับค่าเสื่อมรายปี
    Depreciated --> InUse
    InUse --> Disposed: ขาย/แลก/โอน/แปรสภาพ/ทำลาย
    Disposed --> [*]
```

สร้างครุภัณฑ์ด้วยชื่อ รหัส และราคาทุนขั้นต่ำได้จริง; ระบบสร้างตารางค่าเสื่อมเส้นตรง 5 ปี และลบระเบียนได้ **[MUTATION-VERIFIED]**. ตารางตัวอย่างราคาทุน 1,000 แสดงมูลค่าคงเหลือปีที่ 4 เป็น floating-point artifact (`199.999999…`) **[REFERENCE DEFECT]**. สถานะ `IN_USE` และการเปลี่ยนเป็นจำหน่ายเมื่อบันทึก disposal **[CONFIRMED UI]**; รายชื่อสถานะอื่นทั้งหมดและการย้อนจำหน่าย **[UNKNOWN]**. บันทึกประโยชน์ ผู้รับผิดชอบ และซ่อมเป็น child history ที่อยู่ตลอดอายุทรัพย์สิน **[CONFIRMED]**.

### 7.5 ขอใช้ยานพาหนะและบันทึกการใช้

```mermaid
flowchart TD
    V[ลงทะเบียนรถ] --> L{เชื่อมทะเบียนครุภัณฑ์?}
    L -->|ใช่| A[Asset reference เดียว]
    L -->|ยังไม่เชื่อม| W[แจ้งเตือนความเสี่ยงข้อมูลซ้ำ]
    V --> U[กำหนดผู้มีสิทธิ์ใช้รถ]
    U --> R[ผู้มีสิทธิ์ยื่นคำขอแบบ 3]
    R --> AP{อนุมัติ?}
    AP -->|อนุมัติ| USE[บันทึกออก/กลับและเลขไมล์ แบบ 4]
    AP -->|ปฏิเสธ/ยกเลิก| END[ปิดคำขอ]
    USE --> M[ซ่อมบำรุง แบบ 6]
    USE --> AC[อุบัติเหตุ แบบ 5]
    USE --> REP[รายงานรายเดือน]
```

สร้างรถด้วยชื่อและทะเบียนขั้นต่ำได้จริง; รายละเอียดมี authorized users, request แบบ 3, usage แบบ 4, accident แบบ 5, maintenance แบบ 6 และ optional asset link **[MUTATION-VERIFIED/CONFIRMED UI]**. การลบรถเตือนว่าจะ hard-cascade ประวัติทั้งหมด **[MUTATION-VERIFIED; REFERENCE DEFECT สำหรับข้อมูลราชการ]**. ขั้นอนุมัติและการสร้าง usage จากคำขอ, actor, SLA และทุกสถานะยัง **[UNKNOWN]**.

### 7.6 แผนและผลการเงิน

```mermaid
sequenceDiagram
    participant A as ผู้ดูแลสังกัด
    participant T as หน่วยงาน
    participant S as ระบบ
    A->>S: กำหนดรายการรายรับและลำดับ
    A->>S: เปิดวงรอบแผนชนิด BASE/เพิ่มเติม/เปลี่ยนแปลง
    S-->>T: อนุญาตสร้าง/แก้รุ่นแผน
    T->>S: กรอกรายรับคาดการณ์และรายจ่าย
    A->>S: ปิดวงรอบ
    S-->>T: ล็อกแผนชนิดนั้น
    T->>S: บันทึกรายรับ/รายจ่ายจริงรายเดือน
    S-->>T: เปรียบเทียบแผนกับจริง
    S-->>A: รวมทุกหน่วยงาน/รายงาน/สถานะความครบถ้วน
```

สังกัดเปิด/ปิด BASE แล้วปุ่มสร้างฉบับของ tenant เปิด/ล็อกตามจริง **[MUTATION-VERIFIED]**. ขณะ BASE เปิด ระบบ disable การเปิดแผนเพิ่มเติมและแผนเปลี่ยนแปลงพร้อมข้อความว่าต้องปิด/ล็อก BASE ก่อน **[MUTATION-VERIFIED]**. วิธีอนุมัติฉบับ การแก้หลังล็อก และการรวม revision ยัง **[UNKNOWN]**.

### 7.7 การย้ายบุคลากร

มีสองทาง **[CONFIRMED]**:

1. **Direct transfer:** ผู้ดูแลสังกัดเลือกบุคลากร → เลือกหน่วยงานปลายทาง → ยืนยัน
2. **Request transfer:** คำขอเข้าสถานะ pending → ผู้ดูแลสังกัด approve/reject → อาจ cancel ได้

เมื่อสำเร็จ ระบบควรปิด membership เดิม เปิด membership ใหม่ เก็บ effective date รักษาประวัติการจ้างและ audit ใน transaction เดียว **[RECOMMENDED]** ไม่ควรย้ายด้วยการแก้ `tenant_id` ตรง ๆ จนเสียประวัติ

### 7.8 ประกาศ

สร้าง แก้ไข เปิด/ปิด และลบประกาศได้จริง; เมื่อเปิดแล้วข้อความแสดงบน banner ของ tenant หลังสลับ scope **[MUTATION-VERIFIED]**. หากเปิดประกาศใหม่ ระบบปิดประกาศอื่นทั้งหมด **[CONFIRMED]** จึงเป็น single-active announcement policy ควรบังคับด้วย transaction/unique constraint ไม่ใช่เพียงปิดจาก UI **[RECOMMENDED]**.

### 7.9 การสร้างรายงาน

```mermaid
flowchart LR
    Data[ข้อมูลธุรกรรมที่อนุมัติ/ข้อมูลหลัก] --> Params[เดือน ปี เลขหนังสือ วันที่]
    Settings[หน่วยงาน โลโก้ ผู้ลงนาม ลายเซ็น] --> Render[Report renderer]
    Params --> Render
    Data --> Render
    Render --> Preview[Preview]
    Preview --> PDF[PDF/พิมพ์]
    Render --> XLSX[Excel เฉพาะรายงานที่รองรับ]
```

การตั้งค่าผู้ลงนาม พารามิเตอร์ preview/PDF และ Excel บางหน้า **[CONFIRMED]** การ snapshot ชื่อ/ตำแหน่ง/ลายเซ็น ณ เวลาออกรายงาน **[UNKNOWN แต่ควรมี]**

---

## 8. Business Rules

### 8.1 กฎที่ยืนยันได้

| ID     | Rule                                                                                                                                                   | Source                             | Confidence                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | --------------------------------------------- |
| BR-001 | บัญชีหนึ่งสลับ scope หน่วยงาน/สังกัดได้ และ role แสดงแยกตาม scope                                                                                      | organization switcher              | CONFIRMED                                     |
| BR-002 | role ที่เลือกได้ในฟอร์มการเข้าถึงมีเจ้าหน้าที่และผู้ดูแล                                                                                               | employee/access forms              | CONFIRMED                                     |
| BR-003 | บางข้อมูลพื้นฐานองค์กรเป็น read-only และต้องใช้ผู้ดูแลระบบสูงสุด                                                                                       | settings text/disabled fields      | CONFIRMED                                     |
| BR-004 | โทรศัพท์และ role บังคับสำหรับการตั้งค่าการเข้าถึง; อีเมลไม่บังคับ                                                                                      | employee form                      | CONFIRMED                                     |
| BR-005 | ประวัติการทำงานที่เลือกไว้ใช้คำนวณอายุงานสำหรับ ฉ.11                                                                                                   | employee form text                 | CONFIRMED                                     |
| BR-006 | เวรมีเวลา ชั่วโมง และฐานค่าตอบแทนต่อกะ/ต่อชั่วโมง                                                                                                      | shift type form                    | CONFIRMED                                     |
| BR-007 | ตารางเวรรวมชั่วโมงตามชนิดกะและยอดเงินรายบุคคล                                                                                                          | schedule totals                    | CONFIRMED                                     |
| BR-008 | โควตาลาแตกต่างตามประเภทและหน่วยเวลา “ต่อปี/ต่อครั้ง/ไม่จำกัด”                                                                                          | leave quota UI                     | CONFIRMED                                     |
| BR-009 | ไปราชการบังคับประเภท เรื่อง วันเริ่ม/สิ้นสุด และยานพาหนะ; ผู้ร่วมเดินทางไม่บังคับ                                                                      | official duty form                 | CONFIRMED                                     |
| BR-010 | กลุ่มงานในใบเบิกวัสดุถูกเติมจากกลุ่มงานของผู้ทำรายการ                                                                                                  | stock-out form                     | CONFIRMED                                     |
| BR-011 | แผนเบิกประจำปีบันทึกแล้วล็อก และข้อความระบุให้ลบแผนหากต้องเปลี่ยน                                                                                      | annual plan form                   | CONFIRMED                                     |
| BR-012 | รหัสครุภัณฑ์เป็นประเภท 3 หลัก + ปี พ.ศ. 2 หลัก + running 4 หลัก                                                                                        | asset form help                    | CONFIRMED                                     |
| BR-013 | ค่าเสื่อมเริ่มต้นเส้นตรง 5 ปีจากราคาทุน                                                                                                                | depreciation tab text              | CONFIRMED                                     |
| BR-014 | วิธีจำหน่าย: ขาย แลกเปลี่ยน โอน แปรสภาพ ทำลาย; บันทึกแล้วสถานะเป็นจำหน่าย                                                                              | disposal tab                       | CONFIRMED                                     |
| BR-015 | กำไร/ขาดทุนจำหน่ายคำนวณจากมูลค่าขายเทียบราคาทุนตามข้อความ UI                                                                                           | disposal tab                       | CONFIRMED                                     |
| BR-016 | เฉพาะบุคลากรที่อยู่ใน authorized users ของรถจึงขอใช้รถได้                                                                                              | vehicle permissions tab            | CONFIRMED                                     |
| BR-017 | ยานพาหนะเชื่อมหรือสร้างระเบียนครุภัณฑ์ประเภทยานพาหนะได้                                                                                                | vehicle detail                     | CONFIRMED                                     |
| BR-018 | หน่วยงานสร้างแผนได้เมื่อสังกัดเปิดวงรอบที่เกี่ยวข้อง                                                                                                   | finance plan disabled state        | CONFIRMED                                     |
| BR-019 | สังกัดปิดวงรอบแล้วแผนชนิดนั้นถูกล็อก                                                                                                                   | finance cycle text                 | CONFIRMED                                     |
| BR-020 | รายการรายรับกำหนดโดยสังกัด; หน่วยงานบันทึกจำนวนเงิน                                                                                                    | revenue items UI text              | CONFIRMED                                     |
| BR-021 | ปีการเงินแสดงเดือน ต.ค.–ก.ย.; กราฟรายรับไม่รวมยอดยกมา                                                                                                  | monthly finance UI                 | CONFIRMED                                     |
| BR-022 | การเปิดประกาศหนึ่งรายการทันทีจะปิดประกาศอื่นทั้งหมด                                                                                                    | announcement form text             | CONFIRMED                                     |
| BR-023 | โลโก้รับ PNG/JPG ขนาดไม่เกิน 2 MB                                                                                                                      | settings UI                        | CONFIRMED                                     |
| BR-024 | ลำดับหน่วยงาน/อำเภอถูกใช้ในเอกสารสรุประดับสังกัด                                                                                                       | tenant ordering UI text            | CONFIRMED                                     |
| BR-025 | ประวัติการทำงานแต่ละรายการระบุสถานที่ ระดับพื้นที่ วันเริ่ม/สิ้นสุด สถานะปัจจุบัน และเลือกได้ว่าจะนำไปคิด ฉ.11 หรือไม่                                 | employee edit form                 | CONFIRMED                                     |
| BR-026 | รายการใบลาที่บันทึกแล้วกรองได้อย่างน้อย 4 สถานะ: รออนุมัติ อนุมัติแล้ว ไม่อนุมัติ และยกเลิก                                                            | leave history filter               | CONFIRMED                                     |
| BR-027 | ในขอบเขตบัญชีผู้ดูแลหน่วยงาน ใบลา pending มี control อนุมัติ ไม่อนุมัติ และยกเลิก; การไปราชการตัวอย่างมี control แก้ไขและลบแทน                         | leave/duty detail panels           | CONFIRMED UI; server enforcement UNKNOWN      |
| BR-028 | แบบคำขอ ฉ.11 ทั้งปีแยก “เดือนคิดอายุงาน” ออกจาก “ช่วงคำขอ” และรับข้อมูลการประชุมคณะกรรมการ                                                             | annual request report settings     | CONFIRMED                                     |
| BR-029 | การแก้ข้อมูลบุคลากรที่กระทบการคำนวณให้เลือก “แก้ข้อมูลที่ผิด” หรือ “เปลี่ยนแปลงจริง”; กรณีหลังต้องระบุวันที่มีผลและรักษาค่าเดิมสำหรับเอกสารก่อนวันนั้น | employee edit decision dialog      | MUTATION-VERIFIED                             |
| BR-030 | เลขประจำตัวประชาชนผ่าน check digit และโทรศัพท์ห้ามซ้ำ; การสร้างบุคลากรต้องมีประวัติการทำงานอย่างน้อยหนึ่งรายการ                                        | employee create validation         | MUTATION-VERIFIED                             |
| BR-031 | วันหยุดในปฏิทินใบลาถูก disable; approve, reject และ cancel ทำให้สถานะประวัติเปลี่ยนจริง                                                                | leave workflow                     | MUTATION-VERIFIED                             |
| BR-032 | การยกเลิกใบลาคืนโควตาหลังข้อมูลถูกโหลดใหม่ และยังเก็บเอกสารใบลา/คำขอยกเลิกในประวัติ                                                                    | leave quota/history                | MUTATION-VERIFIED                             |
| BR-033 | `ไปอบรม` เก็บเรื่อง หลักสูตร/โครงการ หน่วยงานผู้จัด สถานที่ ค่าใช้จ่าย และช่วงเวลาเพิ่มจากไปราชการทั่วไป                                               | official-duty training form/detail | MUTATION-VERIFIED                             |
| BR-034 | การเลือกกะใน cell ตารางเวรบันทึกทันที และผลรวมรายบุคคลคำนวณชั่วโมง/เงินจากชนิดกะ                                                                       | schedule matrix/totals             | MUTATION-VERIFIED                             |
| BR-035 | เบิกเกินคงเหลือไม่ได้ และการลบใบรับถูกปฏิเสธหากมีการเบิกที่อาศัย stock จากใบรับนั้น                                                                    | stock issue/receipt delete guard   | MUTATION-VERIFIED                             |
| BR-036 | การเบิกนอกแผนทำได้เมื่อผู้ใช้ยืนยัน และ utilization แผนใหม่รวมรายการเบิกเดิมใน fiscal year/workgroup/item เดียวกัน                                     | stock issue + annual plan          | MUTATION-VERIFIED; target semantics OPEN      |
| BR-037 | ครุภัณฑ์ใช้ชื่อ รหัส และราคาทุนเป็นขั้นต่ำ; ตารางค่าเสื่อมเริ่มต้นเป็น 5 ปี × 20%                                                                      | asset create/depreciation          | MUTATION-VERIFIED                             |
| BR-038 | รถใช้ชื่อและทะเบียนเป็นขั้นต่ำ และอาจยังไม่ผูกครุภัณฑ์ตอนสร้าง                                                                                         | vehicle create/detail              | MUTATION-VERIFIED; target ownership rule OPEN |
| BR-039 | BASE planning cycle ต้องเปิดจึงสร้างแผน tenant ได้; ขณะ BASE เปิด รอบเพิ่มเติม/เปลี่ยนแปลงถูก disable                                                  | affiliation cycle + tenant plan    | MUTATION-VERIFIED                             |
| BR-040 | ประกาศ active ระดับสังกัดกระจายเป็น banner ในขอบเขต tenant และประกาศหนึ่งรายการมี create/edit/activate/deactivate/delete                               | announcement CRUD/scope switch     | MUTATION-VERIFIED                             |
| BR-041 | การตั้งค่าหน่วยงานใช้ explicit Save และเผยสถานะ dirty/saved; field สำหรับเลขที่หนังสือแก้แล้วคืนค่าได้                                                 | tenant settings                    | MUTATION-VERIFIED                             |

### 8.2 กฎที่อนุมานและควรยืนยัน

| ID     | Candidate rule                                                                                     | Confidence / Verification                                               |
| ------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| BR-C01 | วิธีตีราคาสต็อกเป็น FIFO/weighted average/latest และวิธีทำ opening/adjustment                      | UNKNOWN — ledger quantity behavior ยืนยันแล้วแต่ valuation ยังไม่ยืนยัน |
| BR-C02 | การเบิกนอกแผนต้องห้าม เตือน หรือให้อนุมัติเป็นกรณีพิเศษ และรายการก่อนสร้างแผนควรนับย้อนหลังหรือไม่ | OPEN — ระบบอ้างอิงเตือนแล้วให้ทำต่อและนับย้อนหลัง                       |
| BR-C03 | อัตราค่าตอบแทน วันหยุด multiplier เวรซ้อน ขอบเขตการปัดเศษ และ basis ต่อกะทุกชนิด                   | PARTLY CONFIRMED — ตัวอย่างต่อชั่วโมงหนึ่งกะคำนวณตรง; rulebook ยัง OPEN |
| BR-C04 | วันลาไม่นับ/นับวันหยุดตามประเภทและกฎหมายที่เกี่ยวข้อง                                              | UNKNOWN — ต้องให้ฝ่ายบุคคลกำหนด                                         |
| BR-C05 | คำขอใช้รถต้องได้รับอนุมัติก่อนสร้าง usage log                                                      | INFERRED — ต้องทดสอบ transition                                         |
| BR-C06 | เลขไมล์กลับต้องไม่น้อยกว่าเลขไมล์ออก และเป็นฐานเลขไมล์ปัจจุบันของรถ                                | INFERRED — ต้องทดสอบ validation                                         |
| BR-C07 | การลบข้อมูลสำคัญเป็น soft delete/void ไม่ใช่ hard delete                                           | UNKNOWN ในระบบเดิม; REQUIRED สำหรับระบบใหม่                             |
| BR-C08 | รายงานใช้ข้อมูล snapshot ณ วันออกเอกสาร                                                            | UNKNOWN; REQUIRED เพื่อความถูกต้องย้อนหลัง                              |
| BR-C09 | แผนเพิ่มเติม/เปลี่ยนแปลงรวมกับ BASE ด้วยสูตรเฉพาะ                                                  | UNKNOWN — ขอ specification การเงิน                                      |
| BR-C10 | การย้ายบุคลากรเปลี่ยนหน่วยงานโดยคงประวัติการจ้าง                                                   | INFERRED; REQUIRED สำหรับระบบใหม่                                       |

### 8.3 Validation ที่ควรเป็นข้อกำหนดระบบใหม่

- วันที่สิ้นสุดต้องไม่น้อยกว่าวันเริ่ม; ตรวจช่วงทับซ้อนสำหรับลา เวร คำขอรถ และการจองรถ.
- national ID ต้องตรวจรูปแบบ/check digit แต่เข้ารหัสหรือ tokenization ตามความเสี่ยง; ห้ามใช้เป็น primary key.
- วันที่เกิด/เริ่มงานต้องตรวจ business plausibility และ minimum employment age ตามนโยบาย; ห้ามยอมรับวันที่เกิดเท่ากับวันเริ่มงานโดยไม่มี exception ที่มีเหตุผล/audit.
- จำนวน ราคา เลขไมล์ และมูลค่าต้องไม่ติดลบ; decimal precision ของเงินต้องตายตัว.
- Create/Update บุคลากรต้องเป็น atomic command ครอบคลุม person, profile, membership, access/identity และ employment history; validation/duplicate failure ต้อง rollback ทั้งหมดหรือใช้ saga ที่ชดเชยได้.
- ค่าโทรศัพท์/อีเมล/role ที่บันทึกต้อง round-trip กลับหน้า edit ได้ตรงเดิม; ห้ามให้ผู้ใช้กรอกใหม่เพื่อรักษาบัญชีโดยไม่ตั้งใจ.
- MVP ไม่มี online approval; ผู้บันทึกว่าเอกสารกระดาษได้รับอนุญาตต้องไม่เป็นผู้ยื่นรายการเดียวกัน ยกเว้น break-glass policy ที่มีผู้อนุญาต เหตุผล หลักฐาน และ immutable audit.
- ชุดรหัสครุภัณฑ์ต้อง unique ภายใน scope ที่ตกลง และสร้างด้วย transaction-safe sequence.
- สต็อกต้องใช้ immutable movement ledger; การแก้ย้อนหลังสร้าง adjustment ไม่แก้ยอดคงเหลือตรง ๆ.
- การ void/reverse ใบรับต้องตรวจ downstream issue และปฏิเสธหาก reversal ทำให้ยอดติดลบ; การลบใบเบิก/ใบรับต้องสร้าง reversing movement ไม่ลบ ledger เดิม.
- เงิน ค่าเสื่อม ราคา และยอดรายงานต้องใช้ fixed decimal และ round ตาม boundary ที่ Rulebook กำหนด; ห้ามใช้ binary float ในค่าที่แสดง/เก็บ.
- การล็อกแผนต้องใช้ server-side state + version ไม่ใช่แค่ disable control.
- ผู้ร่วมเดินทาง ผู้มีสิทธิ์รถ ผู้ลงนาม และผู้อนุมัติต้องอยู่ในองค์กร/สิทธิ์ที่ถูกต้อง ณ effective date.
- ไฟล์โลโก้ ลายเซ็น และภาพทรัพย์สินต้องตรวจ MIME จริง สแกน malware จำกัดขนาด และใช้ signed URL.

### 8.4 Target-product decisions สำหรับ People, Leave และ ฉ.10/11

| ID     | Decision/guardrail                                                                                                                                      | Status                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| TP-001 | `Person` ต้องแยกจาก `EmployeeProfile`, `UserIdentity`, `Membership` และ `EmploymentHistory`; ห้ามผูกบุคคลกับ รพ.สต. ด้วย foreign key เดียวที่แก้ทับอดีต | PROPOSED — required foundation           |
| TP-002 | เมื่อย้ายหน่วยงาน ให้ปิด membership เดิมและเปิด membership ใหม่โดยรักษาประวัติ                                                                          | PROPOSED — edge cases OPEN               |
| TP-003 | One Data เป็น source of truth ของข้อมูลลา; เฉพาะ `PAPER_APPROVED` ที่ยังมีผลเท่านั้นเป็น input ให้ Special-Allowances                                    | OWNER-CONFIRMED                          |
| TP-004 | One Data ไม่สร้างสูตร/Calculation Engine ฉ.10/11 ซ้ำ; `Special-Allowances` เดิมเป็นเจ้าของสูตร ตัวแปรอื่น รอบ ผล lock adjustment และ report           | OWNER-CONFIRMED + CODEBASE-VERIFIED      |
| TP-005 | ทุกการ sync ต้องมี period, person mapping, source cutoff, leave revision/source refs และ source hash เพื่อให้ Special-Allowances snapshot/reconcile ได้ | OWNER-CONFIRMED + PROPOSED CONTRACT      |
| TP-006 | เมื่อรอบ Special-Allowances ล็อกแล้ว ผลและไฟล์รายงานต้องไม่เปลี่ยนตามข้อมูลลา People หรือ Employment ปัจจุบัน                                           | OWNER-CONFIRMED                          |
| TP-007 | การแก้ลาหลังล็อกสร้าง adjustment อ้างรอบเดิมใน Special-Allowances; ห้ามแก้ผลเดิมเงียบ ๆ                                                                | OWNER-CONFIRMED                          |
| TP-008 | Excel/PDF ฉ.10/11 เป็น artifact ของ Special-Allowances; One Data แสดงหรือดาวน์โหลดผ่าน scoped API โดยไม่ regenerate ตัวเลขเอง                          | OWNER-CONFIRMED + CODEBASE-VERIFIED      |
| TP-009 | ฐานกฎสำหรับข้าราชการ อบจ. รุ่นแรกคือประกาศ ก.จ. เรื่องมาตรฐานทั่วไปว่าด้วยการลาของข้าราชการองค์การบริหารส่วนจังหวัด พ.ศ. 2569 และแบบแนบท้าย         | LEGAL-SOURCE; HR SIGN-OFF REQUIRED       |
| TP-010 | MVP ใช้ Paper-first: กรอก/ส่ง → พิมพ์หรือนำไปลงนามภายนอกตามวิธีปฏิบัติงาน → เจ้าหน้าที่บันทึกผล `PAPER_APPROVED/PAPER_REJECTED`; ไม่มี online approval chain และ DOCX เป็นส่วนขยายภายหลัง | OWNER-CONFIRMED |
| TP-011 | บุคลากรต่างสถานะการจ้างต้องเลือก `LeavePolicyProfile` ตามฐานกฎหมาย/ช่วงมีผล; ห้ามใช้สิทธิ์ข้าราชการ อบจ. กับพนักงานจ้าง/ลูกจ้างโดยอัตโนมัติ          | LEGAL GUARDRAIL                          |
| TP-012 | รอบเปิด sync ซ้ำได้; ค่าเริ่มต้นช่วงตรวจสอบคือ 3 วันทำการหลังสิ้นเดือนแบบ configurable; หลังจ่าย/ล็อกใช้ adjustment รอบถัดไป                         | OWNER-CONFIRMED DIRECTION + CONFIGURABLE |
| TP-013 | Portal เป็นเจ้าของ login/module access และ One Data/Special-Allowances แยก session/authorization ของตน; ห้ามแชร์ password หรือ database               | CODEBASE-VERIFIED + PROPOSED ADOPTION    |

ฐานเอกสารกฎหมายที่ตรวจแล้ว:

- [ประกาศ ก.จ. ก.ท. และ ก.อบต. เรื่องมาตรฐานทั่วไปว่าด้วยการลา พ.ศ. 2569 — กรมส่งเสริมการปกครองท้องถิ่น](https://www.dla.go.th/land/tempHome.do?departmentLv2Id=98266y3oq5k96svhofn9vvklmz3tmc2skw)
- [ประกาศฉบับข้าราชการองค์การบริหารส่วนจังหวัด พ.ศ. 2569](https://infocenter.oic.go.th/upload/cms/1777261294_7413.pdf)
- [ชุดแบบฟอร์มแนบท้ายฉบับ Word](https://infocenter.oic.go.th/upload/cms/1777261315_7826.docx)
- [ตารางกำหนดผู้มีอำนาจพิจารณาอนุญาตการลา](https://infocenter.oic.go.th/upload/cms/1777261315_9244.docx)

ประกาศกำหนดการลา 11 กลุ่มและแบบฟอร์มที่เกี่ยวข้องสำหรับข้าราชการ อบจ. แต่ Rulebook implementation ยังต้องให้ฝ่ายบุคคลยืนยันการนับวัน สิทธิ์สะสม เอกสารประกอบ และกลุ่มบุคลากรที่อยู่ใต้ประกาศนี้. สำหรับพนักงานจ้าง ลูกจ้างประจำ ผู้ช่วยราชการ หรือสถานะอื่น ต้องมี policy profile และฐานระเบียบแยกก่อนเปิดใช้กับกลุ่มนั้น.

### 8.5 Reference defects และ anti-requirements จาก mutation testing

รายการต่อไปนี้คือ defect/risk ของระบบอ้างอิง ไม่ใช่ข้อกำหนดที่ต้องสร้างตาม:

| ID          | หลักฐานที่พบ                                                                                                              | ความเสี่ยง                                       | Guardrail ของระบบใหม่                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| REF-DEF-001 | การสร้างบุคลากรครั้งแรกแจ้งโทรศัพท์ซ้ำและค้างหน้า create แต่ระเบียน person/core ถูกสร้างแล้ว ขณะที่ access/history ไม่ครบ | partial aggregate, duplicate retry, ข้อมูลกำพร้า | atomic command + idempotency key + rollback/integration test              |
| REF-DEF-002 | หน้า edit ไม่แสดงอีเมล/โทรศัพท์ access ที่เพิ่งบันทึก แม้ list ยังแสดงโทรศัพท์                                            | overwrite credential/contact โดยไม่ตั้งใจ        | read-after-write/round-trip contract test และแยก contact จาก identity     |
| REF-DEF-003 | บัญชีเดียวกันยื่นและอนุมัติใบลาของตนเองได้                                                                                | fraud/SoD violation                              | MVP ไม่มี online approval; `paper_result_recorded_by != requester_id` และ break-glass audit |
| REF-DEF-004 | โควตาหลังยกเลิกยังแสดงค่าเดิมจน reload                                                                                    | ผู้ใช้ตัดสินใจจาก stale projection               | transactional balance ledger + cache invalidation + consistency indicator |
| REF-DEF-005 | วันที่เกิดเท่ากับวันเริ่มงานและวันปัจจุบันผ่าน validation                                                                 | ข้อมูลบุคลากรไร้ความสมเหตุผล                     | age/date plausibility rule + migration exception workflow                 |
| REF-DEF-006 | แก้ไขไปราชการสำเร็จแต่ toast ระบุว่าแก้ “ใบลา”                                                                            | domain feedback ผิด ทำให้ผู้ใช้ไม่มั่นใจ         | typed notification/event + UX regression test                             |
| REF-DEF-007 | ตารางเวร auto-save แบบเงียบ ไม่มี saved/error feedback                                                                    | เข้าใจผิดว่าบันทึกแล้วและแก้ชนกัน                | pending/saved/error state, optimistic version และ retry ที่มองเห็นได้     |
| REF-DEF-008 | ค่าเสื่อมปีหนึ่งแสดง `199.999999…`                                                                                        | ยอดรายงาน/บัญชีผิดรูป                            | fixed decimal, explicit rounding และ golden schedule test                 |
| REF-DEF-009 | ลบยานพาหนะแล้ว cascade ประวัติคำขอ การใช้ ซ่อม และอุบัติเหตุทั้งหมด                                                       | สูญเสียหลักฐานราชการ/audit                       | archive/void vehicle; child histories immutable ตาม retention             |
| REF-DEF-010 | ระหว่างมีบุคลากรทดสอบ summary สังกัดรวม 13 คน แต่ card หน่วยงานรายแถวแสดง 12 คน                                           | aggregate/projection ไม่สอดคล้อง                 | source/version watermark, reconciliation job และ consistency SLO          |
| REF-DEF-011 | ฟอร์มใบลาคงค่าหลังบันทึกและการกดซ้ำไม่มี feedback ชัด แม้ไม่เห็นรายการซ้ำ                                                 | duplicate intent/unclear idempotency             | clear success transition, disable resubmit, idempotency key               |
| REF-DEF-012 | การลบบุคลากร/แผน/รถ/ครุภัณฑ์เป็น hard-delete flow ที่เข้าถึงได้ง่าย                                                       | สูญเสียประวัติและ reference                      | soft delete/void/supersede + dependency impact preview + reason           |

ข้อสรุปเชิงออกแบบ: ให้ใช้พฤติกรรม `BR-*` เป็น evidence ของ domain แต่ทุก acceptance criterion ต้องตรวจผ่าน guardrail ในตารางนี้ก่อนอนุมัติ implementation.

---

## 9. Conceptual Data Model

### 9.1 กลุ่ม entity

**Organization & Identity**

- `Affiliation`, `District`, `Tenant`, `OrganizationOrder`
- `Person`, `EmployeeProfile`, `TenantMembership`, `AffiliationMembership`
- `Role`, `Permission`, `RolePermission`, `FunctionalAssignment`
- `PositionGroup`, `Position`, `WorkGroup`, `EmployeeType`
- `EmploymentHistory`, `ProfessionalLicense`, `Address`, `UserCredential/IdentityLink`

**Workforce Operations**

- `ShiftType`, `SchedulePeriod`, `ShiftAssignment`, `ScheduleInspector`
- `Holiday`
- `LeaveType`, `LeavePolicyProfile`, `LeavePolicy`, `LeaveBalance`, `LeaveRequest`, `LeaveDocumentRevision`, `LeaveExternalDecision`
- `OfficialDutyRequest`, `OfficialDutyCompanion`, `OfficialDutyApproval`

**Special-Allowances Integration — First Production Boundary**

- `ExternalSystem`, `ExternalPersonMapping`
- `LeaveExportBatch`, `LeaveExportItem`, `IntegrationDelivery`, `IntegrationReconciliation`
- `ExternalAllowancePeriodRef`, `ExternalAllowanceReportRef` เป็น reference/projection เท่านั้น; calculation entities จริงอยู่ใน `Special-Allowances`

**Inventory**

- `SupplyType`, `SupplyCategory`, `SupplyItem`, `UnitOfMeasure`, `StorageLocation`
- `Vendor`
- `StockReceipt`, `StockReceiptLine`
- `StockIssue`, `StockIssueLine`
- `StockMovement`, `StockBalance`
- `AnnualIssuePlan`, `AnnualIssuePlanLine`

**Assets & Vehicles**

- `Asset`, `AssetType`, `AssetAcquisition`, `LandBuildingDetail`
- `AssetDepreciation`, `AssetDisposal`, `AssetBenefit`, `AssetCustodian`, `AssetRepair`
- `Vehicle`, `VehicleAuthorization`, `VehicleRequest`, `VehicleUsage`
- `VehicleAccident`, `AccidentParty`, `AccidentInjury`, `AccidentWitness`, `VehicleMaintenance`

**Finance**

- `FiscalYear`, `PlanningCycle`, `PlanRevision`, `FinancialPlan`
- `RevenueType`, `RevenueItem`, `PlannedRevenue`
- `ExpenseCategory`, `ExpenseSubtype`, `PlannedExpense`
- `MonthlyIncomeActual`, `MonthlyExpenseActual`
- `PlanLock`, `PriceSource`

**Documents, Communication & Governance**

- `ReportDefinition`, `ReportRun`, `DocumentNumber`, `SignatureSnapshot`
- `Announcement`
- `EmployeeTransfer`, `EmployeeTransferApproval`
- `Attachment`, `AuditEvent`, `OutboxEvent`, `Notification`
- `OrganizationSetting`, `UserSignature`

### 9.2 Mermaid ER Diagram (conceptual)

```mermaid
erDiagram
    AFFILIATION ||--o{ TENANT : governs
    AFFILIATION ||--o{ AFFILIATION_MEMBERSHIP : grants
    TENANT ||--o{ TENANT_MEMBERSHIP : employs_or_grants
    PERSON ||--o{ TENANT_MEMBERSHIP : has
    PERSON ||--o{ AFFILIATION_MEMBERSHIP : has
    PERSON ||--o{ EMPLOYMENT_HISTORY : owns
    PERSON ||--o{ PROFESSIONAL_LICENSE : owns
    POSITION ||--o{ TENANT_MEMBERSHIP : assigns
    WORK_GROUP ||--o{ TENANT_MEMBERSHIP : groups

    AFFILIATION ||--o{ SHIFT_TYPE : defines
    TENANT ||--o{ SCHEDULE_PERIOD : owns
    SCHEDULE_PERIOD ||--o{ SHIFT_ASSIGNMENT : contains
    PERSON ||--o{ SHIFT_ASSIGNMENT : works

    LEAVE_TYPE ||--o{ LEAVE_POLICY : governed_by
    PERSON ||--o{ LEAVE_REQUEST : requests
    LEAVE_REQUEST ||--o{ LEAVE_DOCUMENT_REVISION : renders
    LEAVE_REQUEST ||--o{ LEAVE_EXTERNAL_DECISION : records_paper_result
    PERSON ||--o{ OFFICIAL_DUTY_REQUEST : requests
    OFFICIAL_DUTY_REQUEST ||--o{ OFFICIAL_DUTY_COMPANION : includes

    EXTERNAL_SYSTEM ||--o{ EXTERNAL_PERSON_MAPPING : maps
    PERSON ||--o{ EXTERNAL_PERSON_MAPPING : identifies
    TENANT ||--o{ LEAVE_EXPORT_BATCH : exports
    LEAVE_EXPORT_BATCH ||--|{ LEAVE_EXPORT_ITEM : contains
    LEAVE_REQUEST ||--o{ LEAVE_EXPORT_ITEM : contributes
    LEAVE_EXPORT_BATCH ||--o{ INTEGRATION_DELIVERY : delivers
    LEAVE_EXPORT_BATCH ||--o{ INTEGRATION_RECONCILIATION : reconciles

    TENANT ||--o{ SUPPLY_ITEM : owns
    VENDOR ||--o{ STOCK_RECEIPT : supplies
    STOCK_RECEIPT ||--|{ STOCK_RECEIPT_LINE : contains
    STOCK_ISSUE ||--|{ STOCK_ISSUE_LINE : contains
    SUPPLY_ITEM ||--o{ STOCK_MOVEMENT : moves
    ANNUAL_ISSUE_PLAN ||--|{ ANNUAL_ISSUE_PLAN_LINE : contains

    TENANT ||--o{ ASSET : owns
    ASSET ||--o| VEHICLE : may_represent
    ASSET ||--o{ ASSET_DEPRECIATION : depreciates
    ASSET ||--o{ ASSET_REPAIR : repaired
    ASSET ||--o| ASSET_DISPOSAL : disposed_by
    VEHICLE ||--o{ VEHICLE_AUTHORIZATION : authorizes
    VEHICLE ||--o{ VEHICLE_REQUEST : requested
    VEHICLE_REQUEST ||--o| VEHICLE_USAGE : produces
    VEHICLE ||--o{ VEHICLE_ACCIDENT : has
    VEHICLE ||--o{ VEHICLE_MAINTENANCE : maintained

    AFFILIATION ||--o{ PLANNING_CYCLE : controls
    TENANT ||--o{ FINANCIAL_PLAN : prepares
    PLANNING_CYCLE ||--o{ FINANCIAL_PLAN : permits
    REVENUE_ITEM ||--o{ PLANNED_REVENUE : categorizes
    EXPENSE_CATEGORY ||--o{ PLANNED_EXPENSE : categorizes
    FINANCIAL_PLAN ||--o{ PLANNED_REVENUE : contains
    FINANCIAL_PLAN ||--o{ PLANNED_EXPENSE : contains
    TENANT ||--o{ MONTHLY_INCOME_ACTUAL : records
    TENANT ||--o{ MONTHLY_EXPENSE_ACTUAL : records

    PERSON ||--o{ EMPLOYEE_TRANSFER : subject
    TENANT ||--o{ EMPLOYEE_TRANSFER : source_or_destination
    AFFILIATION ||--o{ ANNOUNCEMENT : publishes
    PERSON ||--o{ AUDIT_EVENT : acts
```

### 9.3 Aggregate boundaries ที่แนะนำ

- `EmployeeOnboarding` command ต้องสร้าง/เชื่อม `Person` + profile + primary membership + access/identity + employment history แบบ atomic และ idempotent; aggregate ภายในอาจแยกตารางได้แต่ห้ามเผย partial success. การแก้ข้อมูลต้องบันทึกชนิด `CORRECTION` หรือ `REAL_CHANGE` พร้อม `effective_from` และรักษา snapshot เก่า.
- `SchedulePeriod` aggregate ต่อ tenant/month ลดการชนกันของการแก้แต่ละ cellด้วย optimistic versioning.
- `LeaveRequest` เป็น document-centric aggregate แยกจาก `OfficialDutyRequest`: เก็บ draft, document revisions และผลอนุญาตจากกระดาษ. การยืนยัน `PAPER_APPROVED` ต้องบังคับ separation ระหว่าง requester กับ verifier และปรับ balance/eligibility ใน transaction เดียว.
- `LeaveExportBatch` เป็น integration aggregate ของ One Data: สรุปเฉพาะ effective `PAPER_APPROVED` leave ต่อ period/person พร้อม source refs/hash. `CalculationRun`/ผล/lock/adjustment เป็น aggregate ของ Special-Allowances และห้ามจำลองซ้ำในฐานข้อมูล One Data.
- `SupplyItem` ไม่เก็บยอดเป็นแหล่งความจริงเพียงฟิลด์เดียว; source of truth คือ `StockMovement`, ส่วน `StockBalance` เป็น projection. Receipt/Issue ที่ posted ใช้ reversal movement และ dependency guard แทน hard delete.
- `Asset` เป็น supertype; vehicle อ้าง `asset_id` แบบ optional แต่ควรกำหนดนโยบายให้ยานพาหนะที่เป็นกรรมสิทธิ์ต้องเชื่อม. เงินและค่าเสื่อมทั้งหมดเป็น fixed decimal; vehicle/asset ใช้ archive/void โดยไม่ cascade-delete history.
- `FinancialPlan` แยกตาม tenant/fiscal year/revision type/version และ immutable เมื่อ locked.
- `ReportRun` เก็บ parameters, data version/hash, signer snapshot และตำแหน่งไฟล์ เพื่อพิมพ์ซ้ำได้ตรงเดิม.
- `ExternalAllowanceReportRef` เชื่อมหน้าจอ One Data กับ report artifact/run ใน Special-Allowances; การดาวน์โหลดรอบเก่าต้องอ้าง external artifact เดิม ไม่ query live data แล้วสร้างตัวเลขใหม่.

---

## 10. Observed API Catalog

### 10.1 วิธีและข้อจำกัดของหลักฐาน

รายการนี้มาจาก URL ของทรัพยากรที่หน้าเว็บเรียกระหว่าง navigation ตามปกติ **[CONFIRMED URL]** ไม่ได้ดัก request/response body หรืออ่าน credential; แม้ revision 1.4 ทดสอบ mutation ผ่าน UI แต่ไม่ได้บันทึก mutation payload มาใช้สร้าง catalog ดังนั้น:

- HTTP method ที่ใส่ `GET?` เป็นการอนุมานจากการโหลดข้อมูลหน้า **[INFERRED]**
- status code, headers, request body, response schema, error schema, pagination contract และ authorization enforcement **[UNKNOWN]**
- ตัวเลข ID จริงถูกแทนด้วย `{tenantId}`, `{affiliationId}`, `{vehicleId}`, `{employeeId}` เพื่อไม่ผูก blueprint กับข้อมูลตัวอย่าง
- endpoint ที่เสนอสำหรับระบบใหม่อยู่ในหัวข้อ 18 และไม่จำเป็นต้องเลียนแบบ endpoint เหล่านี้

### 10.2 Identity, session และข้อมูลร่วม

| Method | Observed path                       | Purpose                                      | Evidence                          |
| ------ | ----------------------------------- | -------------------------------------------- | --------------------------------- |
| GET?   | `/api/auth/me`                      | ข้อมูลผู้ใช้/session และ scope ที่เข้าถึงได้ | URL CONFIRMED; semantics INFERRED |
| GET?   | `/api/auth/refresh`                 | ต่ออายุ session/token                        | URL CONFIRMED; semantics INFERRED |
| GET?   | `/api/announcements`                | ประกาศที่ active                             | URL CONFIRMED                     |
| GET?   | `/api/tenants/{tenantId}`           | metadata หน่วยงาน                            | URL CONFIRMED                     |
| GET?   | `/api/affiliations`                 | รายการสังกัดที่เกี่ยวข้อง                    | URL CONFIRMED                     |
| GET?   | `/api/affiliations/{affiliationId}` | metadata สังกัด                              | URL CONFIRMED                     |
| GET?   | `/api/employees`                    | รายการบุคลากรสำหรับ selector/list            | URL CONFIRMED                     |

### 10.3 Dashboard และบุคลากร

| Method | Observed path/query                              | Purpose                       | Evidence      |
| ------ | ------------------------------------------------ | ----------------------------- | ------------- |
| GET?   | `/api/tenants/{tenantId}/dashboard`              | KPI dashboard หน่วยงาน        | URL CONFIRMED |
| GET?   | `/api/affiliations/{affiliationId}/dashboard`    | KPI dashboard สังกัด          | URL CONFIRMED |
| GET?   | `/api/employees?isActive=all`                    | directory รวม active/inactive | URL CONFIRMED |
| GET?   | `/api/position-groups`                           | กลุ่มตำแหน่ง                  | URL CONFIRMED |
| GET?   | `/api/employee-transfer/requests?status=PENDING` | คำขอย้ายตามสถานะ              | URL CONFIRMED |

### 10.4 ลา วันหยุด และไปราชการ

| Method | Observed path/query                                                     | Purpose                      | Evidence      |
| ------ | ----------------------------------------------------------------------- | ---------------------------- | ------------- |
| GET?   | `/api/leaves?month={m}&year={gregorianYear}`                            | รายการลารายเดือนสำหรับปฏิทิน | URL CONFIRMED |
| GET?   | `/api/official-duties?month={m}&year={gregorianYear}`                   | ไปราชการรายเดือน             | URL CONFIRMED |
| GET?   | `/api/holidays?year={gregorianYear}`                                    | วันหยุดรายปี                 | URL CONFIRMED |
| GET?   | `/api/leaves/quota-summary?employeeId={employeeId}&year={buddhistYear}` | สรุปโควตาบุคคล               | URL CONFIRMED |
| GET?   | `/api/leaves/history?year={buddhistYear}`                               | ประวัติการลา                 | URL CONFIRMED |
| GET?   | `/api/official-duties?fiscalYear={buddhistYear}`                        | ประวัติไปราชการปีงบ          | URL CONFIRMED |

ข้อสังเกต: UI/endpoint ใช้ทั้งปี ค.ศ. และ พ.ศ. ในหน้ากระบวนงานเดียวกัน **[CONFIRMED]** ระบบใหม่ควรใช้ ISO date/ค.ศ. ใน storage/API และแปลง พ.ศ. ที่ presentation layer เพื่อลดความผิดพลาด

### 10.5 วัสดุ

| Method | Observed path/query                                             | Purpose                          | Evidence      |
| ------ | --------------------------------------------------------------- | -------------------------------- | ------------- |
| GET?   | `/api/supplies?page={p}&limit={n}&sort={field}&dir={direction}` | รายการวัสดุพร้อม pagination/sort | URL CONFIRMED |
| GET?   | `/api/supply-types`                                             | ประเภทวัสดุหลัก                  | URL CONFIRMED |

endpoint สำหรับ receipt, issue, annual plan และ vendor ไม่ได้ปรากฏในชุดทรัพยากรที่บันทึก ณ หน้ารายการที่ตรวจ **[UNKNOWN]**

### 10.6 ยานพาหนะ

| Method | Observed path/query                               | Purpose                  | Evidence                          |
| ------ | ------------------------------------------------- | ------------------------ | --------------------------------- |
| GET?   | `/api/vehicles/{vehicleId}`                       | รายละเอียดรถ             | URL CONFIRMED                     |
| GET?   | `/api/vehicles/{vehicleId}/usages`                | บันทึกการใช้             | URL CONFIRMED                     |
| GET?   | `/api/vehicles/{vehicleId}/maintenance`           | ซ่อมบำรุง                | URL CONFIRMED                     |
| GET?   | `/api/vehicles/{vehicleId}/accidents`             | อุบัติเหตุ               | URL CONFIRMED                     |
| GET?   | `/api/vehicles/permissions?global=true`           | สิทธิ์รถระดับรวม         | URL CONFIRMED; semantics INFERRED |
| GET?   | `/api/vehicles/permissions?vehicleId={vehicleId}` | ผู้มีสิทธิ์ของรถเฉพาะคัน | URL CONFIRMED                     |

### 10.7 การเงิน

| Method | Observed path/query                                                 | Purpose                  | Evidence      |
| ------ | ------------------------------------------------------------------- | ------------------------ | ------------- |
| GET?   | `/api/financial-plan/cycles`                                        | วงรอบที่หน่วยงานใช้ได้   | URL CONFIRMED |
| GET?   | `/api/financial-plan/categories`                                    | หมวดรายจ่าย              | URL CONFIRMED |
| GET?   | `/api/financial-plan/expense-subtypes`                              | หมวดย่อยรายจ่าย          | URL CONFIRMED |
| GET?   | `/api/financial-plan/price-sources`                                 | แหล่งอ้างอิงราคา         | URL CONFIRMED |
| GET?   | `/api/monthly-actuals/summary?year={buddhistYear}`                  | สรุปรายเดือน             | URL CONFIRMED |
| GET?   | `/api/monthly-actuals/income?year={buddhistYear}`                   | รายรับจริง               | URL CONFIRMED |
| GET?   | `/api/monthly-actuals/expense?year={buddhistYear}`                  | รายจ่ายจริง              | URL CONFIRMED |
| GET?   | `/api/monthly-actuals/comparison?year={buddhistYear}`               | แผนเทียบจริง             | URL CONFIRMED |
| GET?   | `/api/financial-plan-admin/summary?fiscalYear={year}&revision=BASE` | ภาพรวมแผนระดับสังกัด     | URL CONFIRMED |
| GET?   | `/api/financial-plan-admin/personnel?fiscalYear={year}`             | แผนบุคลากร/ผู้รับจ้างรวม | URL CONFIRMED |
| GET?   | `/api/financial-plan-admin/cycles/{fiscalYear}`                     | สถานะวงรอบรายปี          | URL CONFIRMED |
| GET?   | `/api/financial-plan-admin/plans?fiscalYear={year}`                 | แผนทุกหน่วยงาน           | URL CONFIRMED |

### 10.8 External resources ที่สังเกตได้

| Service        | Observed use                            | Confidence                                |
| -------------- | --------------------------------------- | ----------------------------------------- |
| Umami          | script และ `/api/send` สำหรับ analytics | URL CONFIRMED; payload/consent UNKNOWN    |
| Cloudflare RUM | ทรัพยากรวัดประสิทธิภาพเว็บ              | CONFIRMED resource; configuration UNKNOWN |
| Line OA        | ช่องทางแจ้งปัญหา                        | CONFIRMED                                 |
| NocoDB form    | แบบฟอร์มแจ้งปัญหาภายนอก                 | CONFIRMED                                 |
| GMTech website | ลิงก์ผู้พัฒนา                           | CONFIRMED                                 |

ไม่พบ console warning/error ในช่วงตรวจครั้งสุดท้าย **[CONFIRMED ณ session นั้นเท่านั้น]** ไม่ใช่หลักฐานว่าระบบไม่มีข้อผิดพลาดในทุกเส้นทาง

---

## 11. Dashboard & Reporting

### 11.1 KPI ที่พบ

| Dashboard     | KPI/visual                                         | Logic ที่สังเกตได้                                       | Confidence                                           |
| ------------- | -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| หน่วยงาน      | จำนวนบุคลากรทั้งหมด/มาปฏิบัติงาน/ลา/ไปราชการวันนี้ | นับตามสถานะรายวัน                                        | UI CONFIRMED; สูตร precedence เมื่อสถานะซ้อน UNKNOWN |
| หน่วยงาน      | จำนวนกลุ่มตำแหน่งและสัดส่วนตำแหน่ง                 | group/count บุคลากร                                      | CONFIRMED                                            |
| หน่วยงาน      | ขนาดองค์กรและสถานะอัตรากำลังรายกลุ่ม/ตำแหน่ง       | เทียบ actual กับ benchmark แล้วแสดงครบ/ขาด/เกิน/ไม่จำกัด | UI CONFIRMED; benchmark source UNKNOWN               |
| หน่วยงาน      | การเงินจริง/คงเหลือ                                | summary ของผลรายเดือนและยอดยกมา                          | CONFIRMED UI/API URL; สูตรละเอียด UNKNOWN            |
| สังกัด        | จำนวนหน่วยงาน บุคลากรรวม ค่าเฉลี่ยต่อหน่วยงาน      | aggregate cross-tenant                                   | CONFIRMED                                            |
| สังกัด        | อัตรากำลังตามขนาดองค์กร                            | count complete/room/over/no-size                         | CONFIRMED                                            |
| สังกัดการเงิน | ยอดยกมา รายรับคาดการณ์ รายจ่าย เงินยกไป การใช้แผน  | sum แผนทุกหน่วยงาน                                       | CONFIRMED UI; rounding/revision logic UNKNOWN        |
| สังกัดการเงิน | จำนวนแผนล็อกและความครบถ้วนการบันทึก                | count/status per tenant                                  | CONFIRMED                                            |
| รายเดือน      | รายรับจริง รายจ่ายจริง สุทธิ คงเหลือ % ใช้แผน      | aggregation Oct–Sep                                      | CONFIRMED UI; exact formulas partly UNKNOWN          |

### 11.2 สูตรที่ยืนยัน/อนุมานได้

สมการต่อไปนี้เป็น specification ที่เหมาะสมสำหรับระบบใหม่ โดยระบุความมั่นใจต่อสูตร:

```text
net_actual = total_income_actual - total_expense_actual
```

**[INFERRED]** จาก KPI รายรับ/รายจ่าย/สุทธิ; ต้องยืนยันว่ารายได้รวมยอดยกมาหรือไม่ในแต่ละ card

```text
closing_balance = opening_balance + income_actual - expense_actual
```

**[INFERRED]** UI ระบุว่าคงเหลือต้องอาศัยยอดยกมา และกราฟรายรับไม่รวมยอดยกมา **[CONFIRMED ข้อความ]**

```text
budget_utilization_pct = expense_actual / approved_plan_expense * 100
```

**[INFERRED]** ควรกำหนดกรณี denominator = 0, การรวม revision และการปัดเศษ

```text
staffing_gap = actual_headcount - benchmark_headcount
status = under if gap < 0; complete if gap = 0; over if gap > 0
```

**[INFERRED]** UI มีครบ/ขาด/เกินและ “ไม่จำกัด” แต่แหล่ง benchmark/ช่วงที่ถือว่าครบ **[UNKNOWN]**

```text
shift_hours = end_time - start_time
shift_compensation =
  rate_per_shift                        when basis = PER_SHIFT
  worked_hours * rate_per_hour          when basis = PER_HOUR
```

**[INFERRED]** จากข้อมูลชนิดกะและยอดรวม; rate, rounding, holiday multiplier และ overlapping shifts **[UNKNOWN]**

```text
straight_line_annual_depreciation = (cost - residual_value) / useful_life_years
```

UI ยืนยันเส้นตรง 5 ปีจากราคาทุน **[CONFIRMED]** แต่ residual value, partial year, start convention, accumulated depreciation และ impairment **[UNKNOWN]**

### 11.3 Report catalog

**ระดับหน่วยงาน — 17 แบบ [CONFIRMED]**

| กลุ่ม   | รายงาน                                                                                                     | Parameters ที่เห็น/คาด                                                                                                           | Output    |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| เวร     | ตารางเวร                                                                                                   | เดือน ปี ผู้อนุมัติ                                                                                                              | PDF/print |
| OT      | ใบลงชื่อ, ใบสำคัญรับเงิน, สรุป, ขออนุมัติ                                                                  | เดือน ปี เลขหนังสือ วันที่ ผู้จัดทำ/ตรวจ/อนุมัติ                                                                                 | PDF/print |
| ฉ.11    | ใบขอรับเงินค่าตอบแทน; บันทึกขออนุมัติเบิกจ่าย; หลักฐานการจ่าย; สรุปคำขอรายเดือน; สรุปทั้งปี; แบบคำขอทั้งปี | เดือน/ปี, ผู้ลงนาม/ผู้รับรอง/หัวหน้าผู้ควบคุม; บางแบบมีวันที่ เลขหนังสือแยกกลุ่มการจ้าง เดือนคิดอายุงาน ช่วงคำขอ และข้อมูลประชุม | PDF/print |
| ลา      | สรุปการลา                                                                                                  | ปี/เดือน พนักงาน/ประเภท/สถานะ                                                                                                    | PDF/print |
| วัสดุ   | คงเหลือ, ledger, มูลค่ารายเดือน, รายละเอียดคงเหลือปีงบ                                                     | เดือน/ปีงบ วัสดุ/หมวด                                                                                                            | PDF/print |
| ฝึกอบรม | ทะเบียนฝึกอบรม                                                                                             | ช่วงเวลา/บุคลากร                                                                                                                 | PDF/print |

**ระดับสังกัด [CONFIRMED]**

- รายงาน ฉ.5 รวมทุกหน่วยงาน
- สรุปการลารวมทุกหน่วยงาน
- รายงานวงรอบการเงิน: รายรับคาดการณ์, รายจ่ายเงินบำรุง, งบ อปท./SML, รวม, สรุปรายรับ-รายจ่าย, แยกรายการ, ครุภัณฑ์ทั้งหมด, ค่าเสื่อม, ครุภัณฑ์ตามประเภท
- รายงานกำลังคน/ผู้รับจ้าง แยกทั้งสังกัดหรือรายหน่วยงาน

**ยานพาหนะ [CONFIRMED]**

- ทะเบียนรถแบบ 2
- คำขอใช้รถแบบ 3
- บันทึกการใช้แบบ 4
- รายงานอุบัติเหตุแบบ 5
- รายงานซ่อมบำรุงแบบ 6
- รายงานรถรายเดือน

**ข้อสังเกตเรื่อง ฉ.10 [CONFIRMED/OPEN]**

- ไม่พบ card/route รายงานชื่อ ฉ.10 ใน catalog 17 แบบของขอบเขตหน่วยงานที่สำรวจ; พบหมวด `พตส.` จำนวน 0.
- ระบบใหม่ยังคงมี ฉ.10 ใน first-production scope ตามทิศทางโครงการ แต่ต้องได้ชื่อทางการ แบบฟอร์ม และ mapping ว่าเกี่ยวข้องกับ `พตส.` หรือไม่จากเจ้าของงานก่อนออกแบบ schema/template.

### 11.4 Reporting requirements สำหรับระบบใหม่

- Report definition ต้อง versioned; template เปลี่ยนแล้วเอกสารเก่าต้องพิมพ์ซ้ำได้เหมือนเดิม.
- Report run ต้อง snapshot ชื่อ ตำแหน่ง ลายเซ็น เลขหนังสือ พารามิเตอร์ และ source record versions.
- Preview กับ downloaded PDF ต้องใช้ render pipeline เดียวกัน.
- ตัวเลขทุกจุดต้องมี data dictionary: definition, filter, timezone, fiscal calendar, rounding, inclusion/exclusion.
- Drill-down จาก KPI ไปยังรายการต้นทางต้องรักษา filter และ scope.
- Export ข้อมูลบุคคลต้องจำกัดสิทธิ์ ใส่ watermark/ผู้ส่งออก และลง audit.
- รายงานขนาดใหญ่ควรสร้างผ่าน background job พร้อมสถานะ/หมดอายุไฟล์ ไม่บล็อก request.
- รองรับภาษาไทย ฟอนต์ฝังใน PDF ปี พ.ศ. และรูปแบบเลขราชการ โดยเก็บวันที่ภายในเป็น ISO/Gregorian.

### 11.5 First-production reporting — Leave และ ฉ.10/11

- เมื่อเปิด document module แล้ว ใบลาต้องสร้าง DOCX จากแบบแนบท้ายประกาศ พ.ศ. 2569 โดยเก็บ `template_version`, source record version, document revision และ checksum; ผู้ใช้พิมพ์เพื่อลงนามภายนอก.
- เมื่อเปิด document module แล้ว เอกสารใบลาแต่ละ revision ต้องพิมพ์ซ้ำได้ตรงกับข้อมูล ณ เวลาที่ออก แม้ People/Position/Leave จะถูกแก้ภายหลัง.
- Excel/PDF ฉ.10/11 ยังคงสร้างโดย Special-Allowances จาก calculation run/period ที่ระบบนั้นเป็นเจ้าของ; One Data เพียงแสดงสถานะ/ลิงก์ดาวน์โหลดหรือ proxy ไฟล์ผ่าน scoped API.
- ทุก leave export ไป Special-Allowances ต้องอ้าง source cutoff, leave revisions/source refs, person mapping, row count และ checksum; มี reconciliation ต่อ รพ.สต. และรวม อบจ.ยะลา.
- เมื่อ period ใน Special-Allowances `LOCKED` แล้ว การแก้ People/Employment/Leave ภายหลังต้องไม่เปลี่ยนผลเดิม; ใช้ adjustment ที่เชื่อมกลับรอบเดิม.
- One Data ห้ามคำนวณ eligible amount, deduction หรือ final amount ซ้ำ และห้ามสร้าง workbook ฉ.10/11 จาก live data เอง.

---

## 12. Import / Export

### 12.1 สิ่งที่พบ

| Capability           | Observed behavior                                                | Confidence                                       |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| PDF/Print            | หน้ารายงาน เอกสารลา/ไปราชการ และแบบรถเปิด preview/พิมพ์ได้       | CONFIRMED                                        |
| Excel export         | หน้ารับ-จ่ายรายเดือนและรายงานการเงินระดับสังกัดมีปุ่ม Excel      | CONFIRMED                                        |
| Image upload         | โลโก้หน่วยงาน/สังกัด ภาพครุภัณฑ์ ภาพรถ ลายเซ็น                   | CONFIRMED                                        |
| Signature input      | พิมพ์ชื่อ อัปโหลด หรือวาด                                        | CONFIRMED                                        |
| Copy from prior year | รายการรายรับหลักคัดลอกจากปีงบอื่นได้                             | CONFIRMED; เป็น internal copy ไม่ใช่ file import |
| Bulk CSV/XLSX import | ไม่พบ wizard, mapping, validation preview หรือ template download | NOT OBSERVED                                     |
| JSON/API export      | ไม่พบ UI                                                         | NOT OBSERVED                                     |

คำว่า “นำเข้าวัสดุ” ใน navigation หมายถึงรับวัสดุเข้าคลังจากใบส่งของ ไม่ใช่นำเข้าไฟล์ **[CONFIRMED จากฟอร์ม]**

### 12.2 Data ingestion ที่แนะนำ

สำหรับการเริ่มใช้งานจริงควรมี bulk import แบบ staged:

1. ดาวน์โหลด template ตามชนิดข้อมูลและเวอร์ชัน.
2. อัปโหลดไฟล์ไป quarantine storage.
3. ตรวจ MIME/virus/ขนาด/encoding.
4. parse ลง staging table โดยไม่แตะ production records.
5. แสดง validation row-by-row, duplicate candidates และ mapping preview.
6. ผู้มีสิทธิ์ยืนยัน import พร้อม idempotency key.
7. commit เป็น batch transaction หรือ partial success ตาม policy.
8. สร้าง audit, error file และ rollback/compensating batch.

ลำดับ first migration: อบจ.ยะลา/รพ.สต. 38 แห่ง → บุคลากร 267 คน → membership/ตำแหน่ง/กลุ่มงาน/ประเภทการจ้าง → ประวัติการจ้าง/ใบอนุญาตที่จำเป็น → leave opening balances/history ตาม cutoff **[OWNER-CONFIRMED BASELINE + PROPOSED]**. ข้อมูล module อื่นย้ายตาม release ภายหลัง. การ import PII และยอดการเงินต้องใช้ permission เฉพาะและ encryption.

### 12.3 Export ที่แนะนำ

- เมื่อเปิด document module ให้มี DOCX สำหรับใบลาตามแบบราชการพร้อม immutable document revision; PDF เป็น optional preview/export ภายหลังและไม่แทนเอกสาร Word ที่ผู้ใช้ต้องนำไปลงนาม.
- PDF สำหรับเอกสารทางการอื่นพร้อม immutable report run.
- XLSX สำหรับรายงานเชิงตาราง โดยแยกชีต `Metadata`, `Data Dictionary`, `Data`.
- XLSX ฉ.10/11 ต้องสร้างและเก็บโดย Special-Allowances จาก locked period/run; One Data ดาวน์โหลดผ่าน API โดยไม่คำนวณหรือแก้ artifact.
- CSV UTF-8 BOM สำหรับ migration/analytics ที่ไม่ต้องรักษารูปแบบ.
- ZIP evidence package สำหรับ audit ที่รวม manifest/hash ไม่รวมข้อมูลเกิน scope.
- Scheduled export หรือ API access ควรใช้ service account, scoped token และ rate limit.
- ทุก export ต้องบันทึก actor, scope, filter, row count, classification และ file expiry.

### 12.4 Retention และไฟล์

อายุไฟล์ export, การลบภาพ/ลายเซ็น, retention เอกสารราชการ และ legal hold ไม่ปรากฏ **[UNKNOWN]** ต้องกำหนดก่อน production และแยก metadata ออกจาก object storage เพื่อให้ลบ/เก็บรักษาตามนโยบายได้

---

## 13. Integration

### 13.1 Integration ที่สังเกตได้

| Integration        | Direction                    | Purpose                 | Confidence                                                      |
| ------------------ | ---------------------------- | ----------------------- | --------------------------------------------------------------- |
| Line OA            | outbound link                | ติดต่อ support          | CONFIRMED                                                       |
| NocoDB public form | outbound link                | แจ้งปัญหา               | CONFIRMED                                                       |
| Umami              | browser → external analytics | product/web analytics   | endpoint CONFIRMED; payload/consent UNKNOWN                     |
| Cloudflare RUM     | browser → external telemetry | performance monitoring  | resource CONFIRMED; payload/retention UNKNOWN                   |
| GMTech site        | outbound link                | ผู้พัฒนา                | CONFIRMED                                                       |
| Browser push       | diagnostics ในบัญชีผู้ใช้    | notification capability | UI CONFIRMED; current browser reported unsupported/unregistered |

### 13.2 Integration ที่ไม่พบและห้ามสมมติ

- SSO/OIDC/SAML, ThaiD, Microsoft Entra ID, Google Workspace **[UNKNOWN]**
- ระบบทะเบียนบุคลากร/HR กลาง **[UNKNOWN]**
- e-Saraban/เลขหนังสือราชการ **[UNKNOWN]**
- ระบบบัญชี/ERP/ธนาคาร **[UNKNOWN]**
- ระบบครุภัณฑ์หรือคลังภายนอก **[UNKNOWN]**
- Email/SMS/Line notification automation **[UNKNOWN]**
- Public API, webhook, API key management หรือ scheduled sync **[NOT OBSERVED]**

### 13.3 Integration architecture ที่แนะนำ

```mermaid
flowchart LR
    Portal[yala-pao-public-health-portal] -->|signed launch token| IAM[One Data IAM adapter]
    IAM --> Core[One Data Core]
    Core --> Leave[Leave Paper-first]
    Leave -->|period/person leave contract| SpecialAPI[Special-Allowances API]
    Core --> Adapter[Special-Allowances BFF adapter]
    Adapter -->|period status/results/reports| SpecialAPI
    Leave --> Outbox[(Transactional outbox)]
    Outbox -. future event consumers .-> Jobs[Job/notification workers]
```

- **Portal contract:** รองรับ manifest/launch endpoint ตาม Portal project, ตรวจ `iss/aud/exp/signature/return_to`, สร้าง local session และ map `portal_user_id`; launch token ใช้ครั้งเดียวหรือมี replay protection และห้ามใช้แทน long-lived API token.
- **Special-Allowances contract:** เริ่มด้วย synchronous REST และ service account แบบ least privilege. Special-Allowances ดึงหรือ One Data สั่ง sync เฉพาะ leave summary ของ period; exact direction ปิดใน contract test แต่ source of truth ไม่เปลี่ยน.
- **Anti-corruption layer:** map canonical leave types/person IDs ของ One Data ไป attendance fields/entries ที่ Special-Allowances รองรับ โดยไม่ให้ schema ของ Special แพร่เข้ามาใน Leave domain.
- **Identity mapping:** ใช้ immutable external ID ระหว่าง `person_id`, `portal_user_id` และ employee ID ของ Special-Allowances; ห้ามจับคู่ด้วยชื่อ เลขโทรศัพท์ หรือ national ID เพียงอย่างเดียว.
- **Period protocol:** `OPEN` sync ซ้ำแบบ idempotent ได้; ก่อน lock ต้องคืน unmapped persons, changed/cancelled leave, row counts และ checksum ให้ผู้ใช้ reconcile. เมื่อ `LOCKED/PAID` แล้ว Special-Allowances ปฏิเสธการ overwrite และรับเฉพาะ adjustment/correction flow.
- **Security:** ไม่แชร์ database credential, root MySQL user, browser cookie หรือ application secret ระหว่างระบบ. Internal API ใช้ TLS/private network, audience-scoped credential, rotation, rate limit, correlation ID และ audit ทั้งผู้ส่ง/ผู้รับ.
- **Infrastructure:** ใช้ reverse proxy/network/MySQL server ของ `shared-infra` ร่วมกันได้ แต่แต่ละ application มี database และ DB user ของตน; backup/restore ต้องทดสอบแยก application และเก็บสำเนานอกเครื่องตามนโยบาย production.
- Transactional outbox เก็บไว้สำหรับ publication หลัง commit และ retry แต่ MVP ไม่ต้องติดตั้ง event broker หาก REST + reconciliation ตอบโจทย์แล้ว.
- Analytics ฝั่ง browserต้องผ่าน consent/data minimization และห้ามส่ง PII/เลขประจำตัว/ข้อมูลสุขภาพใน URL หรือ event.

### 13.4 Existing codebase baseline

| Project | Responsibility used by this blueprint | Verified implementation evidence |
| ------- | ------------------------------------- | -------------------------------- |
| `Special-Allowances` | Financial Calculation System ระดับกองสาธารณสุข; One Data เติมเฉพาะข้อมูลลา | NestJS/Prisma/MySQL backend, Next.js frontend, attendance entries→scalar projection, optimistic record/period version, period lock, adjustment period, audit/export และ test suites **[CODEBASE-VERIFIED]** |
| `yala-pao-public-health-portal` | Login/module access/SSO entry สำหรับ One Data และระบบย่อย | module manifest, signed short-lived launch token, deep-link return flow และ local session contract **[CODEBASE-VERIFIED; project in active development]** |
| `shared-infra` | Reverse proxy, shared Docker network, MySQL host และ backup foundation บน server เดียวกัน | Nginx Proxy Manager, `webproxy`, MySQL 8 และ scheduled local backup **[CODEBASE-VERIFIED]** |

การอยู่ repository/server เดียวกันไม่เปลี่ยน bounded-context ownership. Dependency ระหว่างระบบต้อง pin contract version และทดสอบร่วมใน CI/UAT; ห้ามอาศัย internal table/schema ของอีก project แม้เข้าถึงได้ทาง network.

---

## 14. Audit & Security Model

### 14.1 สิ่งที่สังเกตได้

- หลายตารางแสดงผู้แก้ไขล่าสุดและเวลา **[CONFIRMED]**
- ตารางเวรมีข้อความแก้ไขล่าสุด **[CONFIRMED]**
- มี session ที่ login แล้ว, endpoint `/api/auth/me` และ `/api/auth/refresh`, เมนู logout **[CONFIRMED URL/UI; กลไก token UNKNOWN]**
- มี role ต่อ scope และตัวสลับองค์กร **[CONFIRMED]**
- ข้อมูลพื้นฐานบางส่วน disabled ตามระดับสิทธิ์ **[CONFIRMED UI; server enforcement UNKNOWN]**
- ลายเซ็น ภาพ และข้อมูลส่วนบุคคลถูกเก็บ/แสดงในระบบ **[CONFIRMED]**
- Mutation ผ่าน UI ยืนยันว่า workflow state เปลี่ยนจริง แต่พบ self-approval ของใบลา, partial employee create และ destructive cascade บางชนิด **[MUTATION-VERIFIED]**; สิ่งเหล่านี้เป็น security/integrity findings ไม่ใช่ permission specification.
- ไม่พบ audit log ส่วนกลาง, history diff, login history, session management หรือ MFA setting **[NOT OBSERVED]**
- ไม่ได้ทดสอบ IDOR, privilege escalation, CSRF, rate limiting, direct API mutation หรือ file upload attack ตามข้อจำกัด safe exploration **[UNKNOWN]**

### 14.2 Functional audit requirements

ทุก event สำคัญควรเก็บ append-only:

```text
event_id, occurred_at_utc, actor_person_id, actor_session_id,
scope_type, scope_id, action, resource_type, resource_id,
before_hash, after_hash, changed_fields, reason,
request_id, correlation_id, source_ip_hash, user_agent_class,
result, policy_decision, export_metadata
```

ต้องมี event อย่างน้อยสำหรับ:

- login/logout/refresh failure/MFA changes
- grant/revoke role และ functional assignment
- อ่าน/ส่งออกข้อมูลอ่อนไหวจำนวนมาก
- create/update/void/delete บุคลากร สต็อก ทรัพย์สิน รถ และการเงิน
- record paper decision, cancel/void/correct ใบลา; issue/reissue/download DOCX เป็น document module ระยะถัดไป; แยกจาก approve/reject ของรถ/การย้ายบุคลากร
- สร้าง/ส่ง/รับ acknowledgment/retry/reconcile leave export รวม period, cutoff, source hash, external period/request ID และผลรวมโดยไม่ log PII
- อ่าน/download ผลหรือรายงาน ฉ.10/11 ผ่าน adapter และส่ง correction/adjustment request โดยอ้าง external original period/result; calculation transition audit ตัวจริงอยู่ใน Special-Allowances
- เปิด/ปิด/ล็อก/ปลดล็อกวงรอบแผน
- เปลี่ยนผู้ลงนาม/ลายเซ็น/เลขหนังสือ/template
- generate/download report
- failed authorization และ validation ที่เสี่ยง

Audit ต้องแยก storage/permission จากข้อมูลธุรกรรม ไม่ให้ผู้ดูแลทั่วไปแก้ย้อนหลัง และต้องมี retention/verification hash ตามความต้องการกำกับดูแล.

### 14.3 Security requirements

**Identity & session**

- ใช้ Portal launch-token contract เป็น SSO baseline; ตรวจ issuer, audience, signature, expiry, nonce/replay และ allowlisted `return_to` ก่อนสร้าง local session.
- One Data ไม่เก็บ password ซ้ำจาก Portal; local session ต้องมี idle/absolute timeout, revoke และผูก external identity ที่ immutable.
- MFA/account recovery เป็นหน้าที่ Portal; action เสี่ยงใน One Data อาจขอ fresh launch/reauthentication ตาม contract และต้อง audit.

**Authorization & multi-tenancy**

- ตรวจ `affiliation_id/tenant_id` ทุก query ที่ server/repository layer; ห้ามรับ scope จาก client โดยไม่เทียบ membership.
- policy decision รวม action + scope + resource state + functional assignment.
- ใช้ deny-by-default และ automated cross-tenant isolation tests.
- superadmin action ต้อง just-in-time, reason-required และ ideally dual control.

**Data protection**

- TLS in transit; encryption at rest; field-level encryption/tokenization สำหรับเลขประจำตัว ลายเซ็น และข้อมูลที่จัดเป็น sensitive.
- PII masking ใน list/search และ export ตาม least privilege.
- ห้ามบันทึก PII/token ใน analytics, URL, log หรือ error message.
- แยก object storage bucket/prefix ตาม classification; signed URL อายุสั้น; malware scan; content-disposition ปลอดภัย.
- backup encryption, restore drill, RPO/RTO และ key rotation.

**Application & API**

- CSRF protection เมื่อใช้ cookie session, SameSite/HttpOnly/Secure, CSP, clickjacking defense และ strict CORS.
- schema validation ฝั่ง server, parameterized query, output encoding, file validation และ rate limits.
- idempotency สำหรับ create/approve/stock movement/payment-like operations.
- employee onboarding ต้อง atomic ข้าม person/profile/membership/access/history และมี failure-injection test; API ห้ามตอบ failure หลัง commit บางส่วนโดยไม่มี recoverable operation ID.
- approval policy ต้องบังคับ segregation of duties ฝั่ง server (`requester != approver`) พร้อม delegation/break-glass ที่มีเหตุผลและ audit.
- optimistic concurrency (`version`/ETag) สำหรับตารางเวร แผน และ monthly actuals.
- mutation สำคัญใช้ transaction และ state transition guard; ห้าม client ตั้งสถานะใด ๆ ได้อิสระ.

**Privacy & governance**

- สร้าง data classification, purpose, owner, retention และ lawful basis ต่อ entity.
- รองรับ correction/retention/archival โดยไม่ทำลายหลักฐานเอกสารราชการ.
- ทำ DPIA/threat model ก่อน production โดยเฉพาะ PII บุคลากร ลายเซ็น และการเคลื่อนย้ายข้ามหน่วยงาน.

### 14.4 Security test plan ก่อน go-live

- RBAC/ABAC matrix test ทุก endpoint และทุก state.
- tenant isolation/IDOR test ด้วยอย่างน้อย 2 สังกัดสังเคราะห์และ 3 หน่วยงาน แม้ production รุ่นแรกมีหนึ่ง อบจ.; ใช้เป็น defense-in-depth test ไม่ใช่ production topology.
- workflow tampering: approve เอง, ข้าม pending, แก้หลัง locked, stock ติดลบ, mileage ย้อน.
- upload test: MIME spoof, polyglot, oversized image, SVG/script, malware.
- export abuse/bulk scrape และ search enumeration.
- session fixation/refresh reuse/logout revocation/CSRF/CORS.
- report injection, formula injection ใน Excel และ PII leakage ใน filename/metadata.
- calculation tampering: เปลี่ยน rule/input หลังคำนวณ, lock ซ้ำ, แก้ผล locked, adjustment ไม่มีสิทธิ์ และ replay command.

---

## 15. UX/UI Assessment

### 15.1 สิ่งที่ควรรักษาไว้

- **Navigation แยก domain ชัด:** บุคลากร วัสดุ ครุภัณฑ์ รถ การเงิน และระบบ แยกกลุ่มเข้าใจง่าย **[CONFIRMED]**
- **Scope switcher เห็นชื่อองค์กรและ role:** ลดความสับสนเมื่อบัญชีเดียวดูหลายบริบท **[CONFIRMED]**
- **Dashboard สรุปงานจริง:** ใช้จำนวนบุคลากร สถานะวันนี้ อัตรากำลัง และแผนเทียบจริง ไม่ใช่เพียงกราฟตกแต่ง **[CONFIRMED]**
- **ฟอร์มวงจรชีวิตเป็นแท็บ:** ครุภัณฑ์และรถรวมข้อมูลที่เกี่ยวข้องโดยไม่ยัดในหน้าเดียว **[CONFIRMED]**
- **Contextual help:** ข้อความรหัสครุภัณฑ์ การล็อกแผน และผลของประกาศ active ช่วยป้องกันความผิดพลาด **[CONFIRMED]**
- **Official-document orientation:** preview/print และผู้ลงนามอยู่ใกล้กระบวนงาน **[CONFIRMED]**
- **Calendar/matrix/table views:** เลือก representation เหมาะกับเวร ลา รถ และข้อมูลจำนวนมาก **[CONFIRMED]**
- **Audit hint ในรายการ:** แสดงผู้แก้ล่าสุด/เวลาเป็น feedback ที่ดี แม้ควรมี history เต็ม **[CONFIRMED]**

### 15.2 สิ่งที่ควรออกแบบใหม่

1. **สิทธิ์คลุมเครือ:** UI มีเพียง Staff/Admin แต่มี superadmin และบทบาทผู้ลงนามแฝงอยู่ ควรมีหน้าสิทธิ์/ขอบเขต/เหตุผลที่อ่านได้.
2. **คำว่า “นำเข้าวัสดุ” กำกวม:** อาจถูกเข้าใจว่า file import ควรใช้ “รับวัสดุเข้าคลัง”.
3. **แผนประจำปีต้องลบเพื่อแก้:** เสี่ยงเสีย audit ควรใช้ Draft → Submitted → Locked → Superseded/Voided พร้อม revision.
4. **รถกับครุภัณฑ์ซ้ำได้:** ควรสร้างรถจาก asset หรือเชื่อมแบบบังคับตาม ownership และแจ้ง duplicate candidate.
5. **Search behavior ไม่สม่ำเสมอ:** ใน workflow ย้ายบุคลากร การค้นหาตัวอย่างไม่กรองผลตามข้อความที่ใส่ อาจเป็น bug/delay **[CONFIRMED จาก session เดียว; root cause UNKNOWN]**.
6. **สถานะบางรายการไม่ชัด:** ไปราชการแสดง `—` ในคอลัมน์สถานะ ขณะที่ลามี pending; ควรใช้ status vocabulary สม่ำเสมอ.
7. **ปี พ.ศ./ค.ศ. ผสมใน request:** ผู้ใช้เห็น พ.ศ. แต่ resource บางหน้าส่ง ค.ศ.; ควรมี date boundary ชัดและ test conversion.
8. **ปุ่ม destructive บนหน้ารายละเอียด:** รถมี edit/delete ที่เห็นชัด ควรใช้ permission, confirm, reason, dependency preview และ soft delete.
9. **ฟอร์มยาวและ PII มาก:** employee/accident ควรเป็น stepper, autosave draft, section completion, privacy hint และ field-level permissions.
10. **Notification diagnostics เปิดเผยข้อจำกัดแต่ไม่มี recovery:** ควรบอกวิธีเปิดใช้งาน ช่องทางสำรอง และสถานะ subscription แบบเข้าใจง่าย.
11. **ไม่มี audit center:** “แก้ล่าสุด” ไม่พอสำหรับ dispute; เพิ่ม timeline/filter/export เฉพาะผู้ตรวจ.
12. **Empty state ควร actionable:** หน้าสต็อก/ร้านค้า/แผนว่างควรแนะนำลำดับเริ่มต้นและ dependency.

### 15.3 Information architecture ที่แนะนำ

```text
Workspace selector
├── หน่วยงาน
│   ├── งานวันนี้
│   ├── บุคลากรและเวลา
│   ├── วัสดุ
│   ├── ทรัพย์สินและรถ
│   ├── การเงิน
│   ├── เอกสาร
│   └── ตั้งค่า
└── สังกัด
    ├── ภาพรวม
    ├── หน่วยงานและบุคลากร
    ├── แผนและกำกับการเงิน
    ├── รายงานรวม
    ├── ข้อมูลหลักร่วม
    └── ตั้งค่าและสิทธิ์
```

เพิ่ม “งานที่รอดำเนินการ” เป็น inbox เดียวสำหรับคำขอ/approval/แผนใกล้ปิด แทนให้ผู้ใช้ไล่เข้าแต่ละโมดูล และใช้ global search ที่จำกัดตาม scope/permission.

### 15.4 Accessibility และ responsive behavior

ไม่ได้ทำ accessibility audit หรือทดสอบหลายอุปกรณ์ **[UNKNOWN]** ระบบใหม่ควรกำหนด WCAG 2.2 AA, keyboard navigation, focus management สำหรับ sheet/dialog, label/error ที่อ่านด้วย screen reader, contrast, touch target และ table responsive พร้อม alternate card/list view.

---

## 16. Recommended Architecture

### 16.1 หลักการออกแบบ

1. **Domain-first:** แบ่งตามงานธุรกิจ ไม่แบ่งตามหน้าจอของระบบอ้างอิง.
2. **Multi-organization by design:** affiliation/tenant scope เป็นส่วนหนึ่งของ identity, query และ audit ทุกชั้น.
3. **Modular monolith first:** เริ่มด้วย deployable เดียวแต่บังคับ module boundary; ลด distributed complexity ใน MVP และแยก service ภายหลังเฉพาะจุดที่มีเหตุผล.
4. **Workflow as state machine:** approval/lock/transfer/disposal ใช้ transition ที่ตรวจได้ ไม่ใช่ boolean หลายตัวกระจัดกระจาย.
5. **Ledger and history over mutable totals:** สต็อก การเงิน สิทธิ์ ประวัติการจ้าง และสถานะสำคัญต้องมีประวัติที่ reconstruct ได้.
6. **Report reproducibility:** เอกสารทางการต้อง version/snapshot และพิมพ์ซ้ำได้.
7. **Secure by default:** deny-by-default, server-side scope, encryption, least privilege, append-only audit.
8. **Interoperable boundaries:** API/event ที่ versioned และ adapter สำหรับระบบภายนอก.
9. **Thai public-sector ready:** พ.ศ. ใน presentation, ปีงบ ต.ค.–ก.ย., ฟอนต์ไทย, เลขหนังสือ และลายเซ็น โดยไม่ผูก storage กับ locale.

### 16.2 Logical architecture

```mermaid
flowchart TB
    subgraph Clients
      Web[Responsive Web App]
      Portal[SSO Portal]
    end

    subgraph Edge
      WAF[WAF / Rate Limit]
      BFF[API Gateway or BFF]
    end

    subgraph Application[Modular Application]
      IAM[Identity & Access]
      ORG[Organization & People]
      WORK[Schedule / Leave / Duty]
      INT[Special-Allowances Adapter]
      INV[Inventory]
      ASSET[Assets & Vehicles]
      FIN[Finance Planning & Actuals]
      DOC[Documents & Reports]
      GOV[Workflow / Audit / Notification]
    end

    subgraph Data
      DB[(Relational Database)]
      OBJ[(Object Storage)]
      CACHE[(Cache / Projection Store)]
      SEARCH[(Optional Search Index)]
    end

    subgraph Async
      OUTBOX[(Outbox)]
      JOBS[Job Queue / Scheduler]
      WORKERS[Report / Import / Notification Workers]
    end

    subgraph ExistingSystem[Existing Special-Allowances]
      SAPI[Special-Allowances API]
      SDB[(Special Database)]
      SCALC[Formula / Period / Lock / Adjustment / Reports]
    end

    Web --> WAF --> BFF
    Portal -->|launch token| WAF
    BFF --> IAM
    BFF --> ORG
    BFF --> WORK
    BFF --> INT
    BFF --> INV
    BFF --> ASSET
    BFF --> FIN
    BFF --> DOC
    BFF --> GOV
    Application --> DB
    Application --> OBJ
    Application --> CACHE
    Application -.-> SEARCH
    Application --> OUTBOX --> JOBS --> WORKERS
    WORKERS --> DB
    WORKERS --> OBJ
    INT -->|scoped REST| SAPI
    SAPI --> SDB
    SAPI --> SCALC
```

แผนภาพไม่บังคับภาษา framework หรือ cloud vendor. One Data เริ่มเป็น modular monolith แต่ Special-Allowances และ Portal คงเป็น deployable/database แยก. Relational database เหมาะเพราะมี transaction, constraint, reporting relation และ audit consistency สูง. Object storage เหมาะกับ DOCX, attachment และไฟล์รายงาน. Queue ใช้สำหรับ document/import/notification ที่ใช้เวลานานเมื่อจำเป็น.

### 16.3 Module boundaries

| Module                | Owns                                                                                       | May read via API/projection                            | Must not mutate directly             |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------ |
| Identity & Access     | identities, memberships, roles, permissions, sessions                                      | person display projection                              | HR profile/history                   |
| Organization & People | affiliation, tenant, employee profile, job history, position                               | access grants                                          | session/credential                   |
| Workforce             | shift, schedule, holiday, leave, official duty; รุ่นแรกใช้ Leave แบบ Paper-first             | employee/workgroup, signer                             | employee master                      |
| Special Integration   | external ID mapping, leave export batches, delivery/reconciliation, external period/report refs | effective People data, paper-approved leave, Special API | สูตร/period/result/report ใน Special |
| Inventory             | supply master, receipt, issue, movement, vendor, annual plan                               | workgroup/actor                                        | finance actual without command/event |
| Assets & Vehicles     | asset lifecycle, vehicle workflow                                                          | employee/tenant, finance categories                    | inventory/employee master            |
| Finance               | cycles, plan revisions, revenue/expense taxonomy, actuals                                  | organization, personnel/asset plan projections         | stock ledger/asset register          |
| Documents & Reports   | templates, report runs, snapshots                                                          | read models from all modules                           | source transactions                  |
| Governance            | audit, outbox, notification, approval tasks                                                | actor/resource metadata                                | domain state except through command  |

### 16.4 Deployment evolution

**First production release:** One Data เป็น modular monolith + relational database ของตน. เปิดใช้ Platform, People/Organization, Leave แบบ Paper-first และ Special-Allowances adapter ก่อน; Documents/DOCX เป็นส่วนขยายภายหลัง. Portal, Special-Allowances และ One Data เป็น deployable/database แยกแม้อยู่ server/network เดียวกัน. ใช้ transaction ภายใน One Data, scoped REST + reconciliation ข้ามระบบ และ outbox สำหรับ retry/future events **[OWNER-CONFIRMED DIRECTION + PROPOSED DESIGN]**.

**Scale-out triggers:** แยก Report/Import worker ก่อนเพราะ workload หนัก; แยก Notification/Integration ต่อมา; แยก transactional domain เฉพาะเมื่อ team ownership, scaling หรือ regulatory isolation ชัดเจน. ห้ามเริ่ม microservices เพียงเพราะมีหลายเมนู.

### 16.5 Multi-tenancy strategy

- Capacity baseline คือ อบจ.ยะลา 1 แห่ง, รพ.สต. 38 แห่ง และบุคลากร 267 คน **[OWNER-CONFIRMED]**; การทดสอบ aggregation ต้อง seed ครบ baseline นี้.
- Capacity headroom ที่เสนอสำหรับ design/load test คืออย่างน้อย 100 หน่วยงานและ 1,500–2,000 บัญชีโดยไม่เปลี่ยน architecture **[PROPOSED; ต้องเทียบแผนเติบโตจริง]**.
- ทุก business row มี `affiliation_id` และ/หรือ `tenant_id` ตาม owner; foreign key ต้องสอดคล้อง scope.
- Application sets authorized scope จาก session ไม่รับค่า tenant จาก query เพียงอย่างเดียว.
- Repository/query policy เติม scope predicate อัตโนมัติ; integration test ตรวจ cross-scope.
- Unique key เป็น composite เช่น `(tenant_id, asset_code)` หรือ `(affiliation_id, fiscal_year, code)`.
- สำหรับข้อมูลอ่อนไหวมาก อาจใช้ database row-level security เป็น defense-in-depth แต่ยังต้องมี application policy.
- Analytics/report projection ต้องรักษา scope lineage และ aggregate เฉพาะสิทธิ์ที่อนุญาต.

### 16.6 Reliability and operations

- เป้าหมายเริ่มต้นที่เสนอ: availability 99.9% รายเดือน, RPO ≤ 15 นาที, RTO ≤ 4 ชั่วโมง; เจ้าของระบบต้องยืนยัน **[RECOMMENDED/UNKNOWN]**.
- Structured logs ไม่มี PII, metrics ต่อ module, distributed correlation ID, audit แยก.
- Health/readiness checks, migration gating, feature flags, blue/green หรือ rolling deployment.
- Backup point-in-time + restore drill; immutable backup สำหรับ audit/report artifacts ตาม retention.
- Idempotent workers, retry with backoff, dead-letter queue และ operator replay UI.
- Performance budget: list p95 < 2s, command p95 < 3s, dashboard p95 < 3s ภายใต้ volume ที่กำหนด; report async เมื่อเกิน 5s **[RECOMMENDED]**.

### 16.7 Environments and delivery

- แยก dev/test/UAT/staging/production และแยกข้อมูล/credential จริง.
- UAT ใช้ synthetic/de-identified data; seed scenarios ครอบคลุม 1 สังกัด, 38 รพ.สต., บุคลากรประมาณ 267 คน, หลายปีงบ และ state transitions. เพิ่ม multi-affiliation test เฉพาะเมื่ออนุมัติเป็น future requirement.
- Database migration forward-compatible; destructive migration สองช่วงและ backup verified.
- CI: lint/unit/schema/contract/security/tenant-isolation/report golden tests.
- CD: approval สำหรับ production, migration preview, automated smoke และ rollback/roll-forward plan.

---

## 17. Proposed Database Model

### 17.1 Common conventions

ทุกตารางธุรกรรมควรมีอย่างน้อย:

```text
id UUID/ULID primary key
affiliation_id nullable/not-null by ownership
tenant_id nullable/not-null by ownership
created_at timestamptz, created_by
updated_at timestamptz, updated_by
version bigint                  -- optimistic concurrency
status enum/reference           -- เมื่อมี lifecycle
voided_at, voided_by, void_reason -- แทน hard delete สำหรับข้อมูลสำคัญ
```

- เวลาเก็บ UTC; วันที่ธุรกิจใช้ `date`; เดือนงบใช้ `fiscal_year` + `fiscal_month` 1–12 โดยมี calendar mapping.
- เงินใช้ fixed decimal ไม่ใช้ float; ระบุสกุลเงินหากมีโอกาสขยาย.
- เลขประจำตัวไม่เป็น key; เก็บ normalized encrypted value + blind index สำหรับ exact search หากจำเป็น.
- JSON ใช้เฉพาะ metadata ที่เปลี่ยนรูปบ่อย ไม่ใช้แทน relation หลัก.
- Enum สำคัญ versioned/reference table เมื่อหน่วยงานต้อง configure.

### 17.2 Organization, people and access

| Table                     | Key fields                                                                                                                                                               | Constraints/notes                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `affiliations`            | id, name, department, logo_object_id, settings_version                                                                                                                   | base organization                                                                                                                           |
| `districts`               | id, affiliation_id, code, name, display_order                                                                                                                            | unique code/order per affiliation                                                                                                           |
| `tenants`                 | id, affiliation_id, district_id, name, short_name, hosp_code, size_code, cup_code, address fields, active                                                                | unique hosp_code; effective-dated if changed                                                                                                |
| `organization_order`      | affiliation_id, district_id, tenant_id, display_order                                                                                                                    | exactly one row per unit/order scope                                                                                                        |
| `persons`                 | id, prefix, first_name, last_name, national_id_ciphertext/blind_index, birth_date, gender, phone, email, address_id                                                      | PII classification; search projection masked                                                                                                |
| `employee_profiles`       | person_id, active, profile metadata                                                                                                                                      | person-level employment profile separated from organization assignment/access                                                               |
| `tenant_memberships`      | id, person_id, tenant_id, work_group_id, position_id, employee_type_id, start_date, end_date, membership_type, access_enabled                                            | effective-dated; no overlapping primary employment unless policy allows; onboarding command atomic with person/access/history               |
| `affiliation_memberships` | id, person_id, affiliation_id, source_tenant_membership_id, access_enabled                                                                                               | shared person, no duplication                                                                                                               |
| `employment_history`      | person_id, organization_id?, workplace_name, area_level_code, start_date, end_date, is_current, include_in_ch11, change_kind, effective_from, corrected_record_id, notes | effective-dated; distinguish correction vs real change; fields mirror observed ฉ.11 inputs; organization link optional for external history |
| `professional_licenses`   | person_id, license_type, license_no_ciphertext, issue_date, expiry_date                                                                                                  | expiry alert optional                                                                                                                       |
| `roles`                   | id, code, name, scope_type, system_defined                                                                                                                               | STAFF/ADMIN seed but extensible                                                                                                             |
| `permissions`             | id, code, description, risk_level                                                                                                                                        | action catalog                                                                                                                              |
| `role_permissions`        | role_id, permission_id, conditions_json                                                                                                                                  | reviewed/versioned                                                                                                                          |
| `membership_roles`        | membership_type/id, role_id, effective dates                                                                                                                             | many-to-many if future roles expand                                                                                                         |
| `functional_assignments`  | organization_scope, function_code, person_id, start/end, priority                                                                                                        | director, payer, procurement, signer, vehicle approver                                                                                      |
| `identity_links`          | person_id, provider, subject, status, last_login_at                                                                                                                      | provider subject unique                                                                                                                     |
| `sessions`                | identity_id, session_hash, device, issued/expires/revoked, risk                                                                                                          | no raw token stored                                                                                                                         |

### 17.3 Workforce

| Table                      | Key fields                                                                                                                         | Constraints/notes                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `shift_types`              | affiliation_id, code, name, start_time, end_time, hours, compensation_basis, rate, active                                          | unique code; handle overnight shifts                                                   |
| `schedule_periods`         | tenant_id, year, month, status, version                                                                                            | unique tenant/month                                                                    |
| `shift_assignments`        | schedule_period_id, person_id, work_date, shift_type_id, worked_hours, rate_snapshot                                               | unique per allowed combination; detect overlap                                         |
| `schedule_inspectors`      | schedule_period_id, work_date/person_id/role                                                                                       | clarify actual inspector grain in discovery                                            |
| `holidays`                 | jurisdiction_scope, holiday_date, name, type                                                                                       | unique date/type; source/version                                                       |
| `leave_types`              | code, name, official_group_code, active                                                                                            | seeded 11 groups ตามประกาศ ก.จ. พ.ศ. 2569; version/effective date                      |
| `leave_policy_profiles`    | affiliation_id, code, employee_type_scope, legal_basis, effective_from/to, status                                                   | แยกข้าราชการ อบจ. ออกจากพนักงานจ้าง/ลูกจ้าง/สถานะอื่น                                 |
| `leave_policies`           | policy_profile_id, leave_type_id, entitlement, period_basis, accumulation, effective dates, conditions                             | replaces hard-coded quotas; published version immutable                                 |
| `leave_balances`           | person_id, policy_id, period, granted, used, reserved, adjusted                                                                    | projection/ledger backed                                                               |
| `leave_requests`           | tenant_id, requester_id, policy_id, leave_type_id, start/end, calculated_days, reason, canonical_status, issued_at, cancelled/void fields | MVP status `DRAFT/SUBMITTED/PAPER_APPROVED/PAPER_REJECTED/CANCELLED/VOIDED`; `DOCUMENT_ISSUED` reserved for future document module |
| `leave_document_revisions` | request_id, revision_no, template_code/version, source_snapshot/hash, docx_object_id/checksum, generated_by/at                      | optional/deferred in MVP; immutable published revision when document module is enabled |
| `leave_external_decisions` | request_id, decision, external_document_no/date, recorded_by/at, note, attachment_id nullable, supersedes_id                       | บันทึกผลกระดาษ ไม่ใช่ online approval; requester != recorder โดย default                |
| `official_duty_requests`   | tenant_id, requester_id, type, subject, start/end, vehicle_text/vehicle_id, lifecycle_status, updated/deleted/voided by/at/reason  | separate lifecycle from leave; deletion policy OPEN                                    |
| `official_duty_companions` | request_id, person_id                                                                                                              | unique pair                                                                            |
| `official_duty_approvals`  | request_id, step_no, decision fields                                                                                               | optional only if owner confirms approval workflow; do not infer from leave             |

### 17.4 Special-Allowances Integration — ฉ.10/11

One Data ไม่สร้างตาราง calculation engine, formulas, results หรือ report artifacts ของ ฉ.10/11 ซ้ำ. ตารางเหล่านั้นคงอยู่ในฐานข้อมูล `Special-Allowances` ซึ่งรองรับ calculation, period integrity, optimistic locking, adjustment period และ report อยู่แล้ว **[CODEBASE-VERIFIED + OWNER-CONFIRMED]**.

ตารางต่อไปนี้เป็น integration metadata ที่ One Data เป็นเจ้าของ:

| Table                         | Key fields                                                                                                                                    | Constraints/notes                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `external_systems`            | id, code (`SPECIAL_ALLOWANCES`), base_url_ref, audience, active, contract_version                                                             | ไม่เก็บ secret plaintext; config/secret manager เป็นเจ้าของ credential             |
| `external_person_mappings`    | system_id, person_id, external_person_id, effective_from/to, status, verified_by/at                                                           | unique active mapping; ห้าม map ด้วยชื่ออย่างเดียว                                 |
| `leave_export_batches`        | id, system_id, tenant_id, period_start/end, source_cutoff_at, status, item_count, source_hash, created_by/at                                  | idempotency key unique ต่อ consumer/tenant/period/source hash                      |
| `leave_export_items`          | batch_id, person_id, external_person_id, leave_type_code, working_days, source_request_refs/revisions, item_hash                              | immutable batch item; aggregate contract ต้องตรง attendance projection ของ Special |
| `integration_deliveries`      | batch_id, attempt_no, request_id, sent/acknowledged_at, response_code, external_period_ref, error_code/detail_redacted                        | retry/audit; no PII in operational log                                             |
| `integration_reconciliations` | batch_id, external_period_ref, expected/accepted/rejected/unmapped counts, local/external hash, status, reviewed_by/at                        | ต้อง PASS ก่อน lock หรือมี exception ที่ลงเหตุผล                                   |
| `external_report_refs`        | system_id, external_period_ref, external_report_id, format, checksum, generated_at, access_scope                                             | reference/cache metadata; artifact owner คือ Special-Allowances                    |

Current Special-Allowances attendance contract ที่ตรวจจาก source **[CODEBASE-VERIFIED]**:

| One Data leave group        | Special attendance type | Projection basis ใน Special | Contract status |
| --------------------------- | ----------------------- | --------------------------- | --------------- |
| ลากิจส่วนตัว               | `PERSONAL_LEAVE`        | วันทำการ                    | direct mapping  |
| ลาป่วย                      | `SICK_LEAVE`            | วันทำการ                    | direct mapping  |
| ลาคลอดบุตร                  | `MATERNITY_LEAVE`       | วันปฏิทิน                   | direct mapping  |
| ลาไปประกอบพิธีฮัจย์         | `HAJJ_LEAVE`            | วันปฏิทิน                   | direct mapping  |
| ลาอุปสมบท                   | `ORDAIN_LEAVE`          | วันปฏิทิน                   | direct mapping  |
| ลาพักผ่อน                   | `VACATION_LEAVE`        | วันทำการ                    | direct mapping  |
| ขาดราชการ                   | `ABSENT`                | วันทำการ                    | ไม่ใช่ใบลา; One Data Leave ห้ามสร้างอัตโนมัติ |
| ฝึกอบรมโดยสมัครใจ/ตามคำสั่ง | `TRAINING_*`            | วันทำการ + occurrence count | ไม่ใช่ตัวแปรจาก Leave; รักษาค่าเดิมใน Special |
| ลาอีก 6 กลุ่ม/ถือศีลฯ ที่ไม่มีชนิดตรง | ไม่มี direct type       | —                           | ต้องให้เจ้าของสูตรอนุมัติ mapping/version ก่อนส่ง |

ห้ามรวมประเภทที่ยังไม่มี direct type เข้า `leaveUnclassifiedDays` หรือประเภทใกล้เคียงโดยคาดเดา เพราะอาจเปลี่ยนผลคำนวณ. การส่ง complete snapshot ต้อง reset เฉพาะ leave types ที่ contract version นั้นประกาศว่า One Data เป็นเจ้าของ และต้องรักษา `ABSENT`, `TRAINING_*`, historical unclassified และ other non-working fields ที่ Special เป็นเจ้าของไว้.

ข้อกำหนดสำคัญ:

- One Data ส่งเฉพาะ leave dimensions ที่ Special-Allowances contract ต้องใช้ และไม่เขียน scalar/calendar fields ในฐานข้อมูล Special โดยตรง.
- Adapter ต้องรองรับ source contract ของ Special ที่ใช้ attendance entries แล้ว project เป็น scalar fields ด้วย logic เดียวกัน; การเปลี่ยน schema ต้อง version contract และทดสอบทั้ง save/lock path.
- ช่วง `OPEN` sync ซ้ำได้แบบ idempotent และแทน complete leave snapshot ของ period ตาม contract; omission semantics ต้องชัดเจนเพื่อไม่คงค่า stale.
- ค่าเริ่มต้น grace period คือ 3 วันทำการหลังสิ้นเดือนแบบ configurable. ก่อน lock ต้อง reconcile unmapped person, rejected item, changed/cancelled leave และ hash.
- หลัง `LOCKED/PAID` ห้าม overwrite รอบเดิม. การแก้ข้อมูลลาสร้าง correction/adjustment ใน Special-Allowances โดยอ้าง original period; controlled reopen ใช้เฉพาะกรณียังไม่จ่ายและต้องมี permission + reason + audit.

### 17.5 Inventory

| Table                     | Key fields                                                                                                                              | Constraints/notes                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `supply_types`            | affiliation/global scope, code, name, default_category_id, active                                                                       | 19 seeded groups                                                                         |
| `supply_categories`       | code, name, inventory_class                                                                                                             | configurable mapping                                                                     |
| `units_of_measure`        | code, name, precision                                                                                                                   | shared master                                                                            |
| `storage_locations`       | tenant_id, code, name                                                                                                                   | optional hierarchy                                                                       |
| `supply_items`            | tenant_id, code, type_id, category_id, name, unit_id, storage_id, min_qty, max_qty, active                                              | unique tenant/code                                                                       |
| `vendors`                 | tenant_id/affiliation_id, name, address, contact, phone, terms, active                                                                  | dedupe strategy                                                                          |
| `stock_receipts`          | tenant_id, receipt_no, delivery_no, delivery_date, vendor_id, actor_id, note, status, total, reversed_by_id                             | posted/voided lifecycle; reject reversal if downstream issue would make balance negative |
| `stock_receipt_lines`     | receipt_id, supply_item_id, qty, unit_cost, line_total, lot/expiry optional                                                             | qty > 0                                                                                  |
| `stock_issues`            | tenant_id, issue_no, issue_date, work_group_id, actor_id, note, status, total, plan_compliance_status, exception_reason, reversed_by_id | approval optional pending decision; out-of-plan exception explicit/audited               |
| `stock_issue_lines`       | issue_id, supply_item_id, qty, unit_cost_snapshot, line_total                                                                           | qty > 0                                                                                  |
| `stock_movements`         | tenant_id, supply_item_id, occurred_at, movement_type, qty_delta, value_delta, source_type/id, reverses_movement_id, sequence           | append-only/idempotent source; reversal links original movement                          |
| `stock_balances`          | tenant_id, supply_item_id, qty_on_hand, value_on_hand, last_movement_seq                                                                | projection; reconcile job                                                                |
| `annual_issue_plans`      | tenant_id, fiscal_year, work_group_id, revision_no, status, locked_at, supersedes_id                                                    | never require hard delete to revise                                                      |
| `annual_issue_plan_lines` | plan_id, supply_item_id, planned_qty, issued_qty_projection                                                                             | unique plan/item                                                                         |

### 17.6 Assets and vehicles

| Table                                 | Key fields                                                                                                                                                                              | Constraints/notes                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `asset_types`                         | affiliation/global scope, code3, name, useful_life_years, depreciation_method                                                                                                           | version/effective date                                                                                       |
| `assets`                              | tenant_id, asset_code, form_type, name, description, type_id, status, acquired_date, cost, funding_source, acquisition_method, vendor_id, approval_ref, image_id                        | unique tenant/code; money decimal                                                                            |
| `asset_details`                       | asset_id, maker, model, serial, machine, chassis, registration, color, unit, delivery_ref, warranty/insurance fields                                                                    | subtype fields may split further                                                                             |
| `land_building_details`               | asset_id, location, rai, ngan, square_wah, deed_type/no, building_type, structure, floors, dimensions                                                                                   | only form_type LAND                                                                                          |
| `asset_depreciations`                 | asset_id, fiscal_year, opening_book_value, expense, accumulated, closing_book_value, method/life/rate snapshot                                                                          | unique asset/year; fixed decimal only; explicit rounding/residual invariant; approved version                |
| `asset_disposals`                     | asset_id, disposal_date, method, approval_ref, proceeds, gain_loss, reason                                                                                                              | one active disposal; transition guard                                                                        |
| `asset_benefits`                      | asset_id, fiscal_year, description, amount, receipt_basis                                                                                                                               | child history                                                                                                |
| `asset_custodians`                    | asset_id, fiscal_year/effective dates, division, user_person_id, division_head_id                                                                                                       | prevent overlapping primary custodian                                                                        |
| `asset_repairs`                       | asset_id, occurrence_no, document_ref, date, description, amount, repairer, note                                                                                                        | history                                                                                                      |
| `vehicles`                            | tenant_id, asset_id nullable, name, model, production_year, engine_cc, registration, ownership_type, acquisition_date, initial/current_mileage, status, image_id, archived_at/by/reason | unique registration in agreed scope; owned vehicle may require asset; never cascade-delete lifecycle history |
| `vehicle_authorizations`              | vehicle_id, person_id, start/end, granted_by                                                                                                                                            | active unique pair                                                                                           |
| `vehicle_requests`                    | vehicle_id, requester_id, destination, purpose, start/end, passengers, status, approver_snapshot                                                                                        | overlap/authorization guard                                                                                  |
| `vehicle_usages`                      | vehicle_id, request_id nullable, user_id, driver_id, location, depart/return at, depart/return mileage, distance                                                                        | mileage monotonic; one usage/request                                                                         |
| `vehicle_accidents`                   | vehicle_id, usage_id nullable, occurred_at, speed, location, route, own_damage, investigator, station, result                                                                           | sensitive fields separated/masked                                                                            |
| `accident_parties/injuries/witnesses` | accident_id, structured person/contact/detail fields                                                                                                                                    | repeatable children; retention policy                                                                        |
| `vehicle_maintenance`                 | vehicle_id, mileage, items, amount, accepted_date, vendor/place, note                                                                                                                   | may link asset repair/finance actual                                                                         |

### 17.7 Finance

| Table                     | Key fields                                                                                                                      | Constraints/notes                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `fiscal_years`            | affiliation_id, buddhist_year_display, start_date, end_date, status                                                             | dates are canonical                                                                                               |
| `planning_cycles`         | affiliation_id, fiscal_year_id, revision_type, open_at, close_at, status, locked_at, version                                    | unique year/type; BASE must be closed/locked before opening ADDITIONAL/CHANGE unless approved rule says otherwise |
| `revenue_types`           | code, name                                                                                                                      | 8 seeded groups                                                                                                   |
| `revenue_items`           | affiliation_id, fiscal_year_id, code, name, type_id, display_order, is_opening_balance, is_local_budget, active, copied_from_id | unique year/code/order                                                                                            |
| `expense_categories`      | code, name, display_order                                                                                                       | 11 major categories                                                                                               |
| `expense_subtypes`        | category_id, code, name, supply_type_id nullable, active                                                                        | configurable                                                                                                      |
| `financial_plans`         | tenant_id, cycle_id, revision_no, status, submitted/locked at, totals projection, supersedes_id                                 | immutable when locked                                                                                             |
| `planned_revenues`        | plan_id, revenue_item_id, amount, note                                                                                          | unique plan/item                                                                                                  |
| `planned_expenses`        | plan_id, category_id, subtype_id, funding_source, month optional, amount, detail                                                | aggregation source                                                                                                |
| `monthly_income_actuals`  | tenant_id, fiscal_year_id, fiscal_month, revenue_item_id, amount, source_ref, version                                           | unique grain agreed; adjustment history                                                                           |
| `monthly_expense_actuals` | tenant_id, fiscal_year_id, fiscal_month, category/subtype, amount, source_ref, version                                          | same                                                                                                              |
| `financial_adjustments`   | source_type/id, old/new amount, reason, approved_by, effective_at                                                               | no silent overwrite                                                                                               |
| `price_sources`           | affiliation_id, name, reference, effective dates                                                                                | observed master endpoint                                                                                          |

### 17.8 Documents, files and governance

| Table                 | Key fields                                                                                                                             | Constraints/notes                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `report_definitions`  | code, name, version, template_object_id, parameter_schema, active                                                                      | immutable published versions                                    |
| `report_runs`         | definition_id/version, organization scope, requested_by, parameters_json, data_snapshot_ref/hash, status, output_object_id, expires_at | reproducible and auditable                                      |
| `report_artifacts`    | report_run_id, format, object_key, checksum, size, generated_at, retention_class                                                       | one run may have DOCX/PDF/XLSX variants; immutable artifact metadata |
| `signature_snapshots` | report_run_id, function_code, person_display, title_display, signature_object_hash                                                     | copy-on-generate                                                |
| `attachments`         | owner_type/id, object_key, mime, size, checksum, classification, scan_status                                                           | signed access                                                   |
| `announcements`       | affiliation_id, message, active, activated_at, created_by                                                                              | partial unique index for one active                             |
| `employee_transfers`  | person_id, affiliation_id, source_tenant_id, destination_tenant_id, effective_date, request_type, status, reason                       | state machine                                                   |
| `transfer_approvals`  | transfer_id, approver_id, decision, comment, at                                                                                        | immutable                                                       |
| `audit_events`        | fields in 14.2                                                                                                                         | append-only/partitioned                                         |
| `outbox_events`       | aggregate, event_type, payload_version, occurred/published, attempts                                                                   | transactional                                                   |
| `notifications`       | recipient, channel, template, status, attempts, provider_ref                                                                           | no sensitive payload in provider log                            |

### 17.9 Critical constraints and indexes

- Composite indexes เริ่มด้วย `tenant_id`/`affiliation_id` สำหรับทุก list/report path.
- Partial unique: announcement active หนึ่งรายการต่อสังกัด; open primary membership ตาม policy; one disposal per asset.
- Partial/unique: leave export batch/idempotency ต่อ consumer/tenant/period/source hash และ active external person mapping ต้องไม่ซ้ำ; calculation constraints เป็นความรับผิดชอบของ Special-Allowances.
- Exclusion/validation for overlapping vehicle bookings and optionally employee leave/shift.
- Check constraints: date order, positive quantity, nonnegative money/mileage, fiscal month 1–12.
- Command invariant: employee onboarding is all-or-nothing across person/profile/membership/access/history and requires idempotency key for retry.
- Paper-result invariant: ผู้บันทึก `PAPER_APPROVED/PAPER_REJECTED` ต้องต่างจาก requester เว้นแต่มี recorded break-glass approval/reason/evidence; ไม่เรียก action นี้ว่า online approval.
- Document invariant: `leave_document_revisions` ที่ออกแล้ว immutable และ DOCX checksum ต้องตรง artifact; การแก้สร้าง revision ใหม่.
- Integration invariant: เฉพาะ effective `PAPER_APPROVED` leave เข้าสู่ export; ทุก batch trace กลับ request revision ได้และต้องไม่ mutate หลังส่งสำเร็จ.
- Stock invariant: on-hand projection may not become negative; receipt reversal with downstream consumption is rejected or preceded by explicit issue reversal.
- Decimal invariant: money/depreciation/quantity precision uses fixed decimal; closing book value and report totals obey an approved rounding rule.
- Retention invariant: vehicle, asset, employee, leave, finance plan and posted-stock records use archive/void/supersede; no cascading hard delete of histories.
- Foreign key ต้องป้องกัน cross-tenant reference; ใช้ composite FK หรือ trigger/policy เมื่อ DB ไม่รองรับตรง.
- Search index: normalized Thai text สำหรับชื่อ/รหัส; national ID exact-only blind index ไม่ full-text.
- Partition `audit_events`, `stock_movements`, monthly actual/history ตามเวลา/tenant เมื่อ volume ถึงเกณฑ์.

---

## 18. Proposed API Design

### 18.1 API principles

- Versioned REST JSON เช่น `/v1` พร้อม OpenAPI; use-case ที่ซับซ้อนใช้ command endpoint ชัดเจน.
- Server derives authorized organization context; route มี ID เพื่อความชัดแต่ต้องตรวจ membership/policy.
- Standard resource envelope ไม่จำเป็นสำหรับทุก response แต่ error/pagination ต้องสม่ำเสมอ.
- ISO 8601 dates/UTC timestamps; API ใช้ ค.ศ. เท่านั้น, UI แปลง พ.ศ.
- เงินส่งเป็น decimal string หรือ minor unit ตามมาตรฐานเดียว; ไม่ใช้ binary float.
- `Idempotency-Key` สำหรับ POST command สำคัญ; `If-Match`/version สำหรับ update ที่ชนกันได้.
- ทุก response มี `requestId`; audit ใช้ `correlationId`.

### 18.2 Endpoint groups

**Identity and scope**

```http
GET    /v1/me
GET    /v1/me/scopes
GET    /v1/me/sessions
DELETE /v1/me/sessions/{sessionId}
POST   /v1/scopes/{scopeType}/{scopeId}:select
```

**Organizations and people**

```http
GET    /v1/affiliations/{affiliationId}
GET    /v1/affiliations/{affiliationId}/tenants
PATCH  /v1/affiliations/{affiliationId}/tenant-order
GET    /v1/tenants/{tenantId}/employees
POST   /v1/tenants/{tenantId}/employees
GET    /v1/employees/{employeeId}
PATCH  /v1/employees/{employeeId}
POST   /v1/affiliations/{affiliationId}/memberships
DELETE /v1/affiliations/{affiliationId}/memberships/{membershipId}
```

**Schedule, leave and official duty**

```http
GET    /v1/tenants/{tenantId}/schedules/{year}/{month}
PUT    /v1/tenants/{tenantId}/schedules/{year}/{month}/assignments/{assignmentKey}
POST   /v1/tenants/{tenantId}/leave-requests
GET    /v1/tenants/{tenantId}/leave-requests?year=&status=&employeeId=
PATCH  /v1/leave-requests/{id}
POST   /v1/leave-requests/{id}:issue-document
GET    /v1/leave-requests/{id}/document-revisions
GET    /v1/leave-document-revisions/{revisionId}/download
POST   /v1/leave-requests/{id}:record-paper-decision
POST   /v1/leave-requests/{id}:cancel
POST   /v1/leave-requests/{id}:void
GET    /v1/employees/{employeeId}/leave-balance?year=
POST   /v1/tenants/{tenantId}/official-duty-requests
POST   /v1/official-duty-requests/{id}:approve
```

`record-paper-decision` รับเฉพาะ `APPROVED/REJECTED` จากเจ้าหน้าที่ผู้รับผิดชอบและ metadata ของเอกสารภายนอก; เป็นการรับรองการบันทึกข้อมูล ไม่ใช่การอนุมัติออนไลน์. เมื่อเปิด document module แล้ว `issue-document` ต้อง snapshot ข้อมูลและสร้าง DOCX revision แบบ immutable.

**Special-Allowances integration — ฉ.10/11**

```http
GET    /internal/v1/allowance-leave-periods/{year}/{month}?tenantId=
GET    /internal/v1/allowance-leave-periods/{year}/{month}/changes?since=&tenantId=
POST   /v1/integrations/special-allowances/periods/{year}/{month}:sync-leave
GET    /v1/integrations/special-allowances/periods/{year}/{month}/reconciliation?tenantId=
GET    /v1/integrations/special-allowances/periods?fiscalYear=&tenantId=
GET    /v1/integrations/special-allowances/periods/{externalPeriodId}/results
GET    /v1/integrations/special-allowances/periods/{externalPeriodId}/reports
GET    /v1/integrations/special-allowances/reports/{externalReportId}/download
```

`/internal` เป็น consumer contract สำหรับ service account ของ Special-Allowances และคืนเฉพาะ effective `PAPER_APPROVED` leave พร้อม external person mapping/source revisions/hash. Endpoint `/v1/integrations/...` เป็น BFF/operation surface สำหรับ One Data UI; adapter เรียก Special API จริงและห้ามคำนวณ/lock/adjust result ใน One Data. Exact upstream paths ต้องยืนยันด้วย OpenAPI/contract tests ก่อน implementation.

**Inventory**

```http
GET    /v1/tenants/{tenantId}/supplies?query=&type=&sort=&cursor=
POST   /v1/tenants/{tenantId}/supplies
POST   /v1/tenants/{tenantId}/stock-receipts
POST   /v1/stock-receipts/{id}:post
POST   /v1/stock-receipts/{id}:void
POST   /v1/tenants/{tenantId}/stock-issues
POST   /v1/stock-issues/{id}:post
POST   /v1/stock-issues/{id}:void
GET    /v1/tenants/{tenantId}/stock-ledger?supplyId=&from=&to=
GET    /v1/tenants/{tenantId}/stock-balances
POST   /v1/tenants/{tenantId}/annual-issue-plans
POST   /v1/annual-issue-plans/{id}:lock
POST   /v1/annual-issue-plans/{id}:supersede
```

**Assets and vehicles**

```http
GET    /v1/tenants/{tenantId}/assets
POST   /v1/tenants/{tenantId}/assets
PATCH  /v1/assets/{assetId}
POST   /v1/assets/{assetId}/depreciations
POST   /v1/assets/{assetId}/repairs
POST   /v1/assets/{assetId}:dispose
POST   /v1/assets/{assetId}:reverse-disposal   # permission สูง + reason
GET    /v1/tenants/{tenantId}/vehicles
POST   /v1/tenants/{tenantId}/vehicles
PUT    /v1/vehicles/{vehicleId}/asset-link
POST   /v1/vehicles/{vehicleId}/authorizations
DELETE /v1/vehicles/{vehicleId}/authorizations/{id}
POST   /v1/vehicles/{vehicleId}/requests
POST   /v1/vehicle-requests/{id}:approve
POST   /v1/vehicle-requests/{id}:cancel
POST   /v1/vehicle-requests/{id}/usage
POST   /v1/vehicles/{vehicleId}/accidents
POST   /v1/vehicles/{vehicleId}/maintenance
```

**Finance**

```http
GET    /v1/affiliations/{affiliationId}/finance/cycles?fiscalYear=
POST   /v1/affiliations/{affiliationId}/finance/cycles/{revisionType}:open
POST   /v1/affiliations/{affiliationId}/finance/cycles/{revisionType}:close
GET    /v1/affiliations/{affiliationId}/revenue-items?fiscalYear=
POST   /v1/affiliations/{affiliationId}/revenue-items
POST   /v1/affiliations/{affiliationId}/revenue-items:copy-year
PATCH  /v1/affiliations/{affiliationId}/revenue-item-order
POST   /v1/tenants/{tenantId}/financial-plans
POST   /v1/financial-plans/{id}:submit
POST   /v1/financial-plans/{id}:lock
POST   /v1/financial-plans/{id}:supersede
PUT    /v1/tenants/{tenantId}/monthly-actuals/income/{fiscalYear}/{month}/{itemId}
PUT    /v1/tenants/{tenantId}/monthly-actuals/expense/{fiscalYear}/{month}/{itemId}
GET    /v1/tenants/{tenantId}/finance/plan-vs-actual?fiscalYear=
GET    /v1/affiliations/{affiliationId}/finance/summary?fiscalYear=&revision=
```

**Transfers, announcements, reports and audit**

```http
POST   /v1/affiliations/{affiliationId}/employee-transfers
POST   /v1/employee-transfers/{id}:submit
POST   /v1/employee-transfers/{id}:approve
POST   /v1/employee-transfers/{id}:reject
POST   /v1/employee-transfers/{id}:cancel
POST   /v1/affiliations/{affiliationId}/announcements
POST   /v1/announcements/{id}:activate
POST   /v1/reports/{reportCode}/runs
GET    /v1/report-runs/{runId}
GET    /v1/report-runs/{runId}/download
GET    /v1/audit-events?scope=&resourceType=&resourceId=&actor=&from=&to=
```

### 18.3 Command example

```json
POST /v1/leave-requests/01J...:record-paper-decision
Idempotency-Key: 9e2f...
If-Match: "4"

{
  "decision": "APPROVED",
  "externalDocumentNo": "ยล 0000/000",
  "externalDecisionDate": "2026-08-29",
  "note": "ตรวจเอกสารฉบับลงนามแล้ว",
  "clientRequestId": "..."
}
```

```json
{
  "data": {
    "id": "01J...",
    "status": "PAPER_APPROVED",
    "version": 5,
    "paperDecisionRecordedAt": "2026-08-29T03:15:00Z"
  },
  "requestId": "req_..."
}
```

### 18.4 Error contract

```json
{
  "type": "https://example.invalid/problems/invalid-transition",
  "title": "Invalid state transition",
  "status": 409,
  "code": "LEAVE_NOT_SUBMITTED",
  "detail": "Only a submitted request can receive a paper decision.",
  "fields": [],
  "requestId": "req_..."
}
```

ใช้ HTTP 400 validation envelope, 401 unauthenticated, 403 policy denied, 404 not found within authorized scope, 409 state/version conflict, 422 business rule, 429 rate limit. อย่าเปิดเผยว่าทรัพยากรต่าง tenant มีอยู่หรือไม่.

### 18.5 Pagination, filtering and search

- Cursor pagination เป็น default สำหรับ movement/audit; offset ใช้กับ master list ขนาดเล็กได้.
- Allowlist field สำหรับ sort/filter; คืน `nextCursor` และ `total` เฉพาะเมื่อคำนวณคุ้ม.
- Search ชื่อไทยรองรับ normalization/word boundary แต่ masking field อ่อนไหว.
- Report endpoint ไม่ควร reuse list API แบบวนหน้า; ใช้ query/read model ที่ versioned.

### 18.6 Events

Event ที่ควร publish หลัง commit:

```text
EmployeeTransferred.v1
LeaveDocumentIssued.v1
LeavePaperDecisionRecorded.v1
LeaveRequestVoided.v1
LeaveExportPrepared.v1
LeaveExportAcknowledged.v1
LeaveIntegrationReconciliationFailed.v1
OfficialDutyApproved.v1
SchedulePublished.v1
StockReceiptPosted.v1
StockIssuePosted.v1
AssetDisposed.v1
VehicleUsageCompleted.v1
PlanningCycleOpened.v1
PlanningCycleClosed.v1
FinancialPlanLocked.v1
MonthlyActualChanged.v1
AnnouncementActivated.v1
ReportRunCompleted.v1
```

Event payload ส่งเพียง ID, scope, version และข้อมูลที่ผู้บริโภคจำเป็น; หลีกเลี่ยง PII. Consumer ต้อง idempotent และรองรับ schema version.

---

## 19. Development Modules

### 19.1 Work packages

| Module                      | Scope                                                                                      | Key deliverables                                                        | Dependencies           |
| --------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------- |
| M1 Platform Foundation      | org scope, IAM, session, role/policy, audit, files, notification skeleton                  | secure shell, scope switch, permission SDK, audit viewer                | none                   |
| M2 Organization & People    | affiliation/tenant, employee, job/license, access grants, org order                        | directory, forms, effective history, transfer foundation                | M1                     |
| M3 Workforce                | leave first; shifts, holidays and official duty phased later                               | policy profile, balance, request, paper-result record/cancel/void; DOCX boundary deferred | M1–M2             |
| M4 Special Integration      | Portal identity mapping, Special-Allowances person mapping, leave sync, period/result/report adapter, reconciliation | reliable API boundary to systems already developed | M1–M3                  |
| M5 Documents & Reporting    | templates, DOCX/report runs, artifacts and source snapshots                                | later: official Leave DOCX; ฉ.10/11 artifacts remain owned by Special   | M1 + M2–M4 read models |
| M6 Inventory                | supplies, vendors, receipt, issue, ledger, annual plan                                     | immutable movement, balances, reports                                   | M1–M2, M5              |
| M7 Assets                   | asset/land lifecycle, depreciation, disposal, repair/custodian/benefit                     | พ.ด.1/พ.ด.2 registers                                                   | M1–M2, M5              |
| M8 Vehicles                 | registry, asset link, authorizations, requests, usages, accidents, maintenance             | forms 2–6, calendar/conflict                                            | M1–M2, M7, M5          |
| M9 Finance                  | master taxonomy, cycles, plans, actuals, comparisons, aggregate                            | tenant and affiliation dashboards/reports                               | M1–M2, M5              |
| M10 Integration & Migration | import, external adapters, reconciliation                                                  | templates, staging, sync/outbox ops                                     | all relevant modules   |
| M11 Quality & Operations    | observability, security, performance, DR, accessibility                                    | dashboards, runbooks, test harness                                      | continuous             |

### 19.2 Recommended team topology

- Platform/Security team owns M1, common libraries, policy and delivery platform.
- People/Leave/Integration owners develop M2–M4 for first production release; ทีมเล็กสองคนสามารถแบ่งตาม module ownership ใน monorepo.
- Reporting capability owner works with M5 and HR; official Leave DOCX follows after forms are supplied. ฉ.10/11 Excel ใช้ implementation เดิมของ Special-Allowances.
- Resource Operations team owns M6–M8 after pilot.
- Finance team owns M9 while starting rule/report discovery early.
- Enabling QA/Data team owns migration test data, report golden masters, tenant isolation and performance.

ถ้าทีมเล็ก ให้ใช้ code ownership ภายใน monorepo/module แทนสร้างหลายทีม/หลาย service.

### 19.3 Cross-cutting definition of done

ทุก feature ต้องมี:

- approved business rule/state diagram
- permission and scope tests
- audit events
- validation/error/empty/loading states
- accessibility keyboard/screen-reader checks
- localization/date/fiscal-year tests
- OpenAPI/contract tests
- migration/rollback strategy
- telemetry without PII
- user documentation and UAT scenario

---

## 20. MVP

### 20.1 MVP goal

สร้าง Core Personnel Platform ที่ถูกต้อง แล้วเปิดใช้ระบบลาแบบ Paper-first/ลงนามภายนอกเป็น source of truth พร้อมส่งใบลาที่ได้รับอนุญาตแล้วไปยังระบบ Special-Allowances เดิมผ่าน API. เปิดใช้งานแบบ incremental โดยยังไม่สร้าง One Data System ทุกโมดูลและไม่สร้าง Calculation Engine ฉ.10/11 ซ้ำ. DOCX เป็น document module ระยะถัดไป **[OWNER-CONFIRMED]**.

### 20.2 In scope

**Release 0 — Core Foundation**

- อบจ.ยะลา/รพ.สต. และ workspace/scope model.
- Person, EmployeeProfile, UserIdentity, Tenant/Affiliation Membership.
- effective-dated Employment History, Position, Workgroup, Employee Type และ Professional License เท่าที่จำเป็นต่อ Release 1.
- Authentication/session และ baseline role/permission ที่บังคับฝั่ง server.
- integration กับ SSO Portal launch token และ external identity mapping.
- functional assignment ขั้นต้นสำหรับเจ้าหน้าที่บันทึกผลเอกสารและผู้ตรวจข้อมูล; ผู้ลงนาม/ข้อมูลที่ต้องแสดงใน Word เพิ่มเมื่อเปิด document module.
- append-only audit, secure file/artifact storage และ fiscal/calculation period.
- seed/migration framework สำหรับ 38 รพ.สต. และบุคลากร 267 คน.

**Release 1 — First Production Modules**

- Leave policy profile สำหรับข้าราชการ อบจ. ตามประกาศ พ.ศ. 2569; สถานะบุคลากรอื่นยังไม่เปิดจนมี Rulebook ของกลุ่มนั้น.
- แบบร่าง/ส่งใบลา การคำนวณวัน/ยอดสิทธิ์ และสถานะผลเอกสารกระดาษ; DOCX/document revision เป็นระยะถัดไปเมื่อมีแบบฟอร์มมาตรฐาน.
- การบันทึกผลเอกสารกระดาษ `PAPER_APPROVED/PAPER_REJECTED`, การยกเลิก/void/correction และประวัติ audit; ไม่มี online approval chain.
- Portal SSO integration และ permission สำหรับ requester, HR/paper-result verifier, affiliation viewer และ auditor.
- External person mapping และ versioned leave API/adapter ไป Special-Allowances.
- Sync/reconciliation รายเดือน, configurable grace period, handling สำหรับ Special period ที่ open/locked และ adjustment หลังล็อก.
- แสดงสถานะรอบ ผล และลิงก์รายงาน ฉ.10/11 จาก Special-Allowances ผ่าน One Data UI โดยไม่คำนวณซ้ำ.
- basic leave/integration dashboard, audit timeline และ reconciliation report.

**Pilot rollout**

- รพ.สต. ขนาดใหญ่ 1 แห่ง, ขนาดกลาง 1 แห่ง และขนาดเล็ก 1 แห่ง.
- ใช้ข้อมูลจริงเฉพาะหลัง migration rehearsal, PDPA/security sign-off และ UAT.
- rollout แบบ `3 → 10 → 38 รพ.สต.` เมื่อผ่าน exit criteria แต่ละช่วง.

### 20.3 Out of scope for first release

- ตารางเวร/OT, ไปราชการ และรายงานที่ไม่จำเป็นต่อ Leave + ฉ.10/11 first workflow.
- Inventory, Assets, Vehicles และ Finance planning/actuals.
- รายงาน One Data System ทั้ง 17 แบบนอกเหนือจากแบบที่ต้องใช้ใน first workflow.
- การเขียนสูตร calculation engine, period/result/lock/adjustment และ template ฉ.10/11 ซ้ำใน One Data; ใช้ Special-Allowances เดิม.
- Online leave approval, digital signature/PKI และการบังคับอัปโหลดสแกนเอกสารลงนาม.
- mobile native app, offline-first, public API marketplace.
- advanced forecasting/AI, OCR, automated bank/accounting integration.
- highly configurable workflow designer.
- multi-language beyond Thai/technical English labels.
- Clinical/patient/HDC data จนกว่าจะมีการตัดสิน System Boundary และ security/privacy review.

### 20.4 MVP acceptance gates

- Target baseline ถูกต้อง: อบจ.ยะลา 1 แห่ง, รพ.สต. 38 แห่ง และบุคลากร 267 คน ณ migration cutoff พร้อม reconciliation ที่เจ้าของข้อมูลลงนาม.
- UAT end-to-end อย่างน้อย 3 รพ.สต. ขนาดใหญ่/กลาง/เล็ก และ role/policy profiles ที่ได้รับอนุมัติ.
- ไม่มี cross-tenant data leakage ใน automated suite/penetration test.
- Leave balance/day counting, paper-result/cancel/void ผ่าน golden cases/edge cases ที่ฝ่ายงานรับรอง; DOCX มี acceptance gate แยกเมื่อเปิด document module.
- Employee onboarding ผ่าน atomicity/idempotency/failure-injection test และ correction-vs-real-change ย้อนหลังให้เอกสารถูก version.
- ผู้ยื่นไม่สามารถบันทึกว่าเอกสารของตนได้รับอนุญาต; break-glass ทุกกรณีมีผู้อนุญาต เหตุผล หลักฐาน และ immutable audit.
- เมื่อเปิด document module แล้ว DOCX golden-master ต้องผ่านข้อความ ช่องข้อมูล หน้า ฟอนต์ และ checksum policy; ดาวน์โหลด revision เดิมต้องให้ข้อมูลเหมือนเดิม.
- API contract test ยืนยัน mapping วันลาจาก One Data ไป attendance projection ที่ Special-Allowances ใช้ทั้ง save และ period-lock path.
- Reconciliation ก่อน lock รายงาน unmapped/rejected/changed/cancelled leave และ checksum; unresolved discrepancy ต้อง block lock หรือมี exception ที่ผู้มีอำนาจลงเหตุผล.
- Locked/Paid period ใน Special-Allowances ไม่ถูก overwrite เมื่อแก้ข้อมูลบุคลากรหรือใบลาภายหลัง; adjustment ย้อนรอยถึง original period ได้.
- Seed/load test ครบ 38 รพ.สต. และประมาณ 267 คน รวม aggregate report และช่วงปิดรอบ.
- Restore drill สำเร็จตาม RPO/RTO ที่ตกลง.
- Zero open critical/high security issue; medium มี risk acceptance/plan.
- Accessibility critical path ผ่าน WCAG 2.2 AA audit.
- Migration rehearsal อย่างน้อย 2 รอบและ reconciliation signed off.

### 20.5 Pilot exit criteria

- ใช้งานครบรอบคำนวณจริงอย่างน้อยหนึ่งรอบโดยไม่มี discrepancy ที่ยังหาสาเหตุไม่ได้.
- ไม่มี defect ระดับ critical/high ที่เปิดค้าง; business-rule defect มี decision owner และ regression test.
- ผู้ใช้แต่ละขนาด รพ.สต. ทำ critical tasks สำเร็จตาม usability target ที่ตกลง.
- Support, backup, incident, correction และ rollback runbook ผ่านการซ้อม.
- Product owner, HR/ผู้รับผิดชอบการลา, เจ้าของสูตร ฉ.10/11, การเงิน/ผู้ตรวจ และ security/PDPA ลงนาม go/no-go.

---

## 21. Phase 2 / Future Features

Roadmap หลัง First Production Release **[PROPOSED; reprioritize ตามผล pilot]**:

1. **Release 2 — Workforce Expansion:** ตารางเวร วันหยุด ไปราชการ/อบรม OT และรายงานที่เชื่อมค่าตอบแทน.
2. **Release 3 — Vehicles:** ทะเบียนรถ ผู้มีสิทธิ์ คำขอ/อนุมัติ usage/mileage อุบัติเหตุ ซ่อม และแบบ 2–6. หากรถต้องเชื่อมครุภัณฑ์ ให้สร้าง minimum asset registry เป็น dependency.
3. **Release 4 — Inventory:** วัสดุ ร้านค้า รับเข้า เบิก ledger/balance แผนประจำปี และรายงานคงเหลือ.
4. **Release 5 — Assets:** พ.ด.1/พ.ด.2 ค่าเสื่อม ผู้รับผิดชอบ ซ่อม ประโยชน์ และจำหน่าย.
5. **Release 6 — Finance:** master/cycle, BASE/เพิ่มเติม/เปลี่ยนแปลง, แผน ผลจริง เทียบแผน dashboard และรายงานรวม.
6. **Release 7 — Advanced Reporting & Integration:** รายงานราชการครบชุด, bulk import/export, event/webhook, HR/e-Saraban/accounting connectors และ analytics; Portal SSO กับ Special-Allowances API เป็น foundation ตั้งแต่ Release 0–1.

Future enhancements ที่ไม่ผูกกับ release จนกว่าจะมี business case:

- Notification orchestration ผ่าน in-app/push/email/Line/SMS พร้อม preference/escalation.
- Mobile/PWA สำหรับขอลา ขอรถ รับ/คืนรถ ถ่ายภาพเลขไมล์ และอนุมัติ.
- Barcode/QR, mobile stock count, lot/expiry/serial tracking และ reconciliation.
- Preventive maintenance ตามเวลา/เลขไมล์, asset survey, geotag และ duplicate detection.
- Advanced HR: license expiry, workforce planning, replacement and competency.
- Data warehouse/BI semantic layer พร้อม KPI dictionary และ cross-year trends.
- Workflow/rule configuration ต่อสังกัด โดยมี guardrail/version/test sandbox.
- Digital signature ที่สอดคล้องกฎหมาย/PKI หากต้องการ มากกว่าภาพลายเซ็น.
- Archival/records management, retention automation, legal hold และ e-discovery.
- Anomaly detection โดยมี human review.

ทุก future feature ต้องเริ่มจาก business owner, data classification และ success metric ไม่ควรเพิ่มเพียงเพราะระบบอ้างอิงมีช่องให้กรอก.

---

## 22. Development Backlog

### Epic E01 — Platform, tenancy and identity

**Features**

- E01-F1 Affiliation/tenant scope and switcher
- E01-F2 Authentication, MFA, session lifecycle
- E01-F3 RBAC/ABAC policy service
- E01-F4 Functional assignments and signer selection
- E01-F5 Append-only audit and audit viewer
- E01-F6 Secure attachment/object storage

**Representative tasks**

- Define permission catalog and risk levels.
- Implement membership-derived scope middleware/repository guard.
- Seed STAFF/ADMIN without hard-coding future matrix.
- Build cross-tenant test fixture and IDOR suite.
- Implement session revoke/refresh reuse detection.
- Add audit event SDK, immutable sink and PII redaction.
- Add malware scan/signed URL/checksum pipeline.

### Epic E02 — Organization and people

**Features**

- E02-F1 Affiliation/tenant master and district ordering
- E02-F2 Employee profile/address/contact
- E02-F3 Position, workgroup, employee type
- E02-F4 Employment history and professional license
- E02-F5 Tenant/affiliation access grants
- E02-F6 Direct and request-based transfer

**Representative tasks**

- Confirm national ID search/encryption policy.
- Implement effective-dated memberships and overlap checks.
- Implement atomic/idempotent onboarding across person/profile/membership/access/employment history; add failure-injection tests proving no partial commit.
- Model correction vs real change with effective date and verify historical documents retain the correct version.
- Build org/list views and masked cross-unit directory.
- Implement 3-step transfer preview with dependency impact.
- Preserve source/destination history transactionally.
- Add access grant/revoke and transfer audit.

### Epic E03 — Leave-first workforce

**Features**

- E03-F1 Leave policy/rule catalog and effective dates
- E03-F2 Leave balances/usage ledger
- E03-F3 Draft, submit, paper-result record, cancel/void and correction
- E03-F4 Holiday/day-counting source
- E03-F5 Official DOCX template/version/revision (deferred until forms are provided)
- E03-F6 Shift/official duty extension after pilot

**Representative tasks**

- Convert the 2569 PAO announcement and official Word attachments into a signed Leave Rulebook/template inventory; confirm employee-type scope with HR.
- Workshop all 11 leave groups and day-counting examples; implement effective-dated policy profiles rather than one global quota table.
- Implement date/overlap/balance engine and immutable leave usage/correction history.
- Build DRAFT→SUBMITTED→PAPER_APPROVED/PAPER_REJECTED→VOIDED/CANCELLED guards without an online approval chain.
- Enforce requester/paper-result-verifier separation and test permission/break-glass paths.
- When official forms are provided, generate versioned DOCX; golden-test fields, Thai layout, pagination, checksum and repeat download.
- Add cancel/void/correction handling that restores balance and emits integration changes.
- Verify quota projection refreshes immediately after paper decision/cancel/void and repeated commands are idempotent with explicit feedback.
- Defer shift matrix/official duty coding until first production workflow is stable.

### Epic E04 — Special-Allowances integration

**Features**

- E04-F1 Portal/external identity and person mapping
- E04-F2 Versioned leave-summary contract
- E04-F3 Idempotent period sync and source snapshots
- E04-F4 Special period/result/report adapter for One Data UI
- E04-F5 Cutoff, lock awareness and reconciliation
- E04-F6 Late correction/adjustment hand-off

**Representative tasks**

- Inventory existing Special-Allowances OpenAPI/routes, attendance-entry projection, period lock and adjustment contracts; do not duplicate its formulas.
- Define canonical mapping from One Data leave groups to the exact Special fields/types already supported, including omission/reset semantics.
- Implement and reconcile immutable external person mappings; block unknown/duplicate mappings.
- Build internal leave-summary API and Special adapter with service-account auth, idempotency key, source refs/hash and contract tests.
- Sync repeatedly while Special period is open; default grace period 3 business days after month-end, configurable by authorized operator.
- Before lock, reconcile expected/accepted/rejected/unmapped/changed/cancelled counts and hashes.
- For locked/paid periods, hand late corrections to Special adjustment flow; controlled reopen only before payment with permission/reason/audit.
- Surface Special period status/results/reports in One Data without copying calculation ownership.

### Epic E05 — Reporting and documents

**Features**

- E05-F1 Versioned report definitions
- E05-F2 Async render/preview/download
- E05-F3 Signer and data snapshots
- E05-F4 XLSX/PDF artifact framework
- E05-F5 Report access/audit/retention
- E05-F6 Calculation-run report reproducibility

**Representative tasks**

- Inventory official Leave templates and obtain HR-approved golden DOCX files; use existing Special report artifacts for ฉ.10/11.
- Define parameter schemas and data dictionaries.
- Embed Thai fonts and test pagination.
- Prevent spreadsheet formula injection.
- Implement report job retry, expiry and regeneration policy.
- Build report diff tests across template versions.
- Verify repeated Leave document revision download is stable and Special report download resolves to the same external locked artifact/checksum.

### Epic E06 — Inventory

**Features**

- E06-F1 Supply/vendor/unit/location master
- E06-F2 Receipt and posting
- E06-F3 Issue and posting
- E06-F4 Movement ledger/balance/reconciliation
- E06-F5 Annual issue plan revision/lock
- E06-F6 Stock reports

**Representative tasks**

- Decide valuation method and negative-stock policy.
- Implement idempotent post/void with immutable movements.
- Block receipt reversal when downstream issues would make stock negative; require issue reversal first and preserve both movement links.
- Decide out-of-plan exception and whether pre-plan issues count retroactively; encode as versioned policy/golden cases.
- Add min/max warning and search/sort/pagination.
- Build reconciliation job and variance dashboard.
- Replace delete-to-edit with superseding revision.
- Golden-test opening/receipt/issue/balance values.

### Epic E07 — Assets and land/buildings

**Features**

- E07-F1 พ.ด.1/พ.ด.2 register
- E07-F2 Asset code generator
- E07-F3 Depreciation engine
- E07-F4 Custodian/benefit/repair histories
- E07-F5 Disposal workflow

**Representative tasks**

- Confirm code uniqueness and running reset scope.
- Confirm depreciation/residual/partial-year rules with finance.
- Use fixed-decimal depreciation with rounding/residual invariants; regression-test values that expose binary-float artifacts.
- Implement disposal transition and gain/loss calculation.
- Add annual survey and value adjustment audit.
- Build asset duplicate search by serial/registration/code.
- Golden-test registers and depreciation schedule.

### Epic E08 — Vehicles

**Features**

- E08-F1 Vehicle registry and asset link
- E08-F2 Authorized users
- E08-F3 Request/approval/calendar conflict
- E08-F4 Usage and mileage
- E08-F5 Accident and maintenance
- E08-F6 Forms 2–6/monthly report

**Representative tasks**

- Approve state diagram and approver source.
- Enforce authorization and booking overlap.
- Validate monotonic mileage and compute distance.
- Define owned/leased asset-link rule and merge duplicate process.
- Replace vehicle hard-delete cascade with archive/void and retention-aware child history.
- Classify/secure accident PII.
- Add service reminder hooks and report golden tests.

### Epic E09 — Finance planning and actuals

**Features**

- E09-F1 Fiscal calendar/revenue/expense master
- E09-F2 BASE planning cycle open/close
- E09-F3 Tenant plan and lock
- E09-F4 Monthly actual income/expense
- E09-F5 Plan-vs-actual dashboards
- E09-F6 Affiliation aggregate/reports

**Representative tasks**

- Obtain approved formula/data dictionary for every KPI.
- Implement cycle state and close preconditions.
- Enforce and test BASE → close/lock → ADDITIONAL/CHANGE sequencing with concurrent toggle protection.
- Add plan version/lock/ETag and adjustment audit.
- Normalize Oct–Sep fiscal month mapping.
- Implement zero-denominator/rounding rules.
- Reconcile tenant totals to affiliation aggregates.

### Epic E10 — Announcements, notifications and support

**Features**

- E10-F1 Single-active announcement with activation history
- E10-F2 In-app task inbox
- E10-F3 Notification adapters/preferences
- E10-F4 Support case handoff

**Representative tasks**

- Enforce one-active constraint transactionally.
- Verify activation propagates to every authorized tenant and deactivation removes the banner without stale cache.
- Design templates without PII in external channels.
- Add delivery status/retry/dead-letter.
- Replace opaque browser diagnostics with actionable setup.

### Epic E11 — Migration, security and production readiness

**Features**

- E11-F1 Staged import center
- E11-F2 Data reconciliation and cutover
- E11-F3 Observability/runbooks/DR
- E11-F4 Security/privacy/accessibility test program
- E11-F5 Performance/capacity

**Representative tasks**

- Define migration source ownership and mapping sign-off.
- Build synthetic/de-identified UAT dataset.
- Run tenant isolation, threat model and penetration test.
- Restore drill and report reproducibility drill.
- Accessibility audit critical paths.
- Load-test dashboard, schedule matrix, aggregate reports and export jobs.

### Backlog prioritization

Suggested sequence:

```text
E01 Platform
  ↓
E02 People/Organization
  ↓
  E03 Leave Paper-first → E04 Special-Allowances API/SSO Integration → E05 Unified UI/Reports
  ↓
Pilot 3 รพ.สต. → 10 → 38
  ↓
E08 Vehicles / E06 Inventory / E07 Assets / E09 Finance ตามผล pilot และ roadmap ที่ Product Owner อนุมัติ

E10 spans workflows; E11 spans all releases
```

Leave Rulebook/rule profile และ Special-Allowances integration contract ต้องเริ่มก่อน E03/E04 coding. Official DOCX และ golden template เป็นเงื่อนไขก่อนเปิด document module เท่านั้น. สูตรและ report ฉ.10/11 ไม่ใช่งานสร้างใหม่ของ One Data; ใช้ implementation/golden tests ใน Special-Allowances และเพิ่ม cross-system contract/reconciliation tests. Finance discovery ควรเริ่มล่วงหน้าแม้ coding E09 มาภายหลัง เพราะกฎไม่ชัดและเสี่ยง rework สูง.

---

## 23. Decision Register / Unknown / Requires Verification

### 23.0 Decisions and baselines closed through revision 1.5

| ID     | Decision/baseline                                                                                                                                                            | Status                                   | Impact                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| DR-001 | Target affiliation รุ่นแรกคือ อบจ.ยะลา 1 แห่ง                                                                                                                                | OWNER-CONFIRMED                          | organization root/scope                      |
| DR-002 | มี รพ.สต. 38 แห่ง ณ baseline                                                                                                                                                 | OWNER-CONFIRMED                          | tenant seed, aggregation, rollout            |
| DR-003 | บุคลากร 267 คน ณ 10 ส.ค. 2569 และจะเพิ่ม                                                                                                                                     | OWNER-CONFIRMED                          | migration/capacity/test data                 |
| DR-004 | กลุ่มเป้าหมายคือเจ้าหน้าที่ทุกคนของ รพ.สต. ในสังกัด                                                                                                                          | OWNER-CONFIRMED                          | identity/UX/training; login mapping ยัง OPEN |
| DR-005 | พัฒนา incremental ไม่สร้างทุกโมดูลก่อนเปิดใช้                                                                                                                                | OWNER-CONFIRMED                          | release strategy                             |
| DR-006 | First production direction คือ People/Organization Core → Leave แบบ Paper-first → Special-Allowances API → unified UI/report access                                      | OWNER-CONFIRMED                          | MVP/backlog/data model                       |
| DR-007 | Rollout แบบ pilot 3 แห่ง แล้ว 10 และ 38                                                                                                                                      | PROPOSED — formal approval pending       | UAT/support/cutover                          |
| DR-008 | Modular Monolith เป็น architecture baseline; target stack คือ NestJS + Next.js + TypeScript ส่วน Laravel/Vue เป็น current migration baseline                                      | OWNER-CONFIRMED + PROPOSED DESIGN        | implementation/deployment/migration          |
| DR-009 | ระบบใหม่ต้องไม่ลอก defect ของ reference: onboarding ต้อง atomic, approval ต้องมี SoD, เงินใช้ fixed decimal และข้อมูลราชการใช้ void/reversal/history แทน destructive cascade | PROPOSED — required engineering baseline | architecture, API, schema, acceptance gates  |
| DR-010 | MVP ไม่มี online leave approval; ผู้ใช้กรอก/ส่งใบลา พิมพ์หรือนำไปลงนามภายนอก แล้วเจ้าหน้าที่บันทึกผลเอกสารกลับเข้าระบบ; DOCX เป็นส่วนขยายภายหลัง | OWNER-CONFIRMED | leave workflow/API/permissions |
| DR-011 | เฉพาะใบลาสถานะ `PAPER_APPROVED` ที่ยังมีผลเป็น source input ให้ Special-Allowances ใน MVP; `CONFIRMED` เป็นชื่อ legacy ที่เลิกใช้และห้ามส่งใน contract | OWNER-CONFIRMED | integration/filter/reconciliation |
| DR-012 | `Special-Allowances` เดิมเป็นเจ้าของสูตร ตัวแปรที่ไม่ใช่การลา period/result/lock/adjustment/report; One Data ห้าม reimplement calculation engine                                   | OWNER-CONFIRMED + CODEBASE-VERIFIED      | system boundary/development scope            |
| DR-013 | ข้าราชการ อบจ. ใช้ประกาศมาตรฐานทั่วไปว่าด้วยการลาของข้าราชการองค์การบริหารส่วนจังหวัด พ.ศ. 2569 และแบบ Word แนบท้ายเป็น baseline                                                | LEGAL-SOURCE; HR SIGN-OFF REQUIRED       | policy profile/document templates            |
| DR-014 | สถานะการจ้างอื่นต้องมี LeavePolicyProfile/ฐานกฎหมายแยก และยังไม่เปิดสิทธิ์จนฝ่ายบุคคลรับรอง                                                                                         | OWNER-CONFIRMED GUARDRAIL                | rollout/data model                           |
| DR-015 | รอบ Special ที่ open sync ซ้ำได้; grace period เริ่มต้น 3 วันทำการแบบ configurable; หลัง locked/paid ใช้ adjustment ไม่ overwrite ผลเดิม                                            | OWNER-CONFIRMED                          | period protocol/late correction              |
| DR-016 | ใช้ `yala-pao-public-health-portal` เป็น SSO/module-entry และใช้ launch token/external identity mapping; แต่ละระบบมี local session/authorization                                       | OWNER-CONFIRMED + CODEBASE-VERIFIED      | IAM/integration                              |
| DR-017 | One Data, Portal และ Special-Allowances อยู่ server/shared-infra เดียวกันได้ แต่แยก database/user/secret และเชื่อมผ่าน API เท่านั้น                                                     | OWNER-CONFIRMED + PROPOSED SECURITY      | deployment/security                          |

#### 23.0.1 Observed constraints verified in revision 1.3

| ID     | Evidence closed by read-only verification                                               | Impact                                    |
| ------ | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| VE-001 | ประวัติการทำงานมีระดับพื้นที่, current flag, include-in-ฉ.11 flag และช่วงวันที่         | People model + ฉ.11 input snapshot        |
| VE-002 | Leave filter มี 4 ปลายทาง และ tenant-admin UI แสดง approve/reject/cancel สำหรับ pending | Permission workshop + Leave State Diagram |
| VE-003 | Official duty UI แสดง edit/delete/print โดยตัวอย่างไม่มี approval status                | แยก aggregate/workflow จาก Leave          |
| VE-004 | ฉ.11 มี 6 routes และ report-specific parameters ตาม catalog; ไม่พบ ฉ.10                 | Report matrix + P0-07/P0-09               |

#### 23.0.2 Observed constraints verified by mutation in revision 1.4

| ID     | Evidence closed by authorized synthetic transaction                                                                 | Impact                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| VE-005 | Employee edit distinguishes correction from real change and requires effective date for the latter                  | People temporal model + document snapshot              |
| VE-006 | Thai ID checksum/duplicate phone validation works, but failed employee create can leave a partial record            | Atomic onboarding/idempotency is P0 engineering gate   |
| VE-007 | Leave approve/reject/cancel transitions and quota reversal work; same actor can submit and approve                  | Reference state machine confirmed; target basic requester–paper-result-recorder separation is locked, while exact role/break-glass policy remains P0 |
| VE-008 | Holiday dates are disabled in leave selection; cancelled/rejected requests remain in history                        | Day-counting input + retention behavior                |
| VE-009 | Schedule auto-saves one cell and calculates a tested hourly shift as hours × configured rate                        | Shift calculation evidence; rounding/rates remain open |
| VE-010 | Stock blocks over-issue and blocks receipt deletion after downstream issue; issue reversal permits receipt reversal | Inventory reversal/dependency constraints              |
| VE-011 | Out-of-plan issue can proceed after warning and new plan utilization includes earlier issues                        | Annual-plan semantics decision required before E06     |
| VE-012 | Asset 5-year depreciation is active but leaks binary-float precision; vehicle delete cascades lifecycle history     | Decimal + retention guardrails                         |
| VE-013 | Affiliation BASE switch gates tenant plan creation and locks alternative plan switches until BASE closes            | Finance cycle state machine                            |
| VE-014 | One active affiliation announcement propagates to tenant banner; CRUD/deactivation work                             | Single-active transaction + cache invalidation         |
| VE-015 | After cleanup dashboard returned to 12 total/12 working/0 leave/0 duty/0 shift; synthetic CRUD records removed      | Test-environment restoration evidence                  |

### 23.1 Priority 0 — ต้องตอบก่อน finalize Release 0–1 domain/API

| ID    | Open decision                                                                                                                                                                                                                                                                 | Suggested owner                                         | Required artifact                                  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| P0-01 | ระบบรุ่นแรกเป็นงานบริหารหลังบ้านเท่านั้น หรือรวมข้อมูลผู้ป่วย/เวชระเบียน/HDC                                                                                                                                                                                                  | Product owner + DPO/security + health-information owner | signed System Boundary                             |
| P0-02 | ยืนยันการ map บุคลากร 267 คนกับบัญชี Portal, module role, account recovery/MFA และผู้ที่เป็น employee record แต่ไม่ต้อง login; Portal เป็น SSO baseline แล้ว                                                                                                                    | Product owner + Portal owner + IT/security              | Identity & Account Mapping Policy                  |
| P0-03 | บุคลากรมีหลาย รพ.สต./หลายกลุ่มงาน/ช่วยราชการ/รักษาการพร้อมกันได้หรือไม่, ย้ายกลางงวดอย่างไร และ semantics “แก้ข้อมูลที่ผิด” เทียบ “เปลี่ยนแปลงจริง” ใช้ย้อนหลังกับเอกสาร/สูตรใด                                                                                               | HR owner                                                | People & Membership Rulebook + correction policy   |
| P0-04 | Role matrix จริง: self/tenant/affiliation visibility, CRUD, approve, export, PII และ superadmin/auditor                                                                                                                                                                       | Process owners + security/DPO                           | signed Permission Matrix                           |
| P0-05 | ปิด online approval ออกจาก MVP แล้ว; ล็อกหลักว่า requester ห้ามเป็นผู้บันทึกผลกระดาษของรายการตนเอง. ยังต้องยืนยัน role ผู้บันทึก, metadata/หลักฐานขั้นต่ำ, cancel/void/correct/backdate และ break-glass สำหรับกรณีพิเศษ                                                                  | HR/process owner + auditor                              | Paper-result State Diagram + Permission/SoD matrix |
| P0-06 | ประกาศ ก.จ. พ.ศ. 2569 และ 11 กลุ่มเป็น baseline แล้ว; ยังต้องยืนยันวันหยุด ครึ่งวัน overlap อายุงาน สะสม ยกมา เอกสารประกอบ และ policy profile ของพนักงานจ้าง/ลูกจ้าง/สถานะอื่น                                                                                                  | HR/legal/process owner                                  | Signed Leave Rulebook + golden cases                |
| P0-07 | ยืนยัน field/type mapping จาก `PAPER_APPROVED` leave ไป attendance contract ที่ Special-Allowances รองรับ รวม employee mapping, complete-snapshot/reset semantics และช่วงวันที่ข้ามเดือน; สูตร ฉ.10/11 ไม่ implement ซ้ำใน One Data                                             | Special owner + HR + integration owner                 | Versioned API mapping + contract tests              |
| P0-08 | Direction cutoff/lock ปิดแล้ว: open sync ซ้ำ, grace 3 วันทำการ configurable, locked/paid ใช้ adjustment; ต้อง map exact status/API และสิทธิ์ controlled reopen ของ Special-Allowances                                                                                            | Allowance owner + auditor + integration owner          | Period Integration State Diagram                    |
| P0-09 | Leave DOCX ใช้แบบแนบท้าย พ.ศ. 2569; ต้องอนุมัติ golden layout/field mapping. ฉ.10/11 report เป็น artifact ของ Special-Allowances; One Data ต้องตกลง API download, permission, retention และ checksum contract                                                                 | HR/document owner + Special owner                      | approved Leave DOCX + report-access contract        |
| P0-10 | แหล่งข้อมูลบุคลากร 267 คน/38 รพ.สต., field mapping, duplicates, validation, migration cutoff และ reconciliation                                                                                                                                                               | Data owners + HR + IT                                   | migration inventory/mapping                        |

ห้ามเริ่ม integration production จน P0-05–P0-08 และ API mapping/contract tests ได้รับอนุมัติ; ห้ามออก Leave DOCX ใช้งานจริงจน P0-09 ได้รับอนุมัติ. สามารถพัฒนา skeleton/adapter test doubles ได้ แต่ห้ามสร้างสูตรหรือ report engine ฉ.10/11 ซ้ำใน One Data.

### 23.2 Deferred domain unknowns — ต้องปิดก่อน release ของโมดูลนั้น

- **Shift/OT/Official Duty:** rate, overlap, holiday multiplier, inspectors, approval และเอกสาร.
- **Stock:** valuation (FIFO/weighted average/latest), approval, reservation, lot/expiry และ opening; negative-stock/receipt-dependency guard ยืนยันแล้ว แต่ out-of-plan exception และ pre-plan utilization แบบย้อนหลังยัง OPEN.
- **Vehicles:** request states, approver, booking conflict, driver qualification, mileage correction, fuel, asset link.
- **Assets:** code uniqueness/reset, useful life, residual/partial year, rounding, revaluation, transfer/disposal reversal; binary-float artifact เป็น defect ที่ต้องมี regression test.
- **Finance:** KPI/formulas, submit/approve/lock/unlock, revision aggregation และ rounding; BASE gate/ลำดับเปิด alternative cycle ยืนยันแล้ว.
- **Organization expansion:** หลาย อบจ., affiliation nesting, tenant transfer/no-affiliation และ district master.
- **Integration:** Portal SSO และ Special-Allowances source ownership ปิดแล้วสำหรับ MVP; exact OpenAPI/identity mapping ยังต้องปิด. HR, HDC, e-Saraban, accounting และ webhook อื่นเป็น future discovery.

รายการเหล่านี้ไม่บล็อก Release 0–1 หากไม่มี dependency โดยตรง แต่ discovery ต้องเริ่มก่อน release ที่เกี่ยวข้อง.

### 23.3 Priority 1 — ต้องตอบก่อน Pilot/Production

1. Retention/archival/legal hold ของบุคลากร ลา calculation snapshots/results ลายเซ็น รายงาน และ audit.
2. Data classification/PDPA purpose/lawful basis, ROPA, masking, DSAR และสิทธิ์ข้ามหน่วยงาน.
3. RPO/RTO, availability, peak usage, support hours และ incident escalation.
4. ผู้ลงนามใช้ภาพลายเซ็นหรือ digital signature ตามกฎหมาย; acting/snapshot/effective date.
5. Notification channels, SLA, preference และข้อมูลที่อนุญาตให้ออกจากระบบ.
6. Browser/mobile/accessibility/offline/พื้นที่ bandwidth ต่ำ.
7. Hosting/data residency, backup key ownership และผู้ดูแลระบบหลังส่งมอบ.
8. แผนเติบโต 3–5 ปี เพื่อยืนยัน capacity headroom 100 หน่วยงาน/1,500–2,000 บัญชี.
9. ภาษา/timezone/currency อื่นนอก Thai/Asia-Bangkok/THB.
10. Pilot sites ขนาดใหญ่/กลาง/เล็ก, champion, training, support และ go/no-go authority.

### 23.4 Technical evidence gaps ของระบบอ้างอิง

- HTTP methods, status codes, headers และ request/response bodies **[UNKNOWN]**; mutation workflow ถูกทดสอบผ่าน UI แต่ไม่ได้ดัก payload ตามหลัก clean-room.
- Server-side permission enforcement และ cross-tenant isolation **[UNKNOWN]**
- Database schema, queue, storage, deployment topology และ source code **[ไม่สำรวจตามหลัก clean-room]**
- Error states ของฟอร์มที่ไม่อยู่ใน mutation set ยัง **[UNKNOWN]**; ฟอร์ม People/Leave/Duty/Stock/Asset/Vehicle/Shift บางส่วนมีหลักฐานแล้ว.
- Concurrent edit behavior และ idempotency โดยรวมยัง **[UNKNOWN]**; transaction rollback ของ employee onboarding พบว่าไม่ atomic ในหนึ่งกรณี **[MUTATION-VERIFIED DEFECT]**.
- Full responsive/accessibility/performance behavior **[UNKNOWN]**
- Push notification actual delivery **[UNKNOWN; current browser diagnostics unsupported]**
- Central audit/history หากซ่อนอยู่ใน role อื่น **[UNKNOWN]**

ช่องว่างเหล่านี้ไม่จำเป็นต้อง reverse engineer เพื่อสร้างระบบใหม่; ให้ยืนยัน requirement ของระบบใหม่ด้วย workshop, sandbox test และ acceptance cases.

### 23.5 Verification plan

| Question class    | Safest verification                                                    | Required participants               | Artifact                             |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| People/membership | Workshop ด้วยการย้าย ช่วยราชการ รักษาการ และหลาย assignment            | HR + unit/affiliation admins        | signed People Rulebook               |
| Leave             | ประกาศ/แบบ Word พ.ศ. 2569 + ตัวอย่างนับวัน/balance + paper-result/cancel/correction | HR + verifier + users               | Leave Rulebook/DOCX/golden tests     |
| ฉ.10/11 integration | Existing Special API/attendance projection + leave mapping + period lock/adjustment scenarios | Special owner + HR + auditor        | OpenAPI/contract/reconciliation tests |
| Permissions       | Role-by-role UAT accounts ใน sandbox                                   | security/DPO + representatives      | permission matrix/test results       |
| Workflow          | State-transition walkthrough + synthetic data                          | process owner/approvers             | state diagrams + SLA                 |
| Reports           | Golden file comparison และ repeat-download test                        | document owner/auditor              | approved templates/data dictionary   |
| API/schema        | Contract/domain reviewหลัง Rulebook approved                           | architects/developers/domain owners | OpenAPI/ERD/ADRs                     |
| Migration         | Two rehearsals + row/amount/hash reconciliation                        | data owners                         | reconciliation sign-off              |
| Security/privacy  | Threat model, DPIA/ROPA review, penetration and tenant isolation tests | security/DPO                        | risk register/test report            |
| Operations        | Load/restore/failover/support drills                                   | platform/operations                 | runbooks/SLO report                  |

---

# Appendix A — Module Analysis Notes

## A.1 Navigation and scope

- **Screens:** tenant and affiliation sidebars + organization switcher.
- **Components:** grouped navigation, current organization, current role, trial banner, theme and user menu.
- **Actions:** switch scope, navigate, open signature/push diagnostics/logout/support.
- **Observed APIs:** auth/me, refresh, tenant/affiliation metadata, announcements.
- **Rules:** membership determines available scopes **[INFERRED]**.
- **Permissions:** current admin sees both scopes **[CONFIRMED]**; other roles **[UNKNOWN]**.
- **UX:** scope labelดี; role modelคลุมเครือ.

## A.2 People/workforce

- **Screens:** employees, add employee, affiliation directory/access, transfer/direct request, schedule, holidays, leave/duty.
- **Forms:** profile/access; shift type; leave; official duty; transfer 3-step.
- **APIs observed:** employees, position-groups, leaves/history/quota, official-duties, holidays, transfer requests.
- **Mutation verified:** employee create/edit/delete, correction-vs-real-change effective date, leave approve/reject/cancel, official-duty training create/edit/delete และ schedule auto-save/calculation.
- **Rules:** 11 leave types/quotas, role two labels, job history for ฉ.11, authorized scope, holiday-disable, quota reversal.
- **Defects:** partial employee create, access fieldsไม่ round-trip, self-approval, stale quota จน reload, wrong duty toast, silent schedule save.
- **Unknowns:** exact day count, delegation/SoD policy, search semantics, role-by-role permissions.

## A.3 Inventory

- **Screens:** supplies, stock-in/out, annual plan, vendors, supply reports.
- **Forms:** supply master, receipt lines, issue lines, annual plan lines, vendor.
- **Observed APIs:** supplies pagination, supply-types.
- **Mutation verified:** receipt increases stock, over-issue blocked, issue reduces stock, receipt reversal blocked by downstream issue, issue/receipt reversal restores zero, out-of-plan confirmation และ pre-plan issue counted in later plan utilization.
- **Rules:** annual plan locks; stock reversal dependency confirmed.
- **Unknowns:** valuation, approval, reservation, lot/expiry, out-of-plan/pre-plan target policy.

## A.4 Assets/vehicles

- **Screens:** พ.ด.1/พ.ด.2 lists/forms; vehicle list/detail tabs.
- **Forms:** asset acquisition/lifecycle, vehicle registry, authorization/request/usage/accident/maintenance.
- **Observed APIs:** vehicle detail/usages/maintenance/accidents/permissions.
- **Mutation verified:** minimal asset/vehicle create-delete, 5-year schedule generation, vehicle lifecycle tabs, optional asset link and destructive cascade warning.
- **Rules:** 5-year straight-line default, disposal methods, authorized requester, optional asset link.
- **Defects:** binary floating-point in depreciation and cascade deletion of vehicle histories.
- **Unknowns:** complete status models, asset code scope, depreciation accounting/rounding, vehicle approval.

## A.5 Finance

- **Screens:** tenant plan/monthly actuals; affiliation dashboard/cycle/revenue master.
- **Forms:** plan edition, inline monthly actuals, cycle switches, revenue item flags/order.
- **Observed APIs:** cycles/categories/subtypes/price sources, monthly actuals, admin summary/personnel/plans.
- **Mutation verified:** BASE open enables tenant plan creation; BASE open disables alternative cycle switches; close/lock restores tenant lock.
- **Rules:** affiliation controls cycle; closing locks; tenant enters values against affiliation masters; fiscal Oct–Sep.
- **Unknowns:** formulas, revision aggregation, approval/unlock, backdating.

## A.6 Documents/settings/governance

- **Screens:** reports, tenant/affiliation settings, signature, announcements, support.
- **Forms:** report parameters/signers; organization signatories; signature; announcement.
- **Mutation verified:** tenant setting explicit save/restore and announcement create/edit/activate/tenant propagation/deactivate/delete.
- **Rules:** one active announcement, 2 MB image logo, base fields restricted.
- **Unknowns:** template versions, signature legal status, retention, centralized audit.

---

# Appendix B — Evidence and Traceability

### B.1 Evidence types used

- Route/menu/title and accessible text from rendered pages.
- Form labels, required markers, select options, disabled/read-only state and helper text.
- List/table headers, status labels, tabs, KPI cards and empty states.
- URL resources fetched by normal page navigation.
- No screenshots containing personal data are embedded; personal names โทรศัพท์ เลขประจำตัว และรายละเอียดเฉพาะบุคคลถูกละออก.

### B.2 Safe-action record

- เจ้าของระบบยืนยันว่า environment เป็นระบบทดลองและอนุญาต create/edit/delete/approve/reject/cancel ได้เต็มที่; ใช้ tag สังเคราะห์เฉพาะรอบทดสอบและไม่แก้ระเบียนจริงที่มีอยู่ก่อน.
- ไม่ inspect authentication secrets, cookies, token หรือ browser storage และไม่บันทึก PII ของบุคคลจริงลงเอกสาร.

| Domain        | Safe mutations ที่ทำ                                                                                                 | ผลยืนยัน                                                                           | Cleanup/restore                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| People        | create, retry หลัง validation, correction edit, effective-dated real change, delete                                  | พบ partial commit และ temporal edit semantics                                      | ล้างเวรก่อน แล้วลบบุคลากรสังเคราะห์; dashboard กลับ 12 คน                                 |
| Leave         | create sick/personal, approve, reject, cancel, reload quota                                                          | ยืนยัน 4 terminal labels, holiday-disable, quota reversal และ self-approval defect | ใบลา test สถานะ `ยกเลิก`/`ไม่อนุมัติ` อย่างละ 1 ยังคงใน audit history; ไม่มี active leave |
| Official Duty | create training subtype, edit, detail, delete                                                                        | metadata training ครบ; wrong-domain toast                                          | ลบรายการแล้ว                                                                              |
| Schedule      | assign morning shift, verify hours/money/dashboard, clear                                                            | 3.5 ชั่วโมง → 144.375; silent auto-save                                            | คืน cell เป็น `ว่าง`; เวรวันนี้ 0                                                         |
| Inventory     | create vendor/item, receipt 5, reject issue 6, issue 2, out-of-plan confirm, create/delete plan, reversal dependency | stock/negative/dependency และ retroactive utilization                              | ลบ issue → receipt → item → vendor; list กลับว่าง                                         |
| Asset         | validate, create minimal asset, inspect depreciation/lifecycle, delete                                               | 5-year default; floating precision defect                                          | ลบระเบียนสังเคราะห์                                                                       |
| Vehicle       | validate, create minimal vehicle, inspect forms 3–6/asset link/delete warning                                        | optional asset link; destructive cascade warning                                   | ลบรถสังเคราะห์; vehicle count กลับเดิม                                                    |
| Finance       | toggle BASE cycle, verify tenant create-plan gate/alternative-switch lock, close cycle                               | state dependency ระดับ affiliation → tenant                                        | คืน BASE เป็น `ปิด/ล็อก`; ไม่สร้าง plan edition                                           |
| Settings      | change document-number field, save, restore                                                                          | explicit dirty/save behavior                                                       | คืนค่าตรงเดิมและยืนยันไม่มี test suffix                                                   |
| Announcement  | create inactive, activate, verify tenant banner, deactivate, edit, delete                                            | single-active propagation across scope                                             | ลบประกาศ; no active test banner                                                           |

Final cleanup audit ตรวจหน้า employee, schedule, supplies, stock-in, stock-out, annual-plan, vendor, asset, vehicle, tenant-settings และ affiliation-announcement แล้วไม่พบ test tag. แดชบอร์ดสุดท้ายแสดงบุคลากร 12, ปฏิบัติงาน 12, ลา 0, ไปราชการ 0 และเวร 0. ประวัติใบลา 2 รายการที่ระบุข้างต้นไม่สามารถลบจาก UI และควรคงไว้ตามหลัก audit.

### B.3 Traceability convention for implementation

ระหว่าง refinement ให้เปลี่ยนแต่ละข้อเป็น requirement ID และเชื่อม:

```text
Observed evidence / Owner-confirmed decision
  → Business rule (BR-xxx)
  → Decision Register item (DR/P0)
  → User story / acceptance criteria
  → Permission
  → API operation
  → Database constraint
  → Audit event
  → Automated test
  → Report/KPI definition (ถ้ามี)
```

เอกสารนี้เป็น baseline discovery. ข้อ **[CONFIRMED]** หมายถึงยืนยันว่า UI แสดงพฤติกรรม/ข้อความนั้น ไม่ได้ยืนยันว่าการ implement ภายในปลอดภัยหรือถูกต้องทุกกรณี. ข้อ **[INFERRED]** ต้องผ่าน workshop/test ก่อนนำเป็น acceptance criteria และข้อ **[UNKNOWN]** ห้ามเติมเองโดยนักพัฒนา.

---

# Implementation Addendum v1.6 — MVP decisions (29 สิงหาคม 2569)

ส่วนนี้เป็น historical decision จาก revision 1.6 เพื่อ traceability เท่านั้น. ข้อความเรื่องสถานะใบลาและ source input ถูก supersede โดย `Implementation Addendum v1.8` ท้ายเอกสาร; ห้ามใช้ `CONFIRMED` เป็นสถานะปฏิบัติการใหม่.

## MVP ที่เริ่มพัฒนา

- One Data ใช้ Laravel Modular Monolith + Vue/Inertia และแยก database ownership จาก Special-Allowances
- รอบแรกทำ People/Organization Core, ระบบลาแบบเรียบง่าย และ integration กับ Special-Allowances
- ยังไม่สร้าง Word/document module และไม่ทำ online approval chain ในรอบแรก
- ระบบจองรถยังคงแยกใช้งานต่อไปจนกว่าจะมี decision แยกเรื่อง migration/ownership

## สถานะใบลาและ source ที่มีผล

```text
DRAFT → CONFIRMED → CANCELLED
  └────────────────→ VOID
```

- `DRAFT` เป็นข้อมูลที่ยังแก้ไขได้และไม่ส่งไปคำนวณ
- `CONFIRMED` เป็นสถานะเดียวที่มีผลและเป็น input ของ Special-Allowances
- `CANCELLED` ไม่อยู่ใน complete snapshot ใหม่; `VOID` ใช้รักษาประวัติรายการที่ไม่ใช้
- One Data ส่ง complete monthly leave snapshot; Special เป็นเจ้าของการคำนวณ period ผลลัพธ์ และรายงาน

## Integration decisions

- master data บุคลากร/หน่วยงานดึงจาก Special ผ่าน API; export/import เป็น fallback สำหรับ migration/กู้คืนเท่านั้น
- snapshot มี contract version, snapshot version, idempotency key, source cutoff, source hash และรายการวันลาแยกบุคลากร
- Special รับ snapshot เฉพาะ period `NORMAL` ที่ `OPEN`; งวดที่ lock แล้วต้องใช้ adjustment/correction flow ภายหลัง
- การเชื่อมใช้ service token แยกจาก Portal SSO และไม่อ่าน/เขียน database ของกันและกัน

## Deferred decisions

- จับคู่ Portal user กับ person ให้ครบและ mapping organization code จริง
- กฎวันลาที่ฝ่ายบุคคลรับรอง, แบบ Word จริง และ paper-result metadata
- การลาเศษวัน/การลาแบบช่วงข้ามเดือนในรูปแบบเอกสารทางการ
- locked-period adjustment, reconciliation dashboard และการทดสอบ aggregate/transfer ครบ 38 รพ.สต.

---

# Conclusion

แก่นของระบบใหม่ไม่ใช่การทำหน้าเว็บเหมือน One Data System แต่คือแพลตฟอร์มงานราชการระดับหน่วยบริการที่มี People Core ร่วม ข้อมูลที่ย้อนรอยได้ และ integration boundary ที่ชัดเจนสำหรับ 38 รพ.สต. ภายใต้ อบจ.ยะลา. ลำดับ implementation เริ่มต้นคือ Portal SSO/People Core → Leave MVP → Special-Allowances API/reconciliation → Pilot 3→10→38 แห่ง; Word/document module และโมดูลอื่นเพิ่มภายหลัง. One Data เป็น source of truth ของการลา ส่วน Special-Allowances เดิมเป็นเจ้าของสูตร รอบคำนวณ lock/adjustment ผล และรายงาน ฉ.10/11; ห้ามสร้างซ้ำหรือเชื่อมฐานข้อมูลตรง. ก่อนเปิด production เต็มรูปแบบต้องปิด Leave Rulebook ตามประกาศ ก.จ. พ.ศ. 2569, policy profile ตามสถานะการจ้าง, Portal/person mapping, Special API contract และ golden DOCX ตามลำดับความสำคัญ พร้อมนำ REF-DEF-001–012 ไปเป็น negative acceptance tests.

---

# Implementation Addendum v1.7 — Reference Re-audit & Target Stack (29 สิงหาคม 2569)

ภาคผนวกนี้เป็น historical decision จาก revision 1.7 หลังทดสอบระบบอ้างอิงซ้ำแบบ end-to-end. ข้อความเรื่อง workflow/source ของใบลาถูก supersede โดย `Implementation Addendum v1.8`; ส่วน target stack, แผน migration และข้อค้นพบจาก audit ยังคงใช้ได้. ข้อมูลใน revision ก่อนหน้ายังคงไว้เพื่อ traceability. `Laravel + Vue` หมายถึง current implementation baseline ใน repository; `NestJS + Next.js` คือ target stack ที่เจ้าของโครงการเลือกสำหรับการพัฒนาต่อไป **[OWNER-CONFIRMED + CODEBASE-VERIFIED]**

## 1. ขอบเขตและผลการทดสอบรอบล่าสุด

ทดสอบที่ `https://onedata.gmtech.app/` โดยใช้บัญชีผู้ดูแลที่เข้าถึงทั้ง workspace ระดับหน่วยงานและระดับสังกัด ครอบคลุม:

- tenant dashboard, บุคลากร, ตารางเวร, วันหยุด, ลา/ไปราชการ และเอกสาร/รายงาน
- วัสดุ, นำเข้า, เบิก, แผนเบิกประจำปี, ร้านค้า/บริษัท
- ครุภัณฑ์, ยานพาหนะ, การเงิน, รายงาน และตั้งค่าหน่วยงาน
- affiliation dashboard, รายงาน, หน่วยงาน, พนักงาน, ย้ายบุคลากร, คำขอย้าย, การเงิน, ตั้งค่าสังกัด, ผลัด และประกาศ
- mutation ที่ปลอดภัยด้วยข้อมูลสังเคราะห์: สร้าง/แก้ไข/ยกเลิก/ลบ/เปิดใช้งาน/ล็อกตามที่ workflow อนุญาต และตรวจ validation/error state

Environment ที่ทดสอบมีเพียง 1 รพ.สต. และไม่ใช่ข้อมูลจำลองครบ 38 แห่ง จึงยืนยันหน้าจอและ workflow ระดับสังกัดได้ แต่ยังยืนยัน aggregate, transfer และ reconciliation ข้ามหลายหน่วยงานแบบ production-scale ไม่ได้ **[MUTATION-VERIFIED + LIMITATION]**

หลังจบการทดสอบตรวจยืนยัน cleanup แล้ว:

- dashboard กลับเป็นบุคลากร 12 คน และปฏิบัติงาน/ลา/ไปราชการวันนี้ 0 รายการ
- marker จากบุคลากร ใบลา วัสดุ ใบรับ ใบเบิก แผน ร้านค้า รถ และประกาศไม่เหลือในหน้าที่ตรวจ
- ไม่ลบหรือแก้ระเบียนเดิมที่มีอยู่ก่อน รวมถึงประวัติที่ระบบอ้างอิงเก็บไว้
- ไม่ตรวจ cookie, token, local storage หรือข้อมูลลับของระบบอ้างอิง

## 2. UX/UI baseline ที่ต้องนำไปเป็น product direction

ระบบอ้างอิงมี shell เดียวที่สลับขอบเขตการทำงานได้:

| ขอบเขต | ลักษณะ UX/UI ที่ยืนยัน | แนวทางของระบบใหม่ |
| --- | --- | --- |
| Tenant / หน่วยงาน | sidebar แบ่งกลุ่มงาน, header สีขาว, card มุมโค้ง, KPI และ empty state ที่อ่านง่าย | ใช้ shared web shell และ workspace context เดียวกัน |
| Affiliation / สังกัด | dashboard รวมหลายหน่วยงาน, การเปิด/ปิดรอบแผน, รายงานรวม, การย้ายบุคลากร และประกาศ | ใช้ scope switcher และ permission-aware navigation |
| แบบฟอร์ม | drawer/modal, field label ชัด, validation inline, confirmation ก่อนรายการที่ย้อนกลับยาก | ให้ Next.js มี form state ที่ชัด แต่ validation และ authorization อยู่ใน NestJS ด้วย |
| รายงาน | document center รวมประเภทเอกสาร แยกหมวด และมี preview/print/PDF | แยก report definition, document snapshot และ artifact ออกจาก domain transaction |
| ข้อมูลไม่มีรายการ | แสดง empty state และคำอธิบาย ไม่ปล่อยหน้าว่าง | ใช้ component มาตรฐานร่วมกันทุกโมดูล |

เมนูและ visual language เป็นข้อกำหนดด้านประสบการณ์ผู้ใช้ ไม่ใช่เหตุผลให้คัดลอก source code หรือ defect ของระบบอ้างอิง **[OBSERVED + PROPOSED]**

## 3. Mutation findings ที่ยืนยันเพิ่ม

| Area | พฤติกรรมที่พบจากการทดสอบ | ข้อกำหนดของระบบใหม่ |
| --- | --- | --- |
| People | เพิ่ม/แก้ไขบุคลากรและข้อมูลที่ใช้กับ workflow อื่นได้; หน้าจอต้นแบบเคยมีความเสี่ยง partial save เมื่อเกิด failure | onboarding ต้องเป็น transaction เดียว, มี idempotency และ reconciliation |
| Leave | มีประเภทการลาหลายประเภท, ปฏิทินปิดวันหยุด/เสาร์อาทิตย์, สถานะ pending/ไม่อนุมัติ/ยกเลิก และพิมพ์ใบลา | MVP ใช้ state ที่เรียบง่ายตาม owner decision; server คำนวณวันลาและเก็บ revision |
| Schedule / ฉ.11 | เลือกผลัดแล้วบันทึกอัตโนมัติ; ตัวอย่าง 3.5 ชั่วโมงคูณ rate ได้ยอดทศนิยม; checkbox ตารางปฏิบัติงานเชื่อมกับรายงาน ฉ.11 | ไม่บันทึกเงียบโดยไม่มี feedback, ใช้ fixed decimal และมี calculation/source audit |
| Stock | ป้องกันเบิกเกิน, ลบใบรับที่มีรายการเบิกต่อไม่ได้, เบิกนอกแผนต้องยืนยัน และแผนที่สร้างภายหลังนับยอดเดิมย้อนหลัง | ใช้ dependency/reversal rule, explicit exception และ ledger ที่ตรวจสอบย้อนกลับได้ |
| Assets | ค่าเสื่อมแบบเส้นตรงแสดง floating-point artifact ในมูลค่าคงเหลือ | money/quantity ใช้ decimal และ rounding policy เดียวกันทั้ง API, DB, report |
| Vehicles | แบบขอใช้รถ (แบบ ๓) มีผู้ขอ/ผู้ขับ/ปลายทาง/เวลา; ยกเลิกและลบได้; dialog ระบุว่าลบประวัติที่เกี่ยวข้องแบบถาวร | workflow ต้องแยก request/approval/usage และใช้ archive/void/history แทน cascade hard delete ของ official records |
| Finance | tenant สร้างแผนไม่ได้เมื่อ affiliation ยังไม่เปิดรอบ; affiliation ควบคุมเปิด/ปิดประเภทแผน | cycle state ต้องเป็น policy ที่ตรวจจาก server และมี effective period/audit |
| Announcement | ประกาศที่เปิดใช้งานจาก affiliation แสดงเป็น banner ใน tenant จริง; มีได้ทีละประกาศที่ active ตามพฤติกรรม UI | publish/visibility scope ต้องเป็น explicit และมี audit |
| Transfer | workflow มีขั้นเลือกพนักงาน → หน่วยงานปลายทาง → ยืนยัน แต่ environment เดียวหน่วยงานทำให้ไม่มีปลายทาง | ออกแบบ effective-dated transfer/membership ตั้งแต่ต้น และทดสอบด้วย fixture หลาย tenant |

ข้อค้นพบข้างต้นเป็น evidence สำหรับ acceptance tests ไม่ใช่คำสั่งให้ทำทุกโมดูลใน release แรก **[MUTATION-VERIFIED]**

## 4. Anti-requirements จากรอบ audit

ระบบใหม่ต้องไม่สืบทอดพฤติกรรมเหล่านี้:

1. แจ้งบันทึกล้มเหลวแต่ commit บางส่วนของบุคลากรหรือ aggregate ที่เกี่ยวข้อง
2. อนุญาตให้ผู้ขออนุมัติหรือผู้ยื่นตรวจสอบรายการของตนเองโดยไม่มี policy/break-glass audit
3. คำนวณเงินด้วย binary floating point หรือปล่อยค่าทศนิยม artifact ลงรายงาน
4. บันทึก schedule/ยอดคำนวณสำเร็จโดยไม่มี status, timestamp, actor และ feedback ที่ตรวจสอบได้
5. ลบข้อมูลทางราชการแบบ cascade จนประวัติรถ/การใช้งาน/เอกสารหายถาวร
6. ใช้ hard delete แทน cancel, void, reverse, archive หรือ correction ในรายการที่มีผลต่อยอด/รายงาน
7. ให้ browser เป็นผู้ตัดสินวันลา โควตา ยอดคงเหลือ หรือ scope ของ tenant
8. ให้ข้อมูลสรุปข้าม workspace ต่างกันโดยไม่มี reconciliation, source version และ freshness indicator
9. ใช้ชื่อ เบอร์โทรศัพท์ หรือเลขประจำตัวประชาชนเป็น identity key เพียงอย่างเดียว
10. ใช้ข้อความสำเร็จ/ผิดพลาดที่ไม่ตรงกับผลของ mutation หรือทำให้ผู้ใช้เข้าใจว่า transaction เสร็จแล้วทั้งที่ยังประมวลผลอยู่

## 5. Target architecture decision: NestJS + Next.js

### 5.1 รูปแบบการ deploy

One Data ยังคงเป็น **Modular Monolith ในระดับ business/domain** แต่แยก presentation กับ API เป็นคนละ process เพื่อให้เหมาะกับ target stack:

```text
One Data repository / workspace
├── apps/web        Next.js + TypeScript + App Router
├── apps/api        NestJS + TypeScript + REST/OpenAPI
├── apps/worker     NestJS worker หรือ API image ที่ใช้ command แยก
└── packages
    ├── contracts   generated API types / schemas
    ├── ui          shared design-system components
    └── config      lint, TypeScript และ test configuration
```

`apps/web`, `apps/api` และ worker อาจอยู่ repository เดียวและอยู่บน Docker network เดียวกัน แต่ต้องมี health check, log, secret, release และ rollback boundary ที่ระบุได้. การแยก process นี้ไม่ใช่การแยก business module เป็น microservice **[OWNER-CONFIRMED + PROPOSED]**

### 5.2 Technology choices

| Layer | Target decision |
| --- | --- |
| API/domain | NestJS + TypeScript, module/controller/use-case/repository boundary |
| Web UI | Next.js + TypeScript + App Router; server components ใช้กับ read path และ client components ใช้กับ interactive form/table |
| Validation | DTO/schema validation ที่ API และ shared schema สำหรับ web form; client validation เป็น UX ไม่ใช่ security boundary |
| ORM/data access | Prisma เป็น default สำหรับ type-safe query/migration; ใช้ parameterized SQL/read model เมื่อ report ต้องการ query เฉพาะทาง |
| Database | MySQL 8 ในฐานข้อมูล One Data แยกจาก Portal และ Special-Allowances; money/quantity ใช้ DECIMAL |
| API contract | REST `/api/v1` สำหรับ web และ `/internal/api/v1` สำหรับ service integration พร้อม OpenAPI, correlation ID และ idempotency |
| Session/SSO | NestJS ตรวจ Portal launch token แล้วออก secure httpOnly session cookie; Next.js ไม่เก็บ token ใน localStorage และไม่ตัดสิน permission เอง |
| Async work | เริ่มจาก database-backed job/outbox; เพิ่ม BullMQ/Redis เมื่อมี workload/retry requirement จริง |
| Documents | แยก document module/worker, private storage, template version, source snapshot และ checksum; ยังไม่ล็อก library จนได้แบบจริง |
| Testing | Jest/Supertest สำหรับ API, Playwright สำหรับ web E2E, contract tests, tenant-isolation, migration/reconciliation และ document golden tests |
| Deployment | Docker Compose/shared-infra; reverse proxy route web และ `/api` ไปยัง process ที่ถูกต้อง |

### 5.3 Scope and ownership

- Portal เป็นเจ้าของ login, SSO, account recovery และ module access; One Data สร้าง local session และประเมิน permission ของตนเองทุก request.
- Special-Allowances เป็นเจ้าของ master data ในช่วง migration, สูตร ฉ.10/11, period, lock/adjustment, result และรายงาน; One Data ห้ามอ่าน/เขียน database โดยตรง.
- One Data เป็นเจ้าของ leave source และ external mapping; ช่วงแรกดึง employee/organization master จาก Special ผ่าน API แล้วเก็บ projection ที่มี source revision.
- `tenant_id`, `affiliation_id`, membership effective date และ permission scope ต้องถูกตรวจใน NestJS use case/repository ไม่เชื่อค่าจาก browser.

### 5.4 Target application flow

```mermaid
sequenceDiagram
    participant P as Portal SSO
    participant W as Next.js Web
    participant A as NestJS API
    participant D as One Data MySQL
    participant S as Special-Allowances API

    P->>A: short-lived signed launch token
    A->>A: verify issuer/audience/expiry/replay
    A->>D: map external identity + create session
    A-->>W: redirect + secure httpOnly session cookie
    W->>A: scoped API request
    A->>D: transaction/use case/audit/outbox
    A->>S: versioned service call when integration command runs
```

## 6. ผลต่อแผน release

ลำดับใหม่ที่เหมาะกับการพัฒนาโดยทีม 2 คน:

### Phase 0 — Decision and migration boundary

- freeze business contract ของ People, Leave และ Special integration
- สร้าง migration document, API schema และ fixture ของ 1 tenant/12 คนสำหรับ local development
- กำหนด feature flag, rollback และ coexistence ระหว่าง Laravel/Vue กับ NestJS/NextJS

### Phase 1 — NestJS/Next.js foundation

- monorepo/workspace, Docker, environment, health/readiness, logging และ error envelope
- Portal launch-token exchange, local session, workspace context, scope guard, role/permission และ audit
- Prisma schema baseline และ API contract ที่มี OpenAPI

### Phase 2 — People/Organization projection

- sync Special → One Data แบบ API พร้อม cursor/full sync, source revision, idempotency และ reconciliation
- person/employee/membership/job history แยก aggregate; onboarding/merge/disable เป็น atomic use case
- เตรียม fixture 38 tenant/267 employee ก่อนทดสอบ aggregate จริง

### Phase 3 — Leave MVP

- leave type/policy profile, holiday calendar, server-side date calculation, quota/read model และ overlap guard
- `DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED` และ `CANCELLED/VOIDED` ตาม decision ปัจจุบัน; ไม่ทำ online approval chain ใน MVP
- สถานะ `CONFIRMED` ที่ยังมีผลเป็น input ของ snapshot; Word/document module ยังรอแบบฟอร์มจริงตาม owner decision เดิม

### Phase 4 — Special integration

- complete monthly snapshot, source hash, idempotency, delivery/retry, unmapped report และ reconciliation
- period `OPEN`/`LOCKED` guard; locked-period correction ใช้ adjustment contract ของ Special
- แสดง delivery status และ external result/report reference ใน One Data เมื่อ contract พร้อม

### Phase 5 — UX parity and pilot

- shared shell, tenant/affiliation switcher, dashboard, People และ Leave ตาม visual direction ที่ audit ยืนยัน
- pilot 3 → 10 → 38 แห่ง พร้อม migration dry run, support playbook และ rollback rehearsal
- หลัง core stable จึงเพิ่ม Word, Vehicles, Stock, Assets, Finance และโมดูลอื่นตาม priority

## 7. ประเมิน implementation ปัจจุบัน

สิ่งที่ทำมาถูกทิศทางและควรรักษาไว้เป็น reference:

- ownership แยก One Data/Portal/Special และห้าม database coupling
- model หลักของ tenant, affiliation, person, mapping, leave revision, export batch, audit และ outbox
- API contract สำหรับ master data และ leave snapshot ที่มี source hash/idempotency
- state transition ของ leave และการทดสอบ integration ระดับแรก
- แนวคิด modular boundary, incremental rollout และใช้ระบบ Special คำนวณต่อ

สิ่งที่ยังไม่ควรถือว่าเสร็จหรือเป็น target UI:

- repository ปัจจุบันยังเป็น Laravel 11 + Vue/Inertia และมีเพียง dashboard, People, Leave และ integration slice ไม่ใช่ parity ของทุกเมนูในระบบอ้างอิง
- authorization ยังต้องขยายเป็น explicit permission/scope matrix และทดสอบข้าม tenant/affiliation
- leave service รุ่นปัจจุบันยังต้องย้าย server-side day calculation, holiday/quota/policy และ document boundary ให้ครบตาม acceptance criteria
- Portal/person mapping, master-data movement, 38-tenant aggregate, locked-period correction และ report reconciliation ยังต้องใช้ fixture/contract จริง
- การย้าย stack ไม่ควรแปลง controller/template ทีละไฟล์แบบไม่มี contract; ให้สร้าง NestJS API/Next.js shell แบบ strangler แล้วค่อยย้าย feature ที่มี acceptance test

ข้อสรุปคือ implementation ปัจจุบันเป็น **MVP spike ที่มี foundation ถูกส่วนหนึ่ง** ไม่ใช่เหตุผลให้ทิ้งทุกอย่าง แต่ก็ยังไม่ควรขยาย Laravel/Vue ไปจนกลายเป็น target product ก่อนเริ่ม migration **[CODEBASE-VERIFIED + PROPOSED]**

## 8. Decision register ที่อัปเดต

| Decision | สถานะ | ผลกระทบ |
| --- | --- | --- |
| Target stack ของ One Data คือ NestJS + Next.js + TypeScript | OWNER-CONFIRMED | เริ่ม migration plan; Laravel/Vue เป็น current baseline เท่านั้น |
| Business architecture ยังเป็น modular monolith | OWNER-CONFIRMED / PROPOSED DESIGN | ไม่แตก microservice; แยก web/API/worker เป็น process |
| Web กับ API ใช้ repository/workspace เดียวได้ แต่ contract ต้องชัด | PROPOSED | เหมาะกับทีมเล็กและลด drift ของ types/UI |
| `PAPER_APPROVED` เป็น leave state ที่มีผลใน MVP; `CONFIRMED` เป็น legacy/deprecated และไม่ใช่ source input | OWNER-CONFIRMED | ส่ง complete snapshot ไป Special เฉพาะใบลาที่มีผล; DRAFT/SUBMITTED ไม่ส่ง |
| Word/document และ paper-result ยังรอแบบฟอร์มจริง | OWNER-CONFIRMED | กันการสร้าง template ผิดมาตรฐาน; เตรียม module boundary ไว้ก่อน |
| Special เป็นเจ้าของสูตร/period/result/report | OWNER-CONFIRMED + CODEBASE-VERIFIED | One Data ทำ adapter/reconciliation ไม่ทำ calculation engine ซ้ำ |
| Reference UX/UI เป็น visual/product direction | OWNER-CONFIRMED | ทำ shared shell และ workspace-aware navigation ใน Next.js |
| รถ จัดซื้อ ครุภัณฑ์ การเงิน และโมดูลอื่นเพิ่มภายหลัง | OWNER-CONFIRMED | ต้องไม่ block pilot People/Leave/Special |

## 9. เอกสารที่ใช้คู่กัน

- แผนย้าย stack และ coexistence: [Migration Laravel/Vue → NestJS/NextJS](docs/MIGRATION_LARAVEL_VUE_TO_NESTJS_NEXTJS.md)
- สถาปัตยกรรม target: [ARCHITECTURE.md](ARCHITECTURE.md)
- contract ระหว่าง One Data กับ Special: [docs/INTEGRATION_CONTRACT.md](docs/INTEGRATION_CONTRACT.md)

---

# Implementation Addendum v1.8 — Leave Paper-first decision (29 สิงหาคม 2569)

ภาคผนวกนี้เป็น decision ล่าสุดสำหรับ workflow ใบลาและการส่งข้อมูลไป `Special-Allowances`. ให้ใช้แทนข้อความเรื่อง `CONFIRMED`, `DOCUMENT_ISSUED`, Word-first และ paper-result ใน revision ก่อนหน้า. Revision เดิมยังคงไว้เพื่อ traceability เท่านั้น.

## 1. สถานะมาตรฐานของใบลา

```text
DRAFT → SUBMITTED → PAPER_APPROVED
                  └→ PAPER_REJECTED

DRAFT/SUBMITTED → CANCELLED
PAPER_APPROVED → VOIDED
```

ความหมายของสถานะ:

- `DRAFT` — ผู้ใช้กำลังกรอกหรือแก้ไข; ยังไม่มีผลและไม่ส่งไป Special.
- `SUBMITTED` — ผู้ใช้ส่งข้อมูลเพื่อดำเนินการตามเอกสารภายนอก; ยังไม่มีผลและไม่ส่งไป Special.
- `PAPER_APPROVED` — เจ้าหน้าที่ผู้รับผิดชอบบันทึกผลว่าเอกสารภายนอกได้รับอนุญาตแล้ว; เป็นสถานะเดียวที่มีผลและส่งไป Special.
- `PAPER_REJECTED` — เอกสารภายนอกไม่อนุญาต; ไม่มีผลและไม่ส่งไป Special.
- `CANCELLED` — รายการถูกยกเลิกก่อนมีผล; เก็บประวัติไว้และไม่ส่งไป Special.
- `VOIDED` — รายการที่เคยมีผลถูกทำให้เป็นโมฆะ/แก้ไขตามเหตุผลที่ตรวจสอบได้; ไม่ลบข้อมูลเดิม และต้องทำให้ snapshot รอบถัดไปสะท้อนผลปัจจุบัน.

`CONFIRMED` เป็นชื่อสถานะ legacy/deprecated จากแผนเดิม ไม่ใช่สถานะปฏิบัติการของ MVP และห้ามใช้เป็น source input หรือส่งใน Integration Contract รุ่นใหม่. `DOCUMENT_ISSUED` เป็นสถานะที่อาจเพิ่มเมื่อเปิด document module; ไม่ใช่สถานะบังคับของ MVP.

## 2. ขอบเขตการทำงานของ MVP

- ไม่มี online approval chain และไม่เรียกการบันทึกผลเอกสารภายนอกว่า online approval.
- ผู้ใช้กรอกและส่งใบลาใน One Data แล้วดำเนินการพิมพ์/ลงนามภายนอกตามวิธีปฏิบัติงาน. การสร้าง DOCX ตามแบบราชการและการแนบไฟล์สแกนเลื่อนไปจนกว่าจะมีแบบฟอร์มมาตรฐาน.
- ผู้ยื่นห้ามบันทึก `PAPER_APPROVED` หรือ `PAPER_REJECTED` ให้รายการของตนเอง. ระบบต้องบันทึก actor, เวลา, เลขที่/วันที่เอกสาร และเหตุผลเมื่อมีการแก้ผล; break-glass ต้องมีผู้อนุญาตและ audit ที่ย้อนกลับได้.
- ก่อน `PAPER_APPROVED` ไม่ตัดโควตาใช้งานจริง. เมื่ออนุมัติให้ปรับ balance/usage ใน transaction เดียว; เมื่อ `VOIDED` ให้สร้าง reversal/adjustment ตาม policy โดยไม่ hard delete.

## 3. กติกา Integration กับ Special-Allowances

- One Data เป็น source of truth ของใบลาและเป็นผู้ส่ง complete monthly snapshot.
- Snapshot ต้องรวมเฉพาะ `PAPER_APPROVED` ที่ยังมีผล ณ `source_cutoff`; `DRAFT`, `SUBMITTED`, `PAPER_REJECTED`, `CANCELLED` และ `VOIDED` ไม่รวม.
- รายการที่เคยส่งแล้วถูก `VOIDED` หรือถูกแก้ให้ไม่เข้าเงื่อนไข จะหายจาก complete snapshot รอบถัดไปเพื่อให้ Special คำนวณค่าปัจจุบันใหม่. ถ้า period ถูก lock/paid ให้ใช้ adjustment/correction contract ของ Special.
- ส่งด้วย service token, source hash, revision, idempotency key และ delivery/reconciliation audit ตาม [Integration Contract](docs/INTEGRATION_CONTRACT.md); ห้ามอ่านหรือเขียนฐานข้อมูล Special โดยตรง.

## 4. ผลต่อการพัฒนา

ลำดับ implementation คือ schema/state transition และ audit ก่อน จากนั้นทำ UI สำหรับ `DRAFT/SUBMITTED`, หน้าบันทึกผลกระดาษสำหรับผู้รับผิดชอบ, quota projection และ snapshot/reconciliation. Document/DOCX module ทำเป็น boundary ที่เสียบเพิ่มภายหลังโดยไม่เปลี่ยนสถานะหรือ contract หลัก.

---

# Implementation Addendum v1.10 — Portal session foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกผลการทำ Phase 1 ต่อจาก foundation checkpoint โดยยังคง coexistence กับ Laravel/Vue และยังไม่แตะข้อมูลจริงของ Portal, Special-Allowances หรือ One Data เดิม.

## 1. Contract ที่ลงมือทำ

- Portal ส่ง HS256 launch token อายุสั้นไปยัง One Data; NestJS ตรวจ signature, `iss`, `aud`, `iat`, `exp`, `sub`, `jti` และ replay ภายใน process.
- `POST /api/v1/auth/portal/exchange` ตรวจ external identity mapping ก่อนสร้าง session; บัญชีที่ยัง map ไม่ถึง employee ที่ active หรือไม่มี active membership จะไม่ถูกสร้าง session.
- Session เป็น opaque random token; ฐานข้อมูลเก็บเพียง SHA-256 hash, external subject, role snapshot, เวลาออก/หมดอายุ/ยกเลิก และข้อมูลแสดงผลที่จำเป็น. Raw token ไม่อยู่ใน JSON response และไม่ถูกเก็บใน source/database.
- Cookie เป็น `httpOnly`, `sameSite` และเลือก `secure` ตาม environment/config. `POST /api/v1/auth/logout` ทำ soft revoke และล้าง cookie.
- `AuthGuard` ใช้ session เป็นทางหลัก; development identity เป็น fallback เฉพาะเมื่อ `ONEDATA_DEV_AUTH_ENABLED=true` และ `NODE_ENV` ไม่ใช่ production.
- Scope ของ session derive จาก active `EmploymentMembership` และไม่เชื่อ `tenant_id` จาก browser เพียงอย่างเดียว. Workspace tenant ถูกเรียงเป็นค่าเริ่มต้นก่อน affiliation เพื่อให้ flow ใบลาทำงานในหน่วยบริการได้.
- Next.js มี `/auth/portal/launch` เป็น bridge รับ query token, ส่งต่อให้ API ฝั่ง server และ forward เฉพาะ `Set-Cookie` ไปยัง browser ก่อน redirect ไป dashboard; ไม่เก็บ launch token ใน localStorage.

## 2. สิ่งที่ยังไม่ถือว่า production-ready

- ต้องเปลี่ยน in-memory replay guard เป็นกลไก durable/distributed เมื่อมี API หลาย replica.
- ต้องเพิ่ม session rotation, idle timeout, CSRF policy, cleanup job, session listing/revoke รายอุปกรณ์ และ audit event สำหรับ login/logout ตาม operational policy.
- ต้องทำ permission matrix ที่แยก role/capability ระหว่าง affiliation, tenant, self และ paper-result recorder; ตอนนี้ guard ตรวจ authentication และ scope membership เป็นหลัก.
- ต้องตั้งค่า Portal launch URL/secret และ external identity mapping ของบัญชีจริงใน environment แยก พร้อมทดสอบ cutover/rollback.
- ต้องสร้าง same-origin reverse-proxy/BFF policy ใน deployment จริง และเพิ่ม E2E `Portal launch → session → dashboard → workspace` ก่อนเปิดให้ผู้ใช้จริง.

## 3. Acceptance ของ checkpoint นี้

- target typecheck, API tests และ web build ผ่าน.
- มี unit tests สำหรับ session creation, raw-token non-persistence, cookie session resolution, revoke และ unmapped-account rejection.
- Docker target ต้อง `db:push` schema ใหม่ได้ และยังแยก volume/container จาก Laravel compose เดิม.

---

# Implementation Addendum v1.11 — Special master-data projection (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการทำงานกลุ่ม People/Organization projection จาก `Special-Allowances` โดยยังไม่เปิดใช้ข้อมูลจริงและไม่อ่านฐานข้อมูลของระบบต้นทางโดยตรง.

## 1. ขอบเขตที่ทำแล้ว

- `SpecialMasterDataClient` เรียก `GET /internal/api/v1/master-data/health-centers`, `employees` และ `users` ด้วย service token แยกจาก Portal session.
- ตรวจ response shape, required fields, date, duplicate source ID, duplicate health-center area key และ employee ที่อ้าง health center ไม่พบ ก่อนเริ่มเขียนข้อมูล.
- เขียนข้อมูลด้วย transaction เดียว: affiliation/tenant/employee/person/membership ใช้ source ID เป็นตัวจับคู่ซ้ำ.
- เก็บ `sourceSystem`, `sourceId`, `areaKey`, วันเริ่มงาน/เริ่มสังกัด และ `sourceUpdatedAt`; การย้ายหน่วยงานสร้าง membership ใหม่และปิด membership เดิมตาม effective date.
- ไม่ hard delete ข้อมูลที่หายจาก snapshot; tenant ที่ไม่ปรากฏจะถูก `INACTIVE` และ employee ที่ไม่ปรากฏจะถูก `isActive=false` พร้อมเก็บประวัติเดิม.
- บันทึก `MasterDataSyncRun` พร้อมจำนวนที่อ่าน/เขียน/ปิดใช้งาน/ผู้ใช้ที่ยังไม่มี employee mapping.
- เปิด development/admin command ผ่าน `POST /api/v1/people/sync/special`; ต้องมี role สำหรับ sync และต้องตั้งค่า `SPECIAL_ALLOWANCES_BASE_URL` กับ `SPECIAL_ALLOWANCES_INTEGRATION_TOKEN`.

## 2. ข้อจำกัดและงานต่อเนื่อง

- Contract ของ Special รุ่นปัจจุบันยังส่ง `employeeId: null` ใน master-data users; จึงยังไม่เดาหรือสร้าง Portal mapping จาก username/ชื่อ. การจับคู่ Portal → employee ต้องมาจาก mapping ที่ยืนยันได้ในขั้นถัดไป.
- ยังไม่มี scheduled worker, retry policy, reconciliation UI และ approval/permission matrix เต็มรูปแบบ.
- ต้องทำ dry-run ด้วยข้อมูลจริงหรือสำเนาที่ได้รับอนุญาต ตรวจ count/hash/missing/extra/conflict แล้วจึงเปิด source URL/token ใน environment ที่ใช้งานจริง.
- หาก source ส่งข้อมูลว่างหรือ schema ผิด ระบบจะ refuse ทั้ง sync และบันทึกสถานะ `FAILED`; ไม่ทำ partial apply.

---

# Implementation Addendum v1.12 — One Data capability authorization (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึก authorization รุ่นแรกของ target NestJS API โดยแยก “เข้าสู่ระบบได้” ออกจาก “ทำ action ใดได้” และไม่ใช้ค่าจาก browser เป็นแหล่งตัดสินสิทธิ์.

## 1. หลักการ

- Portal ยังคงเป็นเจ้าของบัญชี, module access และ role/position; One Data map role/position ที่อยู่ใน allowlist เป็น capability ของ One Data เอง.
- role/position ที่ไม่รู้จักไม่ให้สิทธิ์โดยอัตโนมัติ. `entitlements` ที่เป็นเพียงข้อมูลเปิด module ไม่ถูกตีความเป็นสิทธิ์เขียนข้อมูล.
- ตอนสร้าง local session จะเก็บ permission snapshot แยกจาก role snapshot; API route guard และ use case ตรวจ capability ฝั่ง server ทุกครั้ง.
- ขอบเขตข้อมูลยังคง derive จาก active `EmploymentMembership`; capability ไม่ขยายขอบเขต tenant/affiliation ที่บัญชีไม่มี.
- `DEVELOPMENT_ONLY` เป็น wildcard ได้เฉพาะ development fallback ที่เปิดด้วย explicit config และถูกปิดตายเมื่อ `NODE_ENV=production`.

## 2. Capability รุ่นแรก

| Capability | ขอบเขตการใช้ |
| --- | --- |
| `dashboard.view` | อ่านพื้นที่ภาพรวม |
| `employee.profile.read` | อ่านบุคลากรใน workspace ที่มีสิทธิ์ |
| `employee.master-data.sync` | สั่ง projection จาก Special-Allowances |
| `employee.identity-mapping.manage` | จับคู่ Portal subject กับ employee ที่ตรวจสอบแล้ว |
| `leave.request.read` | อ่านประเภทและรายการใบลาใน scope |
| `leave.request.create` | สร้างใบลาแบบ DRAFT |
| `leave.request.submit` | ส่ง DRAFT ไปดำเนินการเอกสารภายนอก |
| `leave.request.cancel` | ยกเลิก DRAFT/SUBMITTED ของตนเอง |
| `leave.paper-decision.record` | บันทึก PAPER_APPROVED/PAPER_REJECTED โดยผู้รับผิดชอบ |
| `leave.request.void` | ทำให้ใบลาที่มีผลเป็น VOIDED โดยผู้มีอำนาจ |
| `leave.snapshot.manage` | เตรียม/ส่ง/ตรวจ complete leave snapshot ไป Special-Allowances |

## 3. Mapping หลักจาก Portal

| Portal role/position | สิทธิ์ target รุ่นแรก |
| --- | --- |
| `super_admin` | ทุก capability ที่ประกาศใน target (`*`) |
| `health_admin`, `health_division_director`, `health_admin_officer` | People admin + Leave manager |
| `pcu_director` | อ่าน People + สร้าง/ส่ง/ยกเลิกใบลา + บันทึกผลกระดาษ/void |
| `pcu_staff`, `pcu_public_health_officer` | อ่าน/สร้าง/ส่ง/ยกเลิกใบลาตาม self workflow; อ่าน People ตาม mapping |
| `health_staff`, `viewer`, `executive_viewer` | อ่าน dashboard, People และใบลา |
| `PAPER_RESULT_RECORDER` | อ่านใบลา + บันทึกผลกระดาษ/void |
| `PEOPLE_SYNC_ADMIN` | อ่าน People + sync master data + identity mapping |

การรวมหลาย role/position ใช้ union ของ capability; ไม่มีการเดาสิทธิ์จากชื่อผู้ใช้ ตำแหน่งภาษาไทย หรือ `employeeId`.

## 4. Route/use-case gate ที่ลงมือทำแล้ว

- People list ต้องมี `employee.profile.read`.
- Special sync ต้องมี `employee.master-data.sync` และ identity mapping ต้องมี `employee.identity-mapping.manage`.
- Leave types/list ต้องมี `leave.request.read`; create/submit/cancel ใช้ capability แยกกัน.
- Paper result และ void ตรวจทั้ง capability และกฎ requester–approver separation ใน Leave service; ผู้ยื่นไม่สามารถบันทึกผลหรือ void ใบลาของตนเอง.
- การผ่าน route guard ไม่แทนการตรวจ tenant/affiliation scope และ state transition ใน service; ต้องผ่านทั้งสองชั้น.

## 5. สิ่งที่ยังต้องทำต่อ

- เพิ่ม delegated approver configuration จากข้อมูลจริงของฝ่ายบุคคล แทนการพึ่ง role/position แบบกว้าง.
- แยก permission scope ระดับ affiliation/tenant/self/ทีม และ effective date ให้ละเอียดเมื่อมี fixture 38 รพ.สต.
- เพิ่ม session revocation เมื่อ Portal role/position เปลี่ยน และ durable/distributed replay guard ก่อนขยายหลาย replica.
- ทำ UAT matrix ด้วยบัญชี Portal sandbox ที่ได้รับอนุญาตและทดสอบ negative cases ข้าม tenant/affiliation.

---

# Implementation Addendum v1.13 — Provisional leave calculation foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกกติกาคำนวณจำนวนวันลารุ่น development foundation ที่ลงมือทำแล้วใน NestJS API. กติกานี้มีไว้เพื่อให้จำนวนวันใน `DRAFT` คำนวณจาก server อย่างสม่ำเสมอและป้องกันข้อมูลขัดแย้งระหว่างการพัฒนา **ยังไม่ใช่ Leave Rulebook ของฝ่ายบุคคล และยังไม่ใช่ quota/balance engine สำหรับ production**.

## 1. สิ่งที่ลงมือทำแล้ว

- ตรวจ `startsOn` และ `endsOn` ที่ server; วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม.
- คำนวณช่วงวันแบบ inclusive ด้วย UTC date-only เพื่อไม่ให้ timezone ทำให้จำนวนวันคลาดเคลื่อน.
- เก็บ `requestedDays` เป็น `Decimal(8,2)` และคืนค่าใน contract เป็นตัวเลขหลังผ่านการคำนวณจากค่าทศนิยมที่กำหนดรูปแบบแล้ว; ไม่ใช้ floating-point arithmetic เป็นแหล่งความจริงของการบันทึก.
- มี counting mode สองแบบ: `WORKING_DAYS` ตัดวันเสาร์/อาทิตย์และวันหยุดที่มีอยู่ในปฏิทินของ affiliation; `CALENDAR_DAYS` นับทุกวันในช่วง.
- กติกา provisional ที่ map ไว้ใน code ได้แก่ `ANNUAL`, `PERSONAL`, `SICK`, `VACATION_LEAVE`, `PERSONAL_LEAVE`, `SICK_LEAVE` เป็น working days และ `MATERNITY_LEAVE`, `HAJJ_LEAVE`, `ORDAIN_LEAVE` เป็น calendar days. หากประเภทใดไม่อยู่ใน rule map ระบบจะปฏิเสธ ไม่เดากติกาให้เอง.
- เก็บ `calculationBasis` เช่น `PROVISIONAL_RULEBOOK_V1:WORKING_DAYS` เพื่อบอกว่าค่ามาจาก rule รุ่นใด.
- ป้องกันใบลา `DRAFT`, `SUBMITTED` หรือ `PAPER_APPROVED` ของบุคลากรคนเดียวกันที่ช่วงวันทับซ้อนกัน; `PAPER_REJECTED`, `CANCELLED` และ `VOIDED` ไม่ block การสร้างรายการใหม่.
- การบันทึกผลกระดาษที่ระบุ `approvedDays` ห้ามมากกว่า `requestedDays` ที่ server คำนวณไว้.

## 2. ขอบเขตที่ยังไม่ถือว่าเสร็จ

- ยังไม่ตัดสินสิทธิ์ตามประเภทบุคลากร อายุงาน สะสม/ยกยอด หรือจำนวนโควตา; ต้องรอ HR Rulebook ที่มีหน่วยงานผู้ออก เลขที่/ฉบับ วันมีผล และ scope ชัดเจน.
- ยังไม่เปิด half-day/ช่วงเวลาใน request contract. การเพิ่มครึ่งวันต้องกำหนด field, rounding, วันเริ่ม/สิ้นสุด, การชนกัน และผลต่อ Special ให้เป็นคำตัดสินเดียวกันก่อน.
- วันหยุดที่ใช้คำนวณต้องมาจากข้อมูล affiliation ที่เชื่อถือได้; ยังไม่มีหน้าจอ/worker สำหรับนำเข้าปฏิทินวันหยุดจริง.
- overlap guard รุ่นนี้เป็น application-level transaction check; ก่อน production ต้องเพิ่ม constraint/locking strategy ที่รองรับ concurrent requests หลาย replica.
- ยังไม่มี quota ledger ที่ตัด/คืนยอดอย่างครบวงจร และยังไม่มี complete monthly snapshot adapter ไป Special.

## 3. Acceptance ของ checkpoint นี้

- unit tests ครอบคลุม working days, calendar days, holiday exclusion, reversed range, unknown rule และ fixed calculation basis.
- target typecheck และ API test suite ผ่านรวม 6 suites/18 tests; ต้อง rebuild Docker target และทดสอบ create/overlap/cancel กับฐานข้อมูล development ก่อนเริ่ม UI workflow.

---

# Implementation Addendum v1.14 — Paper-first leave UI (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการนำ Leave vertical slice ไปใช้งานผ่าน Next.js UI ใน target workspace. แนวทางยังคงเรียบง่ายตามคำตัดสินของเจ้าของโครงการ: ผู้ใช้กรอกใบลาในระบบ, ส่งรายการเพื่อดำเนินการเอกสารภายนอก, แล้วเจ้าหน้าที่บันทึกผลจากใบกระดาษในระบบ. ยังไม่สร้าง DOCX และไม่มี online approval chain.

## 1. ขอบเขต UI ที่ลงมือทำแล้ว

- เพิ่มหน้า `/leave` ที่อ่านประเภทการลาและรายการใบลาจาก NestJS API ตาม tenant workspace ของ session.
- ผู้มี capability `leave.request.create` สร้างใบลาเป็น `DRAFT`; จำนวนวันและฐานการคำนวณมาจาก server ไม่รับค่าจำนวนวันจาก browser.
- ผู้เป็นเจ้าของรายการที่มี capability `leave.request.submit` ส่ง `DRAFT` เป็น `SUBMITTED`; ผู้เป็นเจ้าของที่มี `leave.request.cancel` ยกเลิก `DRAFT/SUBMITTED` ได้ โดยประวัติยังอยู่.
- ผู้มี capability `leave.paper-decision.record` เปิดแบบฟอร์มบันทึกผลกระดาษ พร้อมผลอนุมัติ/ไม่อนุมัติ, จำนวนวันที่อนุมัติ, เลขที่เอกสาร, วันที่เอกสาร และหมายเหตุ.
- ผู้มี capability `leave.request.void` ทำให้ `PAPER_APPROVED` เป็น `VOIDED` พร้อมเหตุผล; API ตรวจ requester–approver separation ซ้ำ แม้ UI จะแสดง control ตาม capability แล้ว.
- ทุก action ใน UI เรียก server action ของ Next.js ซึ่งส่ง session cookie และ tenant context ให้ API; การตัดสินสิทธิ์และ state transition ยังอยู่ที่ NestJS service/guard.
- Dashboard เดิมเชื่อมลิงก์ไปหน้า `/leave` แล้ว ส่วน People link ยังเป็น placeholder จนกว่าจะมี People UI ที่พร้อม.

## 2. สิ่งที่ยืนยันด้วยการทดสอบ

- API unit tests สำหรับ requester self-recording, approved days เกิน requested days และ atomic paper approval + audit/outbox ผ่าน.
- Browser smoke ใน Docker target ด้วยข้อมูลสังเคราะห์ยืนยัน `create DRAFT → submit SUBMITTED → record PAPER_APPROVED ด้วย recorder ที่แยกบัญชี → void VOIDED`; รายการทดสอบไม่มีสถานะที่มีผลค้างอยู่.
- ค่าเริ่มต้นของ Docker target ยังปิด development auth และเมื่อปิดแล้ว `/api/v1/me` ตอบ `401`; dev role ถูกเปิดเฉพาะระหว่าง smoke test และคืนค่าเดิมหลังทดสอบ.

## 3. ขอบเขตที่ยังไม่ควรตีความว่าเสร็จ

- การสร้าง Word/DOCX, preview, เลขที่หนังสือ และการพิมพ์ยังเลื่อนไปหลังได้รับแบบฟอร์มมาตรฐานจริง.
- ยังไม่มี quota/balance, HR Rulebook, delegated approver configuration, half-day policy และการเลือก workspace หลายแห่งผ่าน UI.
- ยังไม่มี Special snapshot prepare/send/retry/reconciliation UI; `PAPER_APPROVED` เป็นเพียงผลภายใน One Data จนกว่าจะผ่าน integration adapter และ period protocol.
- ก่อน production ต้องเพิ่ม CSRF/same-origin deployment policy, session hardening, rate limit, observability, production migration/backup และ UAT กับบัญชีจริงที่ได้รับอนุญาต.

---

# Implementation Addendum v1.15 — Special-Allowances leave snapshot adapter (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึก integration boundary รุ่นแรกระหว่าง Leave ของ One Data กับระบบ ฉ.10/11 โดยไม่ย้ายสูตรหรือ calculation engine มาไว้ใน One Data.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม capability `leave.snapshot.manage` และ server-side guard สำหรับผู้ดูแล snapshot ใน affiliation workspace.
- เพิ่ม `LeaveExportBatch` และ `LeaveExportDelivery` เป็น integration aggregate แยกจาก `LeaveRequest`; payload ที่เตรียมแล้วไม่ถูกแก้ทับ หากข้อมูลเปลี่ยนให้สร้าง snapshot version ใหม่.
- `POST /api/v1/integrations/special/leave-snapshots/prepare` เลือกเฉพาะใบลา `PAPER_APPROVED` ที่มีผลก่อน `source_cutoff`, อยู่ในช่วงเดือนที่ระบุ, มี external employee mapping ที่มาจาก Special และมี leave type mapping ที่รู้จัก.
- สร้าง complete monthly snapshot ที่มี `period`, `snapshot_version`, `source_cutoff`, SHA-256 `source_hash`, `idempotency_key`, employee/leave counts และรายการวันที่ที่ตัดตามขอบเขตเดือน.
- `POST /api/v1/integrations/special/leave-snapshots/{batchId}/deliver` ส่งผ่าน service-to-service Bearer token ไป endpoint ของ Special, ส่ง `idempotency-key`, เก็บ response และตรวจว่า period/version ที่ตอบกลับตรงกับ batch ก่อน mark ว่าสำเร็จ.
- เก็บ delivery attempt และ audit ทุกครั้ง; network/408/429/5xx เป็น retryable พร้อม exponential backoff สูงสุด 5 ครั้ง ส่วน credential/configuration/validation error จะไม่ retry อัตโนมัติ.
- การตอบ `duplicate` จาก Special ถือว่าส่งสำเร็จเชิง idempotency และบันทึกสถานะ `DUPLICATE` แยกจาก `APPLIED`.

## 2. Compatibility ที่พบจาก source จริง

source code ของ `Special-Allowances` ที่ตรวจในรอบนี้ยัง validate `contract_version` เป็น `1.0` และ DTO ของ leave entry ยังไม่รับ field `status` กับ `paper_decision_recorded_at`. One Data จึงตั้งค่า `SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION=1.0` เป็นค่าเริ่มต้นและตัด field additive สองตัวออกจาก wire payload ในโหมดนี้ แต่ยังบังคับภายในว่า source records ต้องเป็น `PAPER_APPROVED` และต้องมี paper decision record.

เมื่อ source upstream ประสานเป็น contract v1.1 แล้วจึงเปลี่ยน configuration เป็น `1.1` เพื่อส่ง metadata สอง field นี้เพิ่มแบบ additive. ห้ามเปลี่ยนค่าใน production เพียงฝั่งเดียว เพราะ source ปัจจุบันจะปฏิเสธ payload version 1.1.

## 3. สิ่งที่ยังไม่เสร็จ

- scheduled worker สำหรับเลือก batch ที่ถึงเวลาส่ง/ลองใหม่ และ monthly cutoff orchestration.
- reconciliation UI/read model ที่แสดง mapping conflict, row-count/hash mismatch, period state และ locked-period response.
- locked-period adjustment/correction contract ของ Special; adapter รุ่นนี้หยุดที่ period protocol และไม่พยายามแก้ผลรอบที่ lock แล้ว.
- real-data contract test กับ endpoint และ token ของ environment ที่จะใช้งานจริง; local smoke ที่ทำแล้วใช้ missing-configuration/failure path และข้อมูลสังเคราะห์.
- production Prisma migration, backup/restore, secret manager, distributed job lock และ operational alerting.

## 4. Acceptance ของ checkpoint นี้

- target API test ผ่าน 9 suites/29 tests รวม client URL/auth/idempotency/error mapping, snapshot hash/idempotency, v1.0/v1.1 compatibility, delivery success/duplicate และ retryable failure.
- target typecheck/build ต้องผ่านหลัง regenerate Prisma client.
- Docker target ต้อง start ได้ด้วย auth ปิดเป็นค่าเริ่มต้น, health/readiness ผ่าน และไม่มี batch ทดสอบค้างในสถานะที่มีผล.

---

# Implementation Addendum v1.16 — Leave snapshot worker & monthly orchestration (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึก worker รุ่นแรกสำหรับ integration ใบลา โดยตั้งใจให้เป็น database-backed process ที่ deploy แยกจาก HTTP API ได้ แต่ยังใช้ image และ module boundary เดียวกัน.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `npm run worker:once -w @onedata/api` สำหรับรันงานหนึ่งรอบ และ `npm run worker -w @onedata/api` สำหรับ loop ตาม `ONEDATA_WORKER_INTERVAL_MS`.
- worker เลือกเฉพาะ `RETRYABLE_FAILURE` ที่ delivery ล่าสุดถึง `nextAttemptAt`, จำกัดจำนวนต่อรอบด้วย `ONEDATA_WORKER_BATCH_SIZE` และเรียก use case เดียวกับ manual delivery จึงรักษา idempotency/audit/period-version guard ชุดเดียวกัน.
- ใช้ MySQL named lock `onedata:leave-snapshot-worker` ภายใน connection/transaction เพื่อป้องกัน worker หลาย instance ทำงานซ้ำพร้อมกัน.
- สร้าง affiliation-scoped system identity เฉพาะใน process พร้อม capability `leave.snapshot.manage`; worker ไม่ใช้ Portal cookie หรือ development auth.
- เพิ่ม optional monthly mode: หลัง cutoff configurable (ค่าเริ่มต้น 3 วันหลังสิ้นเดือน) จะเตรียมและส่ง snapshot ให้ active affiliation ที่ยังไม่มี batch ของ period นั้น. หาก period มี batch แล้วจะไม่สร้างซ้ำ; การแก้ข้อมูลย้อนหลังให้ผู้ดูแล prepare ใหม่โดยตั้งใจ.
- เพิ่ม Docker Compose service ผ่าน `--profile worker`; `ONEDATA_WORKER_ENABLED=false` และ `ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED=false` เป็นค่าเริ่มต้นเพื่อไม่ให้ local boot ส่งข้อมูลภายนอกโดยอัตโนมัติ.

## 2. กฎการเปิดใช้งาน

- เปิด `ONEDATA_WORKER_ENABLED=true` เฉพาะ environment ที่มี Special URL/token, period protocol, schedule owner และ alerting ที่อนุมัติแล้ว.
- เปิด monthly mode แยกด้วย `ONEDATA_LEAVE_SNAPSHOT_MONTHLY_ENABLED=true`; ต้องเลือกว่าจะใช้ period ก่อนหน้าอัตโนมัติหรือกำหนด `ONEDATA_LEAVE_SNAPSHOT_PERIOD` แบบ explicit และต้องตรวจ cutoff/timezone ให้ตรงกับฝ่ายบุคคล.
- Worker ไม่ retry configuration/validation/locked-period failure; สถานะจะค้างให้ผู้ดูแลแก้และสั่ง prepare/deliver ตาม policy. Network/408/429/5xx เท่านั้นที่อยู่ใน retry path.

## 3. สิ่งที่ยังไม่เสร็จ

- scheduler/calendar ที่นับ “3 วันทำการ” ตามปฏิทินจริง แทนค่า calendar-day foundation ปัจจุบัน.
- reconciliation dashboard, alert/notification, dead-letter/manual recovery และ locked-period adjustment contract.
- distributed lock/lease metrics, production migration/backup/restore และ runbook สำหรับ deploy/rollback.
- real-data shadow run กับ 38 รพ.สต. และการอนุมัติ schedule ก่อนเปิด worker profile ใน production.

## 4. Acceptance ของ checkpoint นี้

- target API test ผ่าน 10 suites/32 tests รวม lock skip, retry due delivery, monthly cutoff/duplicate prevention และ affiliation-scoped system identity.
- target typecheck/build ผ่าน และ `docker compose -f docker-compose.target.yml config --profiles` แสดง worker profile.
- worker once/HTTP target ใช้ database development ได้ โดยไม่เปิด external delivery หรือทิ้งข้อมูลทดสอบที่มีผล.

---

# Implementation Addendum v1.17 — Production security guard foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกชั้นป้องกันที่เพิ่มก่อนนำ target NestJS/Next.js ไป UAT/production โดยไม่ถือว่าเป็น security sign-off เต็มรูปแบบ.

## 1. สิ่งที่ลงมือทำแล้ว

- `ConfigModule` ตรวจ environment ตอน startup; เมื่อ `NODE_ENV=production` จะหยุดทันทีหากขาด `DATABASE_URL`, Portal issuer/audience/secret, `CORS_ORIGIN`, ใช้ wildcard CORS, เปิด development auth หรือใช้ insecure session cookie.
- session มี absolute TTL เดิมและเพิ่ม idle timeout จาก `lastSeenAt`; session ที่หมดอายุจาก inactivity จะถูก revoke ก่อนสร้าง current-user context.
- cookie-authenticated mutation ตรวจ `Origin`/`Referer` กับ allowed `CORS_ORIGIN` ใน production; Next.js server actions และ Portal launch bridge ส่ง public web origin ให้ API เพื่อให้ flow ที่เป็นเจ้าของระบบผ่าน policy.
- API ส่ง `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` และ HSTS ใน production.
- เพิ่ม per-process rate limit สำหรับ Portal exchange และ mutation พร้อม `Retry-After`; ตั้งค่าเปิดเป็น default แต่ต้องวาง distributed limit ที่ reverse proxy/WAF ก่อนหลาย replica.
- เพิ่ม unit tests ของ environment validation, idle session, CSRF origin และ security middleware.

## 2. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- replay guard ของ Portal ยังเป็น in-memory; ต้องใช้ shared/distributed store หรือ one-time exchange service ก่อน scale-out.
- rate limit ใน API เป็น defense-in-depth ต่อ process; production ต้องกำหนด trusted proxy/IP policy และ limiter ที่ gateway/WAF/Redis.
- ยังต้องทำ session rotation, revocation propagation เมื่อ Portal role/membership เปลี่ยน, CSRF deployment rehearsal, secret rotation และ log redaction review.
- ยังต้องสร้าง/ตรวจ controlled Prisma migrations, backup/restore, alerting, vulnerability upgrade plan และ penetration/UAT checks.

## 3. Acceptance ของ checkpoint นี้

- target API test ผ่าน 12 suites/42 tests รวม production validation, idle session และ HTTP security middleware.
- target typecheck ผ่าน และ local Docker health/readiness ยังทำงานได้โดย auth ปิดเป็นค่าเริ่มต้น.

---

# Implementation Addendum v1.18 — Controlled migration & deployment foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการปิดช่องว่างด้าน Prisma migration และ deployment ที่เพิ่มหลัง security foundation. เป็น deployment foundation สำหรับ staging/UAT และ production preparation เท่านั้น; ยังไม่ใช่การอนุมัติใช้ฐานข้อมูลจริงหรือ production sign-off.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `apps/api/prisma/migrations/20260829210000_initial_target_schema/migration.sql` เป็น initial schema migration จาก Prisma schema ปัจจุบัน พร้อม `migration_lock.toml` สำหรับ MySQL.
- เพิ่ม `db:migrate` ที่ API และ `target:db:migrate` ที่ workspace root โดยใช้ `prisma migrate deploy`; local disposable compose ยังคงใช้ `db push` ได้เฉพาะ development.
- ตรวจ migration ด้วย MySQL container ชั่วคราว: `migrate deploy` apply สำเร็จ, `migrate status` รายงาน up to date และล้าง container หลังตรวจเสร็จ.
- เพิ่ม `docker-compose.target.production.yml` เป็น template ที่บังคับ image tag, database URL, Portal/Special secrets, HTTPS cookie, production CORS/CSRF และแยก API/web/worker process; worker อยู่ใน profile และปิดเป็นค่าเริ่มต้น.
- เพิ่ม [deployment runbook](docs/DEPLOYMENT_RUNBOOK.md) ครอบคลุม pre-deploy, migration policy, baseline ฐานข้อมูลเดิม, backup/restore rehearsal, deploy/rollback, worker activation และ operational checks.

## 2. กติกาที่ตัดสินใจ

- Production ใช้ migration แบบ forward-only และห้าม `prisma db push`, `prisma migrate dev` หรือ `--accept-data-loss`.
- ฐานข้อมูลเดิมที่ถูกสร้างจาก foundation ด้วย `db push` ต้อง backup, freeze, diff, ตรวจ count/hash/foreign key และ resolve baseline เฉพาะเมื่อ schema ตรงกับ initial migration จริง.
- การ rollback release ให้ rollback image/application และทำ corrective migration เมื่อจำเป็น; ไม่ลบ migration หรือเดา down migration กับข้อมูลราชการ.
- API ทำ migration เป็น controlled deployment step ก่อน start application; worker เปิดได้เมื่อมี schedule owner, Special contract, alerting และ UAT approval.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- baseline ฐานข้อมูลจริง, staging rehearsal, backup/restore drill, data-owner sign-off และ secret rotation.
- distributed Portal replay/session revocation, edge/shared rate limit, trusted proxy policy, log-redaction review และ vulnerability upgrade plan.
- real-data shadow run, reconciliation, schedule approval และ pilot กับผู้ใช้จริง.

## 4. Acceptance ของ checkpoint นี้

- initial migration deploy/status ผ่านกับ MySQL ชั่วคราวโดยไม่เหลือ container ตรวจค้าง.
- production Compose template parse ได้เมื่อเติมค่าจำเป็นจาก secret store และแยก worker profile/role ถูกต้อง.
- เอกสาร implementation status, architecture, migration plan และ README ชี้ไปที่ runbook เดียวกัน และระบุชัดว่า `db push` ใช้ได้เฉพาะ local disposable database.

---

# Implementation Addendum v1.19 — UAT, pilot & cutover operating plan (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกแผนปฏิบัติการหลัง foundation สำหรับรับระบบ target เข้า UAT และ rollout แบบค่อยเป็นค่อยไป. รายละเอียด checklist และ test matrix ฉบับใช้งานอยู่ที่ [UAT/Pilot/Cutover Plan](docs/UAT_PILOT_CUTOVER_PLAN.md).

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม gate G0–G5: local/CI → staging → shadow run → pilot 1 รพ.สต. → pilot 3 รพ.สต. → 10/38 รพ.สต.
- กำหนด coexistence/cutover โดยไม่บังคับหยุด Laravel/Vue หรือระบบจองรถ และกำหนดบทบาทผู้ยื่น/ผู้บันทึกผลกระดาษ/ผู้ดูแล/ผู้ตรวจให้ทดสอบแยกกัน.
- เพิ่ม test matrix ครอบคลุม environment, Portal SSO, permission, tenant isolation, People sync, Paper-first leave, SoD, Special snapshot/retry/reconciliation และ rollback.
- เพิ่ม read-only script `scripts/target-uat-smoke.sh` สำหรับตรวจ live/ready/contract/deny-by-default และตรวจ web/authenticated probe ได้เมื่อระบุ cookie file ภายนอก; script ไม่สร้างหรือแก้ข้อมูล.
- ตรวจ script กับ local target Docker แล้ว: live, ready, contract `1.3`, protected endpoint 401 และ web 200 ผ่าน.

## 2. กติกาที่ตัดสินใจ

- ผล UAT ต้องบันทึกเป็น `PASS`, `FAIL`, `BLOCKED` หรือ `WAIVED` พร้อม environment/build/ผู้ทดสอบและหลักฐานที่ไม่เปิด PII.
- ห้ามใช้บัญชีเดียวยืนยันทุกบทบาท; sample ต้องพิสูจน์ requester–paper-result-recorder separation และ cross-tenant denial.
- ก่อนขยาย wave ต้องผ่าน reconciliation อย่างน้อย 2 รอบ ไม่มี Sev-1/Sev-2 และมี backup/restore/rollback evidence.
- Word/DOCX แบบราชการที่ยังไม่มีถือเป็น `BLOCKED`; ไม่ใช้เอกสารทดลองเป็นเอกสารทางการ.
- worker และ monthly delivery เปิดหลัง schedule owner, Special contract, alerting และ UAT approval เท่านั้น.

## 3. สถานะ checkpoint

สถานะปัจจุบันคือ **พร้อมทำ G0 และเตรียม G1**. ยังไม่พร้อมทำ shadow run หรือ production cutover จนกว่าจะมี Portal/person mapping, HR Rulebook/แบบฟอร์มที่จำเป็น, real-data reconciliation, staging restore rehearsal, distributed session/replay/edge controls และ owner sign-off.

---

# Implementation Addendum v1.20 — local real-data shadow sync (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกผลการเชื่อม target local กับ API จริงของ `Special-Allowances` เพื่อทดสอบ master data โดยไม่เปลี่ยนแปลงฐานข้อมูลของระบบต้นทางและไม่เปิด production cutover.

## 1. สิ่งที่ตรวจพบจาก source จริง

- เรียก `GET /internal/api/v1/master-data/health-centers`, `employees` และ `users` จาก Special ด้วย service token สำเร็จ.
- source ส่งข้อมูล 38 หน่วยงาน, 267 บุคลากร และ 43 users.
- `healthCenter.areaKey` เป็นระดับพื้นที่สำหรับเลือกอัตรา ฉ.10/11 (`HARD_LEVEL_A`, `HARD_LEVEL_B`, `SPECIAL_LEVEL_2`) จึงซ้ำกันได้หลายหน่วยงาน ไม่ใช่รหัส unique ของ รพ.สต.
- source รุ่นปัจจุบันส่ง `employeeId: null` ใน users ทุกแถว จึงยังไม่ถือว่า Portal user ถูกจับคู่กับบุคลากรแล้ว.

## 2. การปรับ target mapping

- ยกเลิกสมมติฐานว่า `areaKey` ต้องไม่ซ้ำใน `PeopleSyncService`.
- ใช้ source `healthCenter.id` เป็น identity หลักและสร้าง `tenant.code` แบบ deterministic เป็น `SPECIAL-{sourceId}`.
- เก็บ `areaKey` แยกใน `Tenant.areaKey` เพื่อใช้อ้างอิงระดับพื้นที่และการคำนวณ.
- ยังคง upsert ด้วย source ID, ปิด membership เดิมตาม effective date และบันทึก `MasterDataSyncRun` ภายใน transaction.

## 3. ผลการทดสอบ local

- sync ครั้งแรกสำเร็จ: 38 tenants, 267 employees, 43 users; สร้าง membership 267 รายการ.
- sync ซ้ำสำเร็จโดยไม่สร้าง membership ซ้ำ: `membershipsCreated=0`, `membershipsClosed=0`.
- เปิด Next.js Dashboard ด้วย scope ของ รพ.สต.จริงหนึ่งแห่ง เห็นบุคลากรจริงตามขอบเขตหน่วยงาน และหน้า Leave เปิดฟอร์มสำหรับ dev identity ที่ผูกกับ employee ใน target local.
- automated target test ยังคงผ่าน 12 suites / 42 tests; typecheck/build ผ่าน.

## 4. ขอบเขตและข้อห้าม

- ข้อมูลจริงถูกเขียนเฉพาะ target local database เพื่อ shadow/read test; ไม่แก้ไข Laravel, Portal หรือ Special-Allowances.
- service token ใช้ผ่าน runtime environment เท่านั้น ไม่เก็บใน repository และไม่พิมพ์ลง log.
- local real-data shadow run ยังไม่ใช่ UAT, reconciliation sign-off หรือ production readiness.
- ก่อนใช้งานจริงต้องทำ Portal user → employee mapping ที่ตรวจสอบได้, data-owner reconciliation, PII/log review, backup/restore rehearsal และ pilot ตาม G0–G5.

---

# Implementation Addendum v1.21 — source-user reconciliation foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการเพิ่มชั้น reconciliation สำหรับ users ที่อ่านจาก `Special-Allowances` โดยยังไม่สร้าง Portal mapping อัตโนมัติ.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `SourceUserProjection` เพื่อเก็บ source user id, username, role, หน่วยบริการ, source employee id, active state และเวลาที่พบล่าสุดแบบ idempotent.
- sync จะตรวจ duplicate/source reference ของ users และ soft-inactivate source users ที่หายจาก snapshot โดยไม่ลบ audit หรือ mapping เดิม.
- เพิ่ม `GET /api/v1/people/identity-mappings/portal` สำหรับผู้มี capability `employee.identity-mapping.manage` เพื่อดู aggregate และรายการ source users/Portal mappings สำหรับ reconciliation.
- คงการจับคู่ Portal แบบ explicit ผ่าน `POST /api/v1/people/identity-mappings/portal`; ระบบไม่เดา username/source user id เป็น Portal subject และบันทึก audit เมื่อ map.
- เพิ่ม forward migration แยก `20260829230000_source_user_projection`; ไม่แก้ไข initial migration ที่อาจถูก deploy แล้ว.

## 2. สิ่งที่ยังต้องทำต่อ

- ต้องได้รับรายชื่อ/subject จาก Portal ที่เจ้าของข้อมูลรับรอง แล้วทำ mapping กับ employee เป็นรายบัญชี.
- ต้องทำ reconciliation UI และรายงานผลตรวจรับกับ data owner; endpoint รุ่นนี้เป็น API foundation.
- ต้องทดสอบ mapping ด้วยบัญชี Portal จริง, delegated approver และ cross-tenant scope ใน staging.

## 3. Acceptance ของ checkpoint นี้

- target typecheck/build ผ่าน และ test เพิ่มเป็น 13 suites / 44 tests.
- local source-user projection/report รองรับข้อมูลจริงจาก Special โดยไม่เขียนฐานข้อมูลต้นทาง.
- สถานะยังเป็น local/integration foundation ไม่ใช่ Portal mapping sign-off หรือ production readiness.

---

# Implementation Addendum v1.22 — permission scopes & delegated approver foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการเพิ่ม permission scope matrix รุ่นแรกและ configuration สำหรับ delegated paper-result/void actor.

## 1. สิ่งที่ลงมือทำแล้ว

- กำหนด scope operation กลางเป็น `self`, `tenant` และ `affiliation`; ใบลาของ requester ถูกจำกัดที่ employee ของตนเอง ส่วน manager/recorder จำกัดที่ tenant และงาน integration/admin จำกัดที่ affiliation.
- เพิ่ม `DelegatedApproverAssignment` แบบ effective-dated ระบุ Portal subject, capability, workspace และ audit; รองรับ `leave.paper-decision.record` กับ `leave.request.void`.
- เพิ่ม API list/create/revoke ภายใต้ `authorization.delegated-approver.manage`; การสร้างต้องมี active Portal identity mapping, workspace ที่ผู้ดูแลเข้าถึงได้ และช่วงเวลาที่ไม่ทับซ้อน.
- delegated actor ที่ไม่มี direct capability จะทำ paper result/void ได้เฉพาะเมื่อมี assignment active ครอบคลุม tenant; direct capability เดิมยังใช้ได้เพื่อ backward compatibility.
- requester ไม่สามารถบันทึกผลกระดาษหรือ void ใบลาของตนเอง และ tenant scope ไม่ขยายไปยัง affiliation โดยอัตโนมัติสำหรับ requester.

## 2. สิ่งที่ยังต้องทำต่อ

- ต้องรับรอง matrix ราย role/position/workspace กับเจ้าของระบบ และทดสอบบัญชี Portal จริงทุกบทบาท.
- ต้องทำ delegated approver UI, notification/expiry monitoring และ policy สำหรับการเปลี่ยนแปลงสิทธิ์จาก Portal.
- ต้องทำ distributed session/revocation และ edge rate limit ก่อน scale-out หลาย replica.

## 3. Acceptance ของ checkpoint นี้

- target tests ผ่าน 14 suites / 48 tests, typecheck/build ผ่าน.
- local API smoke ผ่านสำหรับ delegated-approver endpoint และ source-user reconciliation โดยไม่สร้าง assignment หรือเปลี่ยนข้อมูลต้นทาง.
- สถานะยังเป็น local/integration foundation ไม่ใช่ permission sign-off หรือ production readiness.

---

# Implementation Addendum v1.23 — Versioned Leave Rulebook foundation (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกโครงสร้างกฎวันลารุ่นแรกที่เพิ่มใน NestJS API โดยยังไม่อ้างว่าเป็นกฎสิทธิ์ราชการฉบับสมบูรณ์. เนื่องจากแบบฟอร์มและรายละเอียดกฎจริงจากฝ่ายบุคคลยังไม่ครบ ระบบจึงเก็บกฎแบบ versioned/effective-dated เพื่อให้ตรวจสอบและเปลี่ยน version ได้ภายหลัง โดยไม่ฝังกฎเฉพาะหน่วยงานเพิ่มลงใน code.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `LeavePolicyProfile` ที่มี affiliation, code/version, employee type scope, legal basis, effective period, status (`DRAFT`, `PUBLISHED`, `RETIRED`) และข้อมูลผู้รับรอง/เวลารับรอง.
- เพิ่ม `LeavePolicyRule` ต่อประเภทการลา รองรับ counting mode, half-day flag, entitlement, carry-over และ supporting-document flag โดยใช้ Decimal สำหรับจำนวนวัน.
- เพิ่ม API สำหรับผู้มีสิทธิ์ระดับ affiliation: `GET /api/v1/leave/policies`, `POST /api/v1/leave/policies` และ `POST /api/v1/leave/policies/:id/publish`.
- การสร้าง profile กับ rules ทำใน transaction เดียวและสร้าง audit event; ตรวจ effective date, active leave type และ duplicate leave type ก่อนบันทึก.
- การ publish ต้องมี legal basis และ approval reference, ไม่อนุญาตช่วง effective date ทับกับ published profile ของ employee type scope เดียวกัน และไม่แก้ไข profile ที่ publish แล้วโดยตรง.
- การคำนวณวันลาจะเลือกเฉพาะ published profile ที่ครอบคลุมช่วงวันลาทั้งช่วง โดยเลือก employee type ที่ตรงก่อน `ALL`; หากไม่มี profile ให้ใช้ provisional rule ได้เฉพาะ local/dev ที่เปิด `ONEDATA_ALLOW_PROVISIONAL_LEAVE_RULES`.
- production compose ตั้งค่า provisional rule เป็น `false` และ environment validation ปฏิเสธการเปิดค่าดังกล่าวใน production.

## 2. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ยังต้องให้ฝ่ายบุคคลรับรองรายการประเภทลา, legal basis, สิทธิ์รายประเภทบุคลากร, entitlement/carry-over และ effective period จริง.
- ยังไม่มี quota/balance ledger, การคืนโควตา, half-day/ช่วงเวลา, วันหยุดที่รับรองแล้ว หรือ correction ของ period ที่ถูก lock.
- ยังไม่มีหน้าจอจัดการ Rulebook และ approval workflow สำหรับเจ้าของนโยบาย; API รุ่นนี้เป็น foundation สำหรับ integration/UAT.
- ต้องเพิ่ม policy version selection และ migration test เมื่อมีข้อมูล rulebook จริง และต้องทดสอบผลคำนวณเทียบกับตัวอย่างที่ฝ่ายบุคคลรับรอง.

## 3. Acceptance ของ checkpoint นี้

- target typecheck ผ่าน และ API test ผ่าน 15 suites / 52 tests.
- มี unit test ยืนยัน draft ไม่ถูกนำไปใช้, publish ต้องมี approval/audit, published rulebook มี precedence เหนือ provisional rule และ production ปฏิเสธการคำนวณเมื่อไม่มี published rulebook.
- ยังเป็น local development foundation; ไม่ได้สร้างหรือส่งข้อมูลจริงไป Special-Allowances และไม่เปลี่ยนข้อมูลต้นทาง.

---

# Implementation Addendum v1.24 — Snapshot reconciliation & schedule control (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการเพิ่ม control ระหว่าง One Data กับ Special-Allowances หลังจากมี snapshot adapter/worker รุ่นแรก. เป้าหมายคือให้ผู้ดูแลเห็นว่าข้อมูลที่เตรียมกับ acknowledgement จาก Special ตรงกันหรือไม่ และไม่เปิดการส่งอัตโนมัติโดยไม่มีการอนุมัติ schedule.

## 1. สิ่งที่ลงมือทำแล้ว

- snapshot prepare ส่ง employee rows ครบ scope ของ affiliation ที่มี verified Special employee mapping; บุคลากรที่ไม่มีใบลาในงวดจะมี `leave_entries: []` เพื่อรองรับ complete-reset semantics และเทียบจำนวนกับ Special ได้.
- batch summary เพิ่ม reconciliation ที่เทียบ period, snapshot version, จำนวน employee rows และจำนวน leave entries กับ acknowledgement ล่าสุดของ Special. สถานะคือ `NOT_SENT`, `PENDING`, `MATCHED`, `MISMATCH` หรือ `BLOCKED`.
- ไม่เขียนทับ source counts ของ batch หลัง delivery; local prepared counts อยู่แยกเชิงความหมาย และ upstream processed counts อ่านจาก delivery response เพื่อป้องกัน false reconciliation.
- เพิ่ม `GET /api/v1/integrations/special/leave-snapshots` และหน้า Next.js `/leave/snapshots` สำหรับตรวจ batch, mismatch, hash prefix, delivery status และผลตอบรับโดยไม่แสดง payload เต็ม.
- เพิ่ม `LeaveSnapshotSchedule` แบบ affiliation-scoped รองรับ `DRAFT → APPROVED → PAUSED`, cutoff days, contract version และ audit; มี API/UI สำหรับสร้าง draft, approve และ pause.
- worker monthly จะทำงานต่อเมื่อเปิด worker/monthly flags, มี schedule `APPROVED`, contract version ตรงกับ configuration และถึง cutoff; ไม่มี approved schedule จะไม่ส่งข้อมูล.
- เพิ่ม permission `leave.snapshot.schedule.manage` แยกจากสิทธิ์ดูแล batch และขยับ shared target API contract เป็น v1.4 เพื่อรองรับ summary/schedule types.

## 2. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- Special source รุ่นปัจจุบันยังไม่ส่ง `source_hash` กลับ และยังไม่มี read-through endpoint สำหรับ period/result/report; reconciliation จึงตรวจได้เฉพาะ acknowledgement ที่มีอยู่.
- ยังต้องทำ locked-period adjustment/correction contract, alerting, schedule owner sign-off และ policy ป้องกันการส่งซ้ำระหว่างระบบเดิมกับ target ในช่วง cutover.
- ยังไม่เปิด monthly worker หรือ real-data leave snapshot delivery; local test ที่ทำกับข้อมูลจริงยังเป็น master-data shadow เท่านั้น.
- ต้องทำ staging/restore rehearsal, UAT กับ Portal accounts จริง และยืนยันจำนวน employee rows เทียบ Special ก่อนอนุมัติ schedule production.

## 3. Acceptance ของ checkpoint นี้

- target typecheck ผ่าน และ API test ผ่าน 16 suites / 59 tests.
- production Compose template parse ผ่านโดยกำหนด schedule approval เป็น gate ใน worker code; target local API/web ยัง health check ผ่าน.
- สถานะยังเป็น local/integration foundation ไม่ใช่ approval ให้ส่งข้อมูลใบลาจริงหรือเปิด scheduled delivery.

---

# Implementation Addendum v1.25 — Durable auth/session hardening (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการปิดช่องว่างด้าน authentication/session ที่ต้องมีเมื่อ target API ทำงานมากกว่าหนึ่ง instance. งานนี้ยังไม่ถือเป็น production security sign-off เพราะ edge/shared rate limit และการทดสอบกับ reverse proxy จริงยังอยู่นอก repository นี้.

## 1. สิ่งที่ลงมือทำแล้ว

- เปลี่ยน Portal launch-token replay guard ของ production เป็น `PrismaReplayGuard` ที่เก็บ `jti` ใน `PortalLaunchReplay` และใช้ unique key เป็น atomic gate ข้าม API replica; `InMemoryReplayGuard` เหลือไว้สำหรับ isolated unit test เท่านั้น.
- เพิ่ม forward migration `20260830030000_auth_session_hardening` และ metadata `AuthSession.revokedReason`; session revoke ที่เกิดจาก logout, idle timeout, identity invalidation และ rotation ถูกบันทึกด้วย audit event โดยไม่เก็บ token ดิบ.
- เพิ่ม `POST /api/v1/auth/rotate` เพื่อหมุน opaque session แบบ atomic, revoke session เดิม และคง absolute expiry เดิมไม่ให้ต่ออายุแบบไม่มีที่สิ้นสุด.
- เพิ่ม `AuthMaintenanceService` ให้ restricted worker/`worker:once` ลบ session ที่หมดอายุ/ถูก revoke เกิน retention และ replay `jti` ที่หมดอายุ; retention กำหนดด้วย `ONEDATA_AUTH_RETENTION_SECONDS`.
- เพิ่ม trusted-proxy parser และบังคับ production ให้ตั้ง `ONEDATA_TRUST_PROXY` เป็นรายการ IP/CIDR ที่ชัดเจน เพื่อให้ `request.ip` และ rate-limit key ไม่เชื่อ `X-Forwarded-For` จาก client โดยพลการ.
- ปรับ production Compose/runbook/UAT ให้ตรวจ migration, durable replay, rotation, cleanup และ proxy policy; per-process limiter ยังเป็นเพียง defense-in-depth และต้องมี edge/shared limiter ที่ gateway/WAF.

## 2. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ยังต้องตั้งและทดสอบ rate limit แบบ shared ที่ reverse proxy/WAF/API gateway รวมถึง network policy ที่ไม่เปิด API ตรงข้าม proxy.
- ยังต้องทำ Portal push/revocation propagation เมื่อ role, membership หรือ account status เปลี่ยน และทดสอบ session listing/revoke รายอุปกรณ์ตาม operational policy หากต้องการความสามารถดังกล่าว.
- ยังต้องทำ staging/production-like rehearsal สำหรับ trusted proxy chain, cookie/CSRF ผ่าน proxy, rotation race, cleanup schedule และ secret rotation.
- ยังต้องทำ vulnerability upgrade plan, log-redaction review และ owner sign-off ก่อนเปิดหลาย replica/production.

## 3. Acceptance ของ checkpoint นี้

- target typecheck ผ่าน และ API test ผ่าน 18 suites / 65 tests.
- target build และ local Docker API/web health ผ่าน; local configuration ใช้ in-memory/permissive values ได้เฉพาะ development ส่วน production template บังคับ trusted-proxy allowlist.
- สถานะยังเป็น security/integration foundation ไม่ใช่ production approval.

---

# Implementation Addendum v1.26 — Migration, backup/restore & observability tooling (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกเครื่องมือปฏิบัติการสำหรับตรวจ schema/migration, สำรองและตรวจคืนค่าฐานข้อมูล และดู aggregate health metrics โดยออกแบบให้ไม่พิมพ์ secret, cookie, token หรือข้อมูลบุคคลลง output ทั่วไป.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `scripts/target-schema-check.sh` สำหรับตรวจ `prisma migrate status` และ schema drift ด้วย `prisma migrate diff`; production จะ fail หาก migration status ไม่สะอาด ส่วน local `db push` อนุโลมได้เฉพาะเมื่อระบุ `ONEDATA_SCHEMA_CHECK_ALLOW_UNAPPLIED=true` อย่างชัดเจน.
- เพิ่ม `scripts/target-backup.sh` สำหรับ `mysqldump` แบบ transaction-consistent พร้อม `--no-tablespaces`, ไฟล์สิทธิ์จำกัด และ sidecar SHA-256 โดยไม่ overwrite ไฟล์ backup เดิม.
- เพิ่ม `scripts/target-restore-verify.sh` ที่ตรวจ checksum และ restore ได้เฉพาะ database ชื่อ `onedata_restore_<name>` พร้อม explicit confirmation; ไม่ drop database ที่ restore แล้ว และรายงานเพียง table/audit aggregate count.
- เพิ่ม `OperationalMetricsService`, response middleware และ `GET /api/health/metrics` ซึ่งเก็บเฉพาะ uptime, request total และ response status class; ไม่มี path, IP, identity, cookie, token หรือ payload.
- เพิ่ม root npm commands `target:schema:check`, `target:backup` และ `target:restore:verify` รวมถึง production runbook/UAT acceptance สำหรับเครื่องมือดังกล่าว.

## 2. ผลการตรวจสอบ checkpoint นี้

- shell syntax ของ scripts ผ่าน.
- schema check กับ local disposable MySQL ผ่านเมื่อเปิด `ONEDATA_SCHEMA_CHECK_ALLOW_UNAPPLIED=true` และรายงานชัดเจนว่า migration ยังไม่ถูก apply เพราะ local Compose ใช้ `db push`.
- backup จริงจาก MySQL local ผ่านหลังเพิ่ม `--no-tablespaces`; restore verification ลงฐาน `onedata_restore_<run-id>` ผ่านและตรวจพบ table/audit aggregate ก่อนล้างฐานทดสอบที่สร้างขึ้น.
- target test ผ่าน 19 suites / 67 tests และ typecheck/build ของ API/Web ผ่าน.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ยังต้องทำ backup/restore rehearsal บน staging หรือ production-like infrastructure ตาม retention/encryption/off-site policy และให้ data owner อนุมัติ baseline.
- ยังต้องเชื่อม metrics ไป monitoring/alerting กลาง, กำหนด SLO/threshold และตรวจ edge/gateway metrics; endpoint นี้เป็น per-process aggregate foundation เท่านั้น.
- ยังต้องทำ migration dry run กับฐานเดิมจริง, schema baseline approval, secret rotation และ rollback rehearsal ก่อน production cutover.

## 4. Acceptance ของ checkpoint นี้

- target build/typecheck/test ผ่าน, production Compose parse ผ่าน และ local Docker API/Web health ผ่าน.
- เครื่องมือ backup/restore ไม่ลบหรือ overwrite ข้อมูล production โดยอัตโนมัติ; restore tool บังคับชื่อฐานใหม่และ confirmation.
- สถานะยังเป็น migration/operations foundation ไม่ใช่ production approval.

---

# Implementation Addendum v1.27 — UAT evidence & release readiness (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกงานปิดรอบ foundation สำหรับการตรวจ G0 และเตรียม G1 โดยแยก “หลักฐานว่า target local ทำงาน” ออกจาก “การอนุมัติใช้ข้อมูลจริง/production”.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `scripts/target-uat-evidence.sh` และคำสั่ง `npm run target:uat:evidence` สำหรับ probe liveness, readiness, contract, aggregate metrics, auth boundary, security headers, web health และเรียก UAT smoke ชุดเดียวกัน.
- Evidence script บังคับ `ONEDATA_UAT_EVIDENCE_DIR` เป็น absolute non-root directory, ไม่ overwrite artifact เดิม และสร้าง JSON/Markdown ที่มีเฉพาะ HTTP status, contract/metrics shape, expected-vs-actual status และ exit code.
- ไม่เก็บ response payload, cookie, token, identity, IP หรือข้อมูลบุคคลใน artifact. Response ที่ใช้ตรวจถูกเก็บไว้เฉพาะ temporary directory ระหว่าง process และถูกล้างเมื่อจบ.
- `target-uat-smoke.sh` รองรับ `ONEDATA_UAT_EXPECT_ME_STATUS`; ค่าเริ่มต้นยังเป็น `401` เพื่อยืนยัน deny-by-default. Local development ที่เปิด dev auth สามารถตั้ง `200` ได้เฉพาะเมื่อระบุเป็น override ในหลักฐาน.
- เพิ่ม [Release Readiness](docs/RELEASE_READINESS.md) เป็น checkpoint เดียวสำหรับสถานะ G0–G5, production blockers และลำดับงานถัดไป.

## 2. ผลการตรวจสอบ checkpoint นี้

- shell syntax และ `git diff --check` ผ่าน.
- local Docker API/Web evidence ผ่าน: liveness/readiness/contract/metrics/auth probe/web dashboard/security headers และ smoke ทุกจุดผ่าน โดยใช้ dev-auth override `expected HTTP 200` ตามสภาพ local.
- artifact ที่สร้างทดสอบตรวจได้เฉพาะ aggregate/status และ policy flags ว่าไม่เก็บ payload/cookie/token/PII; ไม่ commit artifact ที่อาจผูกกับ environment ลง repository.
- สถานะรวมคือ **พร้อม G0 และเตรียม G1**; ยังไม่ใช่ production approval, real-data pilot หรืออนุมัติเปิด monthly delivery.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ต้องสร้าง staging และทดสอบด้วย auth deny-by-default (`/api/v1/me` ต้องได้ `401` เมื่อไม่มี session), SSO test double, proxy/CSRF/cookie, shared edge rate limit และ alerting จริง.
- ต้องทำ restore/migration rehearsal บน production-like infrastructure, baseline ฐานข้อมูลเดิม, secret rotation และ rollback rehearsal.
- ต้องจับคู่ Portal user → employee/workspace และทำ People/Leave/Special reconciliation กับข้อมูลจริงโดยมี data owner/HR sign-off.
- ต้องรับรอง HR Rulebook/แบบฟอร์มและทดสอบ locked-period/reconciliation/duplicate/negative paths ของ Special ก่อนเปิด pilot.

## 4. Acceptance ของ checkpoint นี้

- มีเครื่องมือสร้างหลักฐาน UAT ที่ตรวจซ้ำได้และลดความเสี่ยงการนำข้อมูลลับ/PII ไปอยู่ใน artifact.
- local G0 evidence และ regression baseline ผ่านตาม [Release Readiness](docs/RELEASE_READINESS.md).
- G1–G5 ยังคง `BLOCKED` จนกว่าจะมีหลักฐานและผู้อนุมัติตาม [UAT/Pilot/Cutover Plan](docs/UAT_PILOT_CUTOVER_PLAN.md).

---

# Implementation Addendum v1.28 — Staging configuration & G1 preflight (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการเตรียม environment สำหรับ G1 ให้มี guard ใกล้ production โดยไม่ใช้ฐานข้อมูลหรือ secret ของ production และไม่เปิด worker/monthly delivery ก่อนการอนุมัติ.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `docker-compose.target.staging.yml` เป็น overlay ของ production Compose; API ใช้ `NODE_ENV=staging`, Web ใช้ production runtime semantics และบังคับปิด dev-auth, provisional leave rules, worker และ monthly snapshot.
- เปลี่ยน environment validation ให้ `staging` ใช้ security guard ชุดเดียวกับ production ได้แก่ required database/Portal/CORS/trusted-proxy, secret length, secure cookie, CSRF/proxy policy และห้าม dev-auth/provisional rules.
- เพิ่ม `.env.target.staging.example` ที่มีเฉพาะ placeholder และกำหนดให้ไฟล์ secret จริงอยู่นอก repository.
- เพิ่ม `scripts/target-staging-preflight.sh` และ `npm run target:staging:preflight` สำหรับ resolve Compose production + staging overlay, ตรวจ image/tag, HTTPS, CORS, security flags, metrics, worker gate และ external `webproxy` โดยไม่แสดงค่าการตั้งค่าหรือ secret.
- `ONEDATA_STAGING_REQUIRE_WEBPROXY=false` ใช้ได้เฉพาะการตรวจ config ในเครื่องที่ไม่มี network จริง; staging จริงต้องใช้ค่าเริ่มต้น `true` และต้องมี external `webproxy` จาก shared-infra.

## 2. ผลการตรวจสอบ checkpoint นี้

- target test ผ่าน 19 suites / 69 tests และ typecheck ผ่าน.
- staging Compose/preflight resolve ผ่านด้วย image/URL/secret จำลองที่ไม่ใช่ credential จริง โดยตั้ง `ONEDATA_STAGING_REQUIRE_WEBPROXY=false` เฉพาะ local config test.
- เมื่อบังคับตรวจ network จริงใน local ที่ยังไม่มี `webproxy`, preflight หยุดด้วยผลล้มเหลวตามที่ออกแบบไว้ ไม่สร้าง network หรือ deploy ให้เอง.
- `git diff --check` และ shell syntax ผ่าน; ไม่มี secret จริงหรือ env file ที่มี credential ถูกเพิ่มใน repository.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ยังไม่ได้ deploy staging จริง, ทำ restore/migration rehearsal หรือเชื่อม reverse proxy/WAF ของ shared-infra.
- ยังต้องทำ SSO test double/negative auth, Special contract negative tests, shared edge rate limit และ monitoring/alerting ใน G1.
- worker และ monthly snapshot ยังคงปิดจนกว่าจะมี schedule/owner/UAT approval.

## 4. Acceptance ของ checkpoint นี้

- มี staging configuration ที่แยกจาก local และ fail-closed ด้าน security ก่อน API เริ่มรับ traffic.
- มี preflight ที่ตรวจ resolved configuration โดยไม่เปิดเผย secret และหยุดเมื่อ dependency สำคัญ เช่น `webproxy` ยังไม่พร้อม.
- G1 ยังเป็น `BLOCKED` จนกว่าจะ deploy และทดสอบบน staging ตาม [Release Readiness](docs/RELEASE_READINESS.md).

---

# Implementation Addendum v1.29 — SSO test double & negative authentication (29 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการเพิ่มเครื่องมือทดสอบ Portal SSO ใน G1 โดยจำลองเฉพาะการออก HS256 launch token ด้วย secret ของ test environment และไม่เรียกใช้ credential ของ Portal จริง.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `scripts/target-sso-test-double.mjs` ซึ่ง bind เฉพาะ `127.0.0.1` และออก token สำหรับ valid, expired, wrong issuer, wrong audience, invalid signature, future-issued และ replay scenarios.
- เพิ่ม `scripts/target-sso-negative.sh` และ `npm run target:sso:negative` สำหรับทดสอบกับ API ที่ deploy แล้ว: valid exchange, session `/me`, session rotation, old-session invalidation, logout invalidation และ negative token status.
- Runner ตรวจว่า valid exchange ไม่ echo launch token, session cookie ถูกตั้งตาม policy และ replay token ใช้ได้ครั้งเดียว; temporary cookie/request/response files ถูกล้างเมื่อจบและไม่แสดงค่าใน output.
- กำหนด auth POST status code เป็น `200 OK` อย่างชัดเจนสำหรับ portal exchange, logout และ rotation เพื่อให้ contract ไม่พึ่ง default `201` ของ NestJS.

## 2. ผลการตรวจสอบ checkpoint นี้

- local end-to-end SSO suite ผ่าน: test double พร้อม, valid exchange `200`, `/me` `200`, rotation ทำให้ session เดิม `401` และ session ใหม่ `200`, logout ทำให้ `/me` `401`, negative scenarios ทั้งหมด `401`, durable replay ครั้งแรก `200`/ครั้งที่สอง `401`.
- ใช้เฉพาะ secret จำลองและ seed identity `dev-user`; ไม่ใช้ Portal credential จริง และไม่มี token/cookie ใน output หรือ repository.
- target test ยังคงผ่าน 19 suites / 69 tests และ shell/Node syntax checks ผ่าน.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ต้องรัน suite เดียวกันบน staging ผ่าน reverse proxy ด้วย Portal SSO test double ที่ owner อนุมัติ และตรวจ secure cookie/CSRF/trusted proxy จริง.
- ต้องทดสอบ Portal revocation/membership change propagation และ session cleanup/rotation race ใน staging.
- SSO test double ไม่ใช่ Portal identity acceptance; G1/G2 ยังต้องมี Portal account mapping และ data-owner sign-off.

## 4. Acceptance ของ checkpoint นี้

- มี repeatable SSO negative suite ที่ตรวจทั้ง token boundary และ session lifecycle โดยไม่เปิดเผย secret.
- local authentication integration foundation ผ่านตาม [Release Readiness](docs/RELEASE_READINESS.md).
- G1 ยังคง `BLOCKED` จนกว่าจะทดสอบกับ staging/proxy และ Portal integration จริงตาม [UAT/Pilot/Cutover Plan](docs/UAT_PILOT_CUTOVER_PLAN.md).

---

# Implementation Addendum v1.30 — Special snapshot contract negative checks (30 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการ harden boundary ระหว่าง One Data กับ Special-Allowances สำหรับการส่ง leave snapshot โดยแยก “response ที่ไม่ตรง contract” ออกจาก “ความล้มเหลวชั่วคราวที่ retry ได้” และไม่ทำ mutation กับ upstream ใน automated test.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม strict response validation ใน `SpecialLeaveSnapshotClient`: status/period/periodId ต้องถูกต้อง, snapshot version ต้องเป็นจำนวนเต็มตั้งแต่ 1 และจำนวน employee/leave entry ต้องเป็นจำนวนเต็มไม่ติดลบ; response สำเร็จที่ผิดรูปแบบจะถูกหยุดเป็น `502`.
- เพิ่ม focused command `npm run target:special:contract` สำหรับรัน client/service contract suite โดย build shared contract และ generate Prisma client ก่อนทดสอบ.
- เพิ่ม negative matrix สำหรับ HTTP `408/429/5xx` ที่ retry ได้, `4xx` ด้าน validation/auth/locked-period ที่ไม่ retry, network/timeout ที่ไม่เปิดเผยรายละเอียด transport และ credential ที่หายไป.
- เพิ่ม orchestration guard เมื่อ Special ตอบ acknowledgement ที่มี period หรือ snapshot version ไม่ตรงกับ batch; One Data บันทึก delivery เป็น `FAILED`/non-retryable และไม่ถือว่าส่งสำเร็จ.
- ปรับ README, deployment runbook, UAT matrix และ release readiness ให้แยก local/CI contract evidence ออกจากการทดสอบกับ Special staging จริง.

## 2. ผลการตรวจสอบ checkpoint นี้

- focused Special adapter/service suite ผ่าน 2 suites / 32 tests.
- full target regression baseline ต้องผ่าน 19 suites / 92 tests พร้อม typecheck/build ก่อน merge.
- ไม่มีการเรียก endpoint จริงหรือส่ง snapshot ไปยัง Special จากชุด negative tests; การทดสอบ staging จริงต้องใช้ period/test credential ที่ owner อนุมัติและต้องไม่ใช้ period production.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- ยังต้อง deploy target บน staging ผ่าน reverse proxy และรัน request matrix กับ Special staging จริง รวม locked-period, idempotency/duplicate, complete snapshot และ reconciliation/read-through.
- ยังต้องยืนยัน contract version กับ source owner และทดสอบ service token rotation, timeout budget และ alert เมื่อ delivery เป็น `FAILED`/`RETRYABLE_FAILURE`.
- local/CI negative suite ไม่แทนการทดสอบ period จริง, ข้อมูลจริง, Portal mapping, HR Rulebook หรือ owner sign-off.

## 4. Acceptance ของ checkpoint นี้

- adapter ไม่ยอมรับ response ที่ผิดรูปแบบหรือ acknowledgement ข้าม period/version แบบเงียบ ๆ.
- retry policy แยก transient HTTP/network failure ออกจาก validation/locked-period failure และบันทึกสถานะ delivery/audit ตามผล.
- G1 ยังคง `BLOCKED` จนกว่าจะมี Special staging evidence, proxy/edge checks, restore rehearsal และ alerting ตาม [Release Readiness](docs/RELEASE_READINESS.md).

---

# Implementation Addendum v1.31 — Edge gateway & observability gate (30 สิงหาคม 2569)

ภาคผนวกนี้บันทึกการปิดช่องว่างด้าน reverse proxy, shared rate limit และหลักฐาน observability ระหว่างเตรียม G1 โดยไม่อ้างว่า local per-process limiter เป็น distributed security control.

## 1. สิ่งที่ลงมือทำแล้ว

- เพิ่ม `scripts/target-edge-observability-check.sh` และคำสั่ง `npm run target:edge:check` สำหรับตรวจ public edge response: HTTPS, HSTS, `X-Request-ID`, CORS, aggregate metrics privacy และ `X-RateLimit-Policy: shared` ที่ต้องมาจาก gateway/proxy.
- เพิ่ม optional 429 probe ที่จำกัดอยู่เฉพาะ `POST /api/v1/auth/portal/exchange` โดยส่ง `{}` ไม่มี token และต้องเห็น `429` พร้อม `Retry-After` เมื่อผู้ดูแลกำหนดจำนวน probe ใน staging maintenance window.
- ขยาย staging preflight ให้ resolve worker profile, ตรวจว่า API/Web/worker ไม่ publish host port และ API/Web/worker ต่อ external `webproxy`; ยังคงตรวจ configuration โดยไม่พิมพ์ secret.
- ปรับ `SecurityHeadersMiddleware` ให้ staging ได้ HSTS เช่นเดียวกับ production และปรับ environment validation ให้ staging/production API ต้องเปิด CSRF, required origin, per-process rate limit และ aggregate metrics.
- ขยาย UAT evidence ให้ตรวจ request ID และไม่ยอมรับ metrics ที่มี path/IP/identity/cookie/token/password/payload; เพิ่ม [Edge Gateway & Observability Gate](docs/EDGE_GATEWAY_OBSERVABILITY.md) เป็นสัญญาปฏิบัติการสำหรับ Nginx Proxy Manager/shared-infra.

## 2. ผลการตรวจสอบ checkpoint นี้

- target test ผ่าน 19 suites / 94 tests; target typecheck และ target build ผ่าน.
- staging preflight ผ่านด้วย image/URL/secret จำลองและ `ONEDATA_STAGING_REQUIRE_WEBPROXY=false`; เมื่อไม่มี external `webproxy` จะ fail ตามที่ออกแบบไว้.
- local public edge probe ผ่านเมื่อผ่อน `ONEDATA_EDGE_REQUIRE_HTTPS=false`, `ONEDATA_EDGE_REQUIRE_HSTS=false` และ `ONEDATA_EDGE_REQUIRE_SHARED_RATE_LIMIT=false`; probe แบบบังคับ shared marker หยุดด้วย failure เพราะ local ไม่ใช่ gateway.
- local UAT evidence ผ่าน พร้อม request-ID check และ aggregate-only policy. ไม่มีการแก้ config ของ Nginx Proxy Manager และไม่มี secret/PII ใน artifact หรือ repository.

## 3. สิ่งที่ยังไม่เสร็จและห้ามตีความว่า production-ready

- `shared-infra`/Nginx Proxy Manager ยังต้องตั้งค่าและตรวจรับ shared rate-limit policy, marker header, 429/Retry-After behavior, TLS/redirect และ access restriction ของ admin/metrics ตาม change owner; repository นี้ตรวจได้แต่ไม่แก้ค่าให้เอง.
- ยังต้องทดสอบ public edge gate ผ่าน staging จริงด้วยหลาย API replica เพื่อพิสูจน์ shared behavior, รวม monitoring sink, alert threshold และ alert delivery.
- ยังต้องทำ restore rehearsal, Portal/Special staging contract, real mapping, HR Rulebook และ owner sign-off ก่อน G1/G2.

## 4. Acceptance ของ checkpoint นี้

- staging preflight จะไม่ผ่านหากปิด control สำคัญหรือเปิด host port ผิด boundary ก่อน deploy target.
- public probe แยกสิ่งที่แอปตรวจเองออกจากสิ่งที่ gateway ต้องพิสูจน์ และไม่ปลอมหลักฐาน shared rate limit จากภายในแอป.
- G1 ยังคง `BLOCKED` จนกว่าจะมีหลักฐานจาก reverse proxy/WAF และ monitoring จริงตาม [Release Readiness](docs/RELEASE_READINESS.md).
