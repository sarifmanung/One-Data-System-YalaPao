# One Data ↔ Special-Allowances Integration Contract

สถานะ: Target contract v1.1; compatibility adapter ปัจจุบันส่ง v1.0 ให้ source ที่ checkout อยู่
วันที่: 29 สิงหาคม 2569 (2026)

เอกสารนี้เป็น target contract สำหรับ implementation รอบแรกของ One Data และ `Special-Allowances` โดยยึด ownership ตาม [ARCHITECTURE.md](../ARCHITECTURE.md) และ decision ล่าสุดใน [One Data System - Reimplementation Blueprint.md](../One%20Data%20System%20-%20Reimplementation%20Blueprint.md). Laravel/Vue spike ปัจจุบันอาจยังใช้สถานะ legacy `CONFIRMED` จนกว่าจะย้าย Leave module และห้ามนำ legacy payload ไปปะปนกับ contract v1.1

การตรวจ source code ของ `Special-Allowances` รอบ implementation พบว่า `LeaveSnapshotDto` ใน checkout ปัจจุบัน validate `contract_version` เป็น `1.0` และ `LeaveSnapshotEntryDto` ยังไม่ whitelist `status` กับ `paper_decision_recorded_at`. ดังนั้น One Data adapter ใช้ `SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION=1.0` เป็นค่าเริ่มต้นและตัดสอง field additive นี้ออกเมื่อส่ง v1.0; เมื่อแก้/ประสาน source upstream ให้รับ v1.1 แล้วจึงเปลี่ยน configuration เป็น `1.1`. ข้อมูลภายใน One Data ยังเก็บผล `PAPER_APPROVED` และเวลาบันทึกผลไว้ครบ ไม่ได้ลดทอน state ภายใน.

## Boundary และทิศทางข้อมูล

- `Special-Allowances` เป็น source ของ health centers และ employees ในช่วง migration/MVP
- One Data เก็บสำเนาเพื่อใช้งาน People/Leave และเก็บ `external_id_mappings` เพื่อไม่จับคู่ด้วยชื่อหรือ PII
- One Data เป็นผู้ส่ง complete monthly leave snapshot
- Special เป็นเจ้าของการคำนวณ ฉ.10/11, period, lock/adjustment และรายงาน
- ห้ามอ่านหรือเขียนฐานข้อมูลของอีกระบบโดยตรง แม้อยู่ server เดียวกัน

### One Data snapshot control API

ผู้ดูแลที่มี capability `leave.snapshot.manage` ใช้ API ฝั่ง One Data ดังนี้:

- `POST /api/v1/integrations/special/leave-snapshots/prepare` — สร้าง immutable batch จากใบลา `PAPER_APPROVED` ที่เข้าเงื่อนไข period/cutoff หรือคืน batch เดิมเมื่อ source hash ซ้ำ
- `POST /api/v1/integrations/special/leave-snapshots/{batchId}/deliver` — ส่ง payload ที่เก็บไว้ไป Special และบันทึก delivery attempt/acknowledgement
- `GET /api/v1/integrations/special/leave-snapshots/{batchId}` — ตรวจ batch, source hash, จำนวนรายการ และประวัติ delivery

สถานะ batch คือ `PREPARED`, `DELIVERING`, `APPLIED`, `DUPLICATE`, `RETRYABLE_FAILURE` และ `FAILED`. Network/HTTP 408/429/5xx จะเก็บ retry metadata และเปิดให้ worker retry ได้ภายหลัง; configuration หรือ validation failure จะหยุดเป็น `FAILED` เพื่อให้แก้สาเหตุก่อน. Payload ของ batch immutable หากข้อมูลเปลี่ยนต้องสร้าง snapshot version ใหม่.

## Effective leave status rule

ใบลาใช้สถานะมาตรฐานดังนี้:

```text
DRAFT → SUBMITTED → PAPER_APPROVED/PAPER_REJECTED
```

