# One Data — Edge Gateway & Observability Gate

เอกสารนี้กำหนด boundary ที่ต้องตรวจเมื่อ One Data ถูกเผยแพร่ผ่าน reverse proxy ของ `shared-infra` โดยเฉพาะ Nginx Proxy Manager. แอป NestJS มี per-process limiter เป็น defense-in-depth เท่านั้น; ไม่ถือว่าแทน shared rate limit เมื่อมีหลาย API replica.

## สิ่งที่ต้องมีที่ edge

- รับ traffic ที่ public HTTPS domain และ route ไปยัง `onedata-target-web`/`onedata-target-api` ผ่าน external Docker network `webproxy`; ห้ามเปิด host port ของ API, Web หรือ worker ใน staging/production.
- เพิ่ม `X-RateLimit-Policy: shared` จาก gateway/proxy เพื่อระบุว่า request ผ่าน policy ที่ใช้ state/config ร่วมกัน. ห้ามเพิ่ม header นี้จากแอปเพื่อทำให้ gate ผ่าน.
- ใช้ shared rate-limit policy อย่างน้อยแยก auth exchange กับ mutation และตอบ `429` พร้อม `Retry-After` เมื่อเกิน limit; ต้องมีหลักฐานจาก public URL และทดสอบซ้ำเมื่อมีหลาย API replica.
- ส่งต่อ `X-Request-ID` จาก One Data หรือสร้างใหม่ที่ edge โดยไม่ใช้ token/cookie/PII เป็น request ID.
- terminate TLS ที่ edge, redirect HTTP ไป HTTPS ตามนโยบาย และคง `Strict-Transport-Security` จาก API สำหรับ public response.
- จำกัดการเข้าถึง Nginx Proxy Manager admin, database admin และ monitoring endpoint ด้วย management network/VPN/allowlist; อย่าเผยแพร่ admin port สู่ Internet โดยไม่จำเป็น.

## สิ่งที่ API รับผิดชอบ

- NestJS บังคับ explicit `ONEDATA_TRUST_PROXY`, allowed CORS origin, CSRF origin, secure cookie, security headers/HSTS, auth/mutation per-process rate limit และ aggregate metrics.
- `/api/health/metrics` แสดงเฉพาะ uptime, request total และ response status class; ไม่ควรเปิดให้ผู้ใช้ทั่วไปเข้าถึง และไม่เก็บ path, IP, identity, cookie, token, password หรือ payload.
- `scripts/target-uat-evidence.sh` ตรวจ health/readiness/contract/metrics shape, request ID, security headers และ deny-by-default auth.
- `scripts/target-edge-observability-check.sh` ตรวจ public edge response, CORS, HSTS, proxy marker และ metrics privacy โดยไม่พิมพ์ response body.

## คำสั่งตรวจ

ใช้ staging domain และ origin ที่ owner อนุมัติ:

```bash
ONEDATA_EDGE_BASE_URL=https://staging.onedata.example.org \
  ONEDATA_EDGE_EXPECTED_ORIGIN=https://staging.onedata.example.org \
  npm run target:edge:check
```

สำหรับทดสอบ 429 ให้เพิ่มเฉพาะ maintenance window:

```bash
ONEDATA_EDGE_BASE_URL=https://staging.onedata.example.org \
  ONEDATA_EDGE_EXPECTED_ORIGIN=https://staging.onedata.example.org \
  ONEDATA_EDGE_RATE_LIMIT_PROBE_PATH=/api/v1/auth/portal/exchange \
  ONEDATA_EDGE_RATE_LIMIT_PROBE_COUNT=<จำนวนที่กำหนดใน staging> \
  npm run target:edge:check
```

probe ใช้ `POST {}` โดยไม่มี token จึงไม่ควรสร้าง leave/ธุรกรรมทางธุรกิจ แต่ยังต้องใช้ public staging/test identity policy ที่ผู้ดูแลอนุมัติ. ถ้าไม่มี `X-RateLimit-Policy: shared` หรือไม่เกิด `429` ตามจำนวนที่กำหนด ให้ถือว่า G1 ไม่ผ่าน.

## หลักฐานที่ต้องเก็บ

เก็บเพียง commit/build, domain/environment, timestamp, HTTP status, ชื่อ header policy, ผล 429/Retry-After, metrics shape และ alert delivery status. ห้ามเก็บ raw header ที่มี cookie, authorization, token, `Set-Cookie`, request payload หรือข้อมูลบุคคล. คำสั่งนี้ไม่แก้ config ของ Nginx Proxy Manager ให้เอง; การตั้งค่า edge ต้องผ่าน change owner และมี rollback plan.
