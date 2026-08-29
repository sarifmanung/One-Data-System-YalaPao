# One Data — Release Readiness

อัปเดตล่าสุด: 30 สิงหาคม 2569 (2026)

## คำตัดสินปัจจุบัน

สถานะคือ **พร้อมผ่าน G0 และเตรียม G1** แต่ **ยังไม่พร้อม production หรือ cutover**.

งานใน repository ครบระดับ foundation สำหรับ target NestJS/Next.js, People/Leave vertical slice, Special snapshot boundary, session/security foundation, migration/backup tooling และ UAT evidence tooling แล้ว. การผ่าน local checkpoint ไม่ใช่หลักฐานว่าข้อมูลจริง, สิทธิ์ Portal, กฎ HR หรือการส่งผลคำนวณ ฉ.10/11 พร้อมใช้งานจริง.

## หลักฐานอัตโนมัติที่ตรวจแล้ว

| รายการ | ผลปัจจุบัน |
| --- | --- |
| API/Web target | Docker local liveness/readiness และ `/tenant-dashboard` ผ่าน |
| Contract/metrics | contract `1.4` และ metrics aggregate shape ผ่าน |
| Target tests | 19 suites / 94 tests ผ่าน |
| Typecheck/build | ผ่าน |
| Staging configuration | production Compose + staging overlay และ preflight ผ่านด้วยค่าจำลอง; ยังไม่ได้ deploy staging จริง |
| SSO negative suite | test double, valid exchange/session/rotation/logout และ invalid/expired/replay checks ผ่านบน local; ยังไม่ได้ทดสอบ Portal staging จริง |
| Special contract negative suite | focused adapter/service suite 32 tests ผ่าน; ยังไม่ได้ทดสอบ request matrix กับ Special staging period จริง |
| Edge/observability gate | local public-probe checks ผ่านเมื่อผ่อน HTTPS/HSTS/edge marker สำหรับ local; staging gate ยังรอ proxy marker, shared 429 evidence และ monitoring sink |
| Schema/backup/restore tooling | syntax, local schema check, backup checksum และ restore-to-new-database verification ผ่าน |
| UAT evidence | `scripts/target-uat-evidence.sh` สร้าง JSON/Markdown aggregate-only ได้; local run ใช้ dev-auth override `expected HTTP 200` |

## Gate status

| Gate | สถานะ | เหตุผล |
| --- | --- | --- |
| G0 Local/CI | **PASS** | automated test, typecheck, build, local health, contract, metrics และ evidence tooling ผ่าน |
| G1 Staging | **BLOCKED** | overlay/preflight, local SSO negative, local Special contract negative และ local edge/observability probe พร้อมแล้ว แต่ยังต้อง deploy จริง, restore rehearsal, Portal/Special staging contract, proxy/shared rate-limit และ alerting |
| G2 Shadow run | **BLOCKED** | ยังต้องตรวจ People/Portal mapping และ leave reconciliation กับข้อมูลจริงโดย data owner |
| G3 Pilot 1 รพ.สต. | **BLOCKED** | ต้องผ่าน G1/G2 และมีผู้รับผิดชอบ paper-first/SoD ที่ตรวจรับแล้ว |
| G4 Pilot 3 รพ.สต. | **BLOCKED** | ต้องมี reconciliation อย่างน้อย 2 รอบและไม่มี Sev-1/Sev-2 ค้าง |
| G5 Rollout | **BLOCKED** | ต้องผ่าน pilot, support/rollback window และ owner approval |

## สิ่งที่ต้องปิดก่อน production

- จับคู่ Portal user → employee และ organization/workspace ให้ครบ พร้อม data-owner sign-off; ห้ามเดา mapping จากชื่อ.
- รับรอง HR Leave Rulebook, legal basis, holiday/half-day/entitlement และ locked-period correction policy.
- ทำ staging/production-like restore, migration baseline, secret rotation, trusted-proxy/CSRF/cookie rehearsal และ rollback rehearsal.
- ตั้ง shared rate limit ที่ gateway/WAF พร้อม policy marker/429 evidence, monitoring sink/alerting/SLO และการตรวจ error/latency โดยไม่เปิด PII.
- ทำ Special contract/locked-period/read-through/reconciliation test กับ staging ที่มี period สำหรับทดสอบ และยืนยันว่า `PAPER_APPROVED` เท่านั้นที่ส่งคำนวณ; local negative suite เป็นเพียง automated foundation.
- ตรวจ dependency advisories และทำ upgrade/compatibility plan ก่อน production.
- หากต้องพิมพ์เอกสารจากระบบ ให้มีแบบ Word/DOCX ฉบับที่ฝ่ายบุคคลรับรองและ golden sample ก่อนเปิด document module.

## นโยบายหลักฐาน

`scripts/target-uat-evidence.sh` ต้องได้รับ `ONEDATA_UAT_EVIDENCE_DIR` เป็น absolute non-root directory. Artifact มีเฉพาะ HTTP status, contract/metrics shape และผลรวมของ smoke check; ไม่เก็บ response payload, cookie, token, identity, IP หรือข้อมูลบุคคล.

ใน local ที่เปิด development auth อาจตั้ง `ONEDATA_UAT_EXPECT_ME_STATUS=200` เพื่อทดสอบระบบให้ครบ แต่ต้องระบุในผลทุกครั้ง และห้ามนับเป็นการผ่าน deny-by-default/security ของ staging หรือ production. ใน environment ที่ปิด dev auth ค่าเริ่มต้นต้องเป็น `401`.

## ลำดับงานถัดไป

1. สร้าง staging ที่ข้อมูลสังเคราะห์หรือ de-identified แล้วทำ G1 พร้อมเก็บ evidence artifact.
2. ขอรายชื่อ/บทบาท Portal และ source employee mapping ที่เจ้าของข้อมูลตรวจรับ แล้วทำ G2 shadow reconciliation.
3. ให้ HR รับรอง Rulebook และเตรียม pilot 1 รพ.สต.; เปิด snapshot แบบ manual ก่อน monthly worker.
4. หลัง pilot ผ่านจึงพิจารณาเปิด schedule/monthly delivery และขยาย wave.