- เฉพาะ `PAPER_APPROVED` ที่ยังมีผลเท่านั้นเป็น input ของ snapshot และการคำนวณใน Special-Allowances
- `DRAFT`, `SUBMITTED`, `PAPER_REJECTED`, `CANCELLED` และ `VOIDED` ไม่เป็น input
- `CONFIRMED` เป็นสถานะ legacy/deprecated จาก contract/แผนเดิม ไม่ใช่สถานะที่ยอมรับใน v1.1; ห้ามแปลงหรือยอมรับแบบเงียบ ๆ
- การบันทึก `PAPER_APPROVED/PAPER_REJECTED` เป็นการบันทึกผลเอกสารภายนอก ไม่ใช่ online approval chain

## Authentication

ทุก endpoint ใช้ service token แยกจาก Portal SSO:

```http
Authorization: Bearer <ONEDATA_INTEGRATION_TOKEN>
```

Special ตรวจ token แบบ constant-time และตอบ `401` หาก token ไม่ถูกต้อง หรือ `503` หากยังไม่ได้ตั้งค่า token ฝั่ง server

## Master data: Special → One Data

### `GET /internal/api/v1/master-data/health-centers`

```json
{
  "data": [
    { "id": "health-center-id", "name": "รพ.สต.ตัวอย่าง", "areaKey": "YALA-HC-001" }
  ]
}
```

### `GET /internal/api/v1/master-data/employees`

ฟิลด์หลักที่ One Data ใช้:

```json
{
  "data": [
    {
      "id": "employee-id",
      "firstName": "ชื่อ",
      "lastName": "นามสกุล",
      "positionGroup": "ข้าราชการ",
      "effectivePositionGroup": "ข้าราชการ",
      "positionName": "ตำแหน่ง",
      "startDate": "2020-01-01",
      "governmentServiceStartDate": "2020-01-01",
      "healthCenterStartDate": "2026-01-01",
      "healthCenterId": "health-center-id",
      "isActive": true,
      "updatedAt": "2026-08-29T00:00:00.000Z"
    }
  ]
}
```

### `GET /internal/api/v1/master-data/users`

ใน source schema ปัจจุบัน Special ยังไม่มี relation ระหว่าง `User` กับ `Employee` จึงส่ง `employeeId: null` จนกว่าจะมี mapping ที่ตรวจสอบแล้ว:

```json
{
  "data": [
    {
      "id": "user-id",
      "username": "staff",
      "role": "HEALTH_CENTER_USER",
      "healthCenterId": "health-center-id",
      "employeeId": null,
      "isActive": true
    }
  ]
}
```

การ sync เป็น transaction ใน One Data และเขียน effective-dated membership จาก `healthCenterStartDate` หากบุคลากรย้ายหน่วยงานจะปิด membership เดิมก่อนเริ่ม membership ใหม่

## Leave snapshot: One Data → Special

### `POST /internal/api/v1/periods/{YYYY-MM}/leave-snapshot`

One Data ส่งเฉพาะใบลาสถานะ `PAPER_APPROVED` ที่ยังมีผล และรวมรายการที่มีผลในเดือนนั้น โดย v1.1 ใช้ **complete reset semantics**: Special จะคำนวณ monthly records ของบุคลากรทั้ง period ใหม่ และถือบุคลากรที่ไม่ปรากฏใน payload ว่าไม่มีวันลา (`0`) การส่งแบบ explicit employee rows ว่างทุกคนอาจเพิ่มใน contract รุ่นถัดไปได้หากต้องการตรวจ scope แบบเข้มขึ้น

ตัวอย่าง:

```json
{
  "contract_version": "1.1",
  "period": "2026-08",
  "period_year": 2026,
  "period_month": 8,
  "snapshot_version": 1,
  "idempotency_key": "leave-snapshot:affiliation-id:2026-08:sha256",
  "source_cutoff": "2026-08-29T08:00:00+00:00",
  "source_hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "employees": [
    {
      "special_employee_id": "employee-id",
      "leave_entries": [
        {
          "one_data_leave_id": "leave-request-id",
          "status": "PAPER_APPROVED",
          "type": "SICK_LEAVE",
          "starts_on": "2026-08-10",
          "ends_on": "2026-08-10",
          "dates": ["2026-08-10"],
          "duration_days": 1,
          "paper_decision_recorded_at": "2026-08-12T03:15:00Z",
          "revision": 2
        }
      ]
    }
  ]
}
```

