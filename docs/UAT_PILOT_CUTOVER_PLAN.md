# One Data — UAT, Pilot และ Cutover Plan

เอกสารนี้เป็นแผนรับระบบ target NestJS/Next.js เข้า UAT และเปิดใช้งานแบบค่อยเป็นค่อยไป โดยไม่บังคับให้ระบบ Laravel/Vue เดิมหรือระบบจองรถหยุดทำงานก่อนเวลา

สถานะของเอกสาร: แผนปฏิบัติการสำหรับเตรียม UAT — ยังไม่ใช่ production approval

## 1. หลักการเปิดใช้งาน

- เริ่มจาก One Data รุ่น People + Leave + Special snapshot เท่านั้น โมดูลรถและโมดูลอื่นยังคงแยกใช้งานได้
- เปิดระบบแบบ coexistence: ผู้ใช้กลุ่ม pilot ใช้ target ตามขอบเขตที่ประกาศ ส่วนผู้ใช้ที่ยังไม่เข้า pilot ใช้ระบบเดิมต่อไป
- ไม่ย้ายข้อมูลด้วยการเขียนฐานข้อมูลข้ามระบบ การย้ายใช้ API, reviewed import หรือ snapshot ที่ตรวจสอบย้อนกลับได้เท่านั้น
- One Data เป็นเจ้าของรายการใบลาและสถานะเอกสารกระดาษ; Special-Allowances เป็นเจ้าของสูตร ฉ.10/11, period, ผลคำนวณ และรายงาน
- ทุก wave ต้องมี rollback ที่หยุด worker/ปิด write path/คืนผู้ใช้ไปยังระบบเดิมได้ โดยไม่ลบ audit หรือเดา down migration

## 2. ลำดับ environment และ pilot

| Gate | ขอบเขต | ข้อมูล | ผู้อนุมัติ | เกณฑ์ผ่าน |
| --- | --- | --- | --- | --- |
| G0 | Local/CI | synthetic | ผู้พัฒนา | test, typecheck, build, migration check และ smoke script ผ่าน |
| G1 | Staging | synthetic หรือ de-identified | ผู้พัฒนา + IT | deploy/restore rehearsal, SSO test double, Special contract test และ negative security test ผ่าน |
| G2 | Shadow run | ข้อมูลจริงเท่าที่ได้รับอนุญาต แบบไม่เปิด write ให้ผู้ใช้ | เจ้าของข้อมูล + HR + IT | People reconciliation และ leave snapshot เทียบระบบเดิมโดยไม่มี mismatch ที่อธิบายไม่ได้ |
| G3 | Pilot wave 1 | 1 รพ.สต. ที่มีผู้รับผิดชอบครบ | ผู้บริหาร/เจ้าของกระบวนงาน | ใช้งานใบลาจริงตาม paper-first process อย่างน้อย 1 รอบ และ Special snapshot ผ่าน |
| G4 | Pilot wave 2 | 3 รพ.สต. ต่างรูปแบบ | เจ้าของระบบ | ไม่มี Sev-1/Sev-2 ค้าง, reconciliation ผ่าน 2 รอบ และผู้ใช้ยืนยันขั้นตอน |
| G5 | Rollout | 10 แล้วจึง 38 รพ.สต. | Change owner | exit criteria ของ wave ก่อนหน้าผ่านและมี support/rollback window |

ห้ามข้าม G1 หรือเปิด worker/monthly delivery ใน production เพียงเพราะ local test ผ่าน

## 3. บทบาทสำหรับการทดสอบ

ต้องเตรียมบัญชี Portal ที่ได้รับอนุญาตและจับคู่กับ employee อย่างตรวจสอบได้อย่างน้อยดังนี้:

1. ผู้ยื่นใบลาใน tenant pilot
2. เจ้าหน้าที่บันทึกผลเอกสารกระดาษ ซึ่งต้องเป็นคนละบัญชีกับผู้ยื่น
3. ผู้ดูแล tenant
4. ผู้ดูแล affiliation/ผู้ตรวจ snapshot
5. ผู้สังเกตการณ์แบบ read-only หรือ auditor
6. ผู้ปฏิบัติงาน integration ที่สั่ง retry/ตรวจ reconciliation ได้ แต่ไม่ควรเห็น secret หรือ payload ที่ไม่จำเป็น