ประเภทลาที่รองรับใน v1.1:

| One Data / Special type | ความหมาย |
| --- | --- |
| `PERSONAL_LEAVE` | ลากิจส่วนตัว |
| `SICK_LEAVE` | ลาป่วย |
| `VACATION_LEAVE` | ลาพักผ่อน |
| `ABSENT` | ขาดงาน/ไม่มาปฏิบัติงาน |
| `MATERNITY_LEAVE` | ลาคลอดบุตร |
| `HAJJ_LEAVE` | ลาไปประกอบพิธีฮัจย์ |
| `ORDAIN_LEAVE` | ลาอุปสมบท |

### Response

```json
{
  "data": {
    "status": "applied",
    "periodId": "special-period-id",
    "period": "2026-08",
    "snapshotVersion": 1,
    "processedEmployees": 267,
    "processedLeaveEntries": 12
  }
}
```

## Idempotency และ period protocol

- Special รับเฉพาะ period `NORMAL` ที่ `OPEN`
- `period` ใน path และ body ต้องตรงกับ `period_year`/`period_month`
- `snapshot_version` ต้องมากกว่า version ล่าสุดของ period
- ทุก `leave_entry.status` ต้องเป็น `PAPER_APPROVED`; หากพบสถานะอื่นรวมถึง `CONFIRMED` ให้ตอบ validation error และไม่ apply snapshot
- ใน compatibility mode v1.0 source จะไม่รับ field `status`/`paper_decision_recorded_at` แต่ One Data จะ query เฉพาะ `PAPER_APPROVED` และเก็บ paper decision timestamp ในฐานข้อมูล/audit ของตนเอง; v1.1 จึงค่อยส่ง metadata สอง field นี้ไปด้วย
- ถ้า `idempotency_key` และ `source_hash` ซ้ำ จะตอบ `status: duplicate` โดยไม่เขียนข้อมูลซ้ำ
- การ `CANCELLED`/`VOIDED` ใบลาใน One Data จะไม่ถูกส่งเป็นรายการใหม่; complete snapshot ครั้งถัดไปทำให้ Special คำนวณค่าปัจจุบันใหม่
- หลัง Special lock period แล้ว ห้าม overwrite ด้วย leave snapshot v1.1; ต้องใช้ adjustment/correction contract ที่จะกำหนดเพิ่ม

## ขั้นตอนปฏิบัติรายเดือน

1. One Data sync master data ตามรอบที่กำหนด หรือสั่ง manual ก่อนทำงาน
2. ผู้ใช้สร้างและส่งใบลาใน One Data เพื่อดำเนินการตามเอกสารภายนอก
3. ผู้รับผิดชอบบันทึกผล `PAPER_APPROVED` หรือ `PAPER_REJECTED` ใน One Data
4. ผู้ดูแลตรวจ unmapped employee, จำนวนรายการ และ source hash
5. One Data prepare snapshot และส่งไป Special
6. Special ตรวจ period, คำนวณตัวแปรการลา และบันทึก audit
7. หากส่งซ้ำ ใช้ batch เดิม/เวอร์ชันใหม่ตามผลการแก้ไข ไม่สร้างข้อมูลซ้ำ

## ข้อจำกัดที่ยังเปิดไว้

- ต้องกำหนด mapping บัญชี Portal ↔ person และ organization code จริงก่อน pilot
- ต้องเพิ่ม contract สำหรับ locked-period adjustment และ reconciliation UI
- ต้องยืนยัน rulebook วันลาและเอกสาร Word ก่อนเปิด document module
- การใช้ `Float` ใน schema เดิมของ Special เป็นข้อจำกัด legacy; One Data ไม่คำนวณสูตร ฉ.10/11 ซ้ำ