การใช้บัญชีเดียวทดสอบทุกบทบาทไม่ถือเป็นหลักฐานว่า permission และ Segregation of Duties ผ่าน

## 4. UAT test matrix

ผลแต่ละกรณีต้องบันทึก `PASS`, `FAIL`, `BLOCKED` หรือ `WAIVED` พร้อม build/commit, environment, ผู้ทดสอบ และลิงก์หลักฐานที่ไม่เปิด PII

| ID | กรณีทดสอบ | ผลที่ต้องยืนยัน |
| --- | --- | --- |
| ENV-001 | API liveness/readiness และ web health | API มีชีวิต, database ready และ web ตอบได้ตาม health check |
| ENV-002 | contract/version | `contractVersion`, effective leave status และ target stack ตรงกับ release ที่อนุมัติ |
| AUTH-001 | Portal launch token ถูกต้อง | token ที่ยังไม่หมดอายุและ claims ถูกต้องสร้าง session ได้; ไม่แสดง token ใน URL หลัง redirect |
| AUTH-002 | token invalid/expired/replay | ถูกปฏิเสธ, durable `jti` replay ใช้ซ้ำไม่ได้ข้าม API replica และไม่สร้าง session บางส่วน |
| AUTH-003 | logout/idle expiry/rotation | session เดิมใช้ต่อไม่ได้หลัง logout หรือเกิน idle timeout; rotate ออก token ใหม่โดยไม่ต่อ absolute expiry |
| AUTH-004 | permission deny | บัญชีที่ไม่มี capability ได้ `403`; development auth ปิดใน staging/production |
| SCOPE-001 | workspace ที่ได้รับอนุญาต | ผู้ใช้เห็นเฉพาะ tenant/affiliation ที่ membership อนุญาตและสลับ workspace ได้เท่าที่ควร |
| SCOPE-002 | cross-tenant read/write | เปลี่ยน `x-tenant-id` หรือ resource ID ไปยัง tenant อื่นแล้วถูกปฏิเสธ ไม่เกิด side effect |
| PEOPLE-001 | master-data sync ครั้งแรก | จำนวน/รหัส source/ชื่อ/หน่วยงานตรงกับ source ที่อนุมัติ และมี sync run สรุปผล |
| PEOPLE-002 | sync ซ้ำและข้อมูลเปลี่ยน | sync ซ้ำไม่สร้างคนซ้ำ; inactive/membership ที่สิ้นสุดแล้วถูกสะท้อนแบบ effective-dated/soft-inactive |
| PEOPLE-003 | unmapped/duplicate | รายการที่จับคู่ไม่ได้หรือซ้ำถูกพักให้แก้ ไม่เดาสุ่มและไม่ผูก Portal account อัตโนมัติ |
| LEAVE-001 | สร้าง draft | วันที่ เหตุผล ประเภทลา และจำนวนวันถูกคำนวณจาก server; จำนวนทศนิยมเป็น fixed-decimal |
| LEAVE-002 | invalid/overlap | วันสิ้นสุดก่อนวันเริ่ม, ชนรายการ active หรือไม่มีวันนับได้ถูกปฏิเสธโดยไม่สร้างรายการบางส่วน |
| LEAVE-003 | submit | draft เปลี่ยนเป็น `SUBMITTED` ได้ครั้งเดียว พร้อม revision/audit |
| LEAVE-004 | paper handoff | ผู้ใช้ได้ข้อมูลสำหรับดำเนินการพิมพ์/ลงนามภายนอกตามแบบที่ HR รับรอง; หากแบบจริงยังไม่พร้อมให้เป็น `BLOCKED` ไม่ใช้เอกสารทดลองเป็นเอกสารราชการ |
| LEAVE-005 | paper approve/reject | เจ้าหน้าที่ผู้รับผิดชอบบันทึกผลได้เฉพาะรายการ `SUBMITTED`; `PAPER_APPROVED` มีผล, `PAPER_REJECTED` ไม่มีผล |
| LEAVE-006 | requester–recorder SoD | ผู้ยื่นไม่สามารถบันทึกผลหรือ void ใบลาที่ตนเองยื่น; ผู้ตรวจที่มี capability จึงทำได้ |
| LEAVE-007 | cancel/void/audit | ยกเลิกก่อนมีผลและ void หลังมีผลทำตาม transition; ไม่ hard-delete และ audit มี actor/time/reason |
| SPECIAL-001 | snapshot scope | snapshot มีเฉพาะ `PAPER_APPROVED` ที่ยังมีผล และมี employee mapping ที่ตรวจสอบแล้ว |
| SPECIAL-002 | complete/idempotent delivery | ส่ง period เดิมซ้ำไม่เพิ่มผลซ้ำ; source hash, snapshot version และ acknowledgement ตรงกัน |
| SPECIAL-003 | failure/retry/locked period | network/5xx retry ได้ตาม backoff; validation/locked period ไม่ retry วน; ผู้ดูแลเห็นสถานะและแก้ได้ |
| SPECIAL-004 | reconciliation | จำนวนบุคลากร/ใบลา/วันลาและ period ตรงกับ snapshot ที่ One Data เตรียม และ Special รับจริง |
| OPS-001 | migration/backup | migration ใช้ `migrate deploy`; schema check ผ่าน, backup มี checksum, restore verification ลงฐานใหม่ได้ และไม่มีการใช้ `db push` ใน production |
| OPS-002 | security/observability | security headers, origin/trusted-proxy policy, durable replay/revocation, 401/403/429, request ID, aggregate metrics และ error log ที่ redacted ตรวจได้โดยไม่เปิด secret/PII; edge rate limit ต้องมีหลักฐานจาก gateway |
| OPS-003 | rollback rehearsal | หยุด worker, ปิด write feature, rollback image และกลับไป flow เดิมได้ โดยข้อมูล audit ไม่หาย |

## 5. วิธี reconcile ข้อมูล

ก่อนและหลังแต่ละ sync/snapshot ให้เก็บ reconciliation report ที่ประกอบด้วยข้อมูลขั้นต่ำต่อไปนี้:

- จำนวน affiliation, tenant, employee และ active membership แยกตาม tenant
- จำนวน employee ที่มี source ID, Portal mapping, duplicate, unmapped และ inactive
- จำนวนใบลาแยกตามสถานะและ tenant โดยเฉพาะ `PAPER_APPROVED`
- ผลรวม approved days แยกตาม period/leave type/tenant โดยใช้ decimal ที่ระบุ scale ชัดเจน
- snapshot period, version, source cutoff, row count, source hash, delivery status และ Special acknowledgement
- รายการ mismatch เป็นรหัสอ้างอิง/ค่า hash หรือ aggregate เท่านั้น ไม่ใส่เลขบัตร เบอร์โทรศัพท์ token cookie หรือ payload ใบลาครบชุดใน log/report ทั่วไป

เกณฑ์ยอมรับ mismatch ต้องเป็น “อธิบายได้และมี owner/กำหนดแก้” ไม่ใช่เพียงตัวเลขรวมเท่ากัน

## 6. Cutover checklist ต่อหนึ่ง wave

### ก่อนเปิด

- [ ] มีรายชื่อ tenant, ผู้ใช้, บทบาท, ผู้รับผิดชอบ และ support contact
- [ ] baseline People/membership และ leave ถูก export/reconcile พร้อมผู้อนุมัติ
- [ ] Portal launch route, domain, cookie, CORS/CSRF และ reverse proxy ผ่าน staging
- [ ] migration/backup/restore และ rollback window ถูกทดสอบ
- [ ] Special period, contract version, service token และ cutoff ถูกยืนยันโดย owner
- [ ] worker ยังปิดอยู่จนกว่าจะมี approval เป็นลายลักษณ์อักษร

### ระหว่าง pilot

- [ ] ใช้ target เฉพาะกลุ่มที่ประกาศ; ระบบรถและระบบเดิมยังไม่ถูกปิด
- [ ] ใบลาทุกใบมี paper trail ตามกระบวนงานจริง
- [ ] ตรวจ SoD, audit, tenant scope และ error/retry ทุกวันในช่วงแรก
- [ ] ทำ snapshot แบบ manual ก่อน แล้วตรวจ Special result/reconciliation
- [ ] บันทึก incident ตาม severity และหยุด rollout หากพบ Sev-1/Sev-2

### หลังรอบ

- [ ] ผู้ใช้ยืนยันว่าขั้นตอนกรอก–พิมพ์–ลงนาม–บันทึกผลทำได้จริง
- [ ] reconciliation ไม่มี mismatch ที่อธิบายไม่ได้
- [ ] ไม่มีข้อมูลซ้ำ/ข้อมูลหาย/รายการค้างที่ไม่มี owner
- [ ] backup และ audit evidence เก็บตาม retention ที่กำหนด
- [ ] change owner อนุมัติขยาย wave หรือสั่ง rollback

## 7. Exit criteria และ rollback triggers

### Exit criteria สำหรับขยาย wave

- test matrix ที่เกี่ยวข้องผ่าน 100%; รายการที่ `WAIVED` ต้องมีผู้อนุมัติและเหตุผล
- ไม่มี Sev-1/Sev-2 ที่กระทบข้อมูล, สิทธิ์, ใบลาที่มีผล หรือการคำนวณ ฉ.10/11
- People/membership reconciliation และ Special snapshot reconciliation ผ่านอย่างน้อย 2 รอบติดต่อกัน
- ผู้ยื่นและผู้บันทึกผลเป็นคนละบัญชีใน sample ที่ทดสอบทั้งหมด
- support owner, runbook, backup evidence และ rollback window พร้อม

### Trigger ให้หยุด/rollback

- มี cross-tenant access, self-approval/self-paper-result หรือ Portal replay ที่ยังใช้งานได้
- ใบลา `PAPER_APPROVED` หาย ซ้ำ หรือถูกส่งเข้า Special ผิด period/ผิดบุคลากร
- migration/restore ไม่ผ่าน หรือฐานข้อมูลมี schema drift ที่อธิบายไม่ได้
- master-data sync เปลี่ยนคน/สังกัดผิดจำนวนอย่างมีนัยสำคัญ
- เกิด partial write ที่ไม่มี audit/recovery หรือ worker ส่งซ้ำจนผล Special ไม่ตรง

การ rollback ไม่ได้หมายถึงลบข้อมูลหรือย้อน migration แต่คือหยุดการเขียน/worker, รักษาหลักฐาน, แก้ด้วย forward migration/compensating action และให้ผู้ใช้กลับไปกระบวนงานเดิมตามประกาศ

## 8. สิ่งที่ยัง BLOCKED ใน checkpoint ปัจจุบัน

- การทดสอบกับบัญชี Portal และข้อมูลบุคลากรจริงยังต้องมี owner อนุมัติและ mapping ที่ตรวจรับ
- แบบ Word/DOCX ฉบับราชการและตัวอย่าง golden form ยังไม่มี จึงยังไม่ควรประกาศเอกสารจากระบบเป็นแบบทางการ
- มี reconciliation UI foundation สำหรับ snapshot/schedule และ durable session/replay foundation แล้ว แต่ยังไม่มี alerting production และ distributed edge rate limit แบบหลาย replica; base permission scope/delegated assignment API มีแล้ว แต่ยังต้องทดสอบครบทุก role/workspace กับ owner sign-off
- ยังไม่ได้ทำ backup/restore rehearsal กับ production-like infrastructure และยังไม่มี pilot จริง

ดังนั้นสถานะปัจจุบันคือ **พร้อมทำ G0 และเตรียม G1**, ยังไม่ใช่พร้อม cutover production
