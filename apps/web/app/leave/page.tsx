import { cookies } from 'next/headers';
import type { CurrentUser, LeaveRequestSummary, LeaveStatus } from '@onedata/contracts';
import {
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_CANCEL,
  LEAVE_REQUEST_CREATE,
  LEAVE_REQUEST_SUBMIT,
  LEAVE_REQUEST_VOID,
} from '@onedata/contracts';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  recordPaperResult,
  submitLeaveRequest,
  voidLeaveRequest,
} from './actions';
import { AppShell } from '../../components/app-shell';
import { getCurrentUser, getLeaveRequests, getLeaveTypes } from '../../lib/api';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<LeaveStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  SUBMITTED: 'ส่งแล้ว / รอผลกระดาษ',
  PAPER_APPROVED: 'มีผลแล้ว',
  PAPER_REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิกแล้ว',
  VOIDED: 'เป็นโมฆะ',
};

function hasPermission(user: CurrentUser, permission: string): boolean {
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatRange(request: LeaveRequestSummary): string {
  if (request.startsOn === request.endsOn) {
    return formatDate(request.startsOn);
  }
  return `${formatDate(request.startsOn)} – ${formatDate(request.endsOn)}`;
}

function statusClass(status: LeaveStatus): string {
  return `leave-status status-${status.toLowerCase()}`;
}

function EmptyRequests({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="leave-empty-state">
      <div className="empty-icon" aria-hidden="true">✓</div>
      <strong>{authenticated ? 'ยังไม่มีรายการใบลา' : 'ยังไม่ได้เข้าสู่ระบบ'}</strong>
      <span>
        {authenticated
          ? 'รายการที่คุณสร้างจะแสดงที่นี่ และตรวจสอบย้อนหลังได้ทุกสถานะ'
          : 'กรุณาเข้าสู่ระบบผ่าน Portal SSO ก่อนใช้งานระบบการลา'}
      </span>
    </div>
  );
}

function LeaveCard({
  request,
  tenantId,
  isOwner,
  canSubmit,
  canCancel,
  canRecordPaperResult,
  canVoid,
}: {
  request: LeaveRequestSummary;
  tenantId: string;
  isOwner: boolean;
  canSubmit: boolean;
  canCancel: boolean;
  canRecordPaperResult: boolean;
  canVoid: boolean;
}) {
  return (
    <article className="leave-card">
      <div className="leave-card-header">
        <div>
          <span className={statusClass(request.status)}>{STATUS_LABELS[request.status]}</span>
          <h3>{request.leaveType.name}</h3>
          <p className="leave-card-meta">{request.employeeDisplayName} · {formatRange(request)}</p>
        </div>
        <div className="leave-days">
          <strong>{request.requestedDays ?? '—'}</strong>
          <span>วัน</span>
        </div>
      </div>

      {request.reason ? <p className="leave-reason">เหตุผล: {request.reason}</p> : null}
      <div className="leave-card-details">
        <span>รหัสรายการ {request.id.slice(0, 8)}</span>
        <span>{request.calculationBasis ?? 'ยังไม่มีฐานการคำนวณ'}</span>
        {request.approvedDays !== null ? <span>อนุมัติ {request.approvedDays} วัน</span> : null}
      </div>

      <div className="leave-card-actions">
        {request.status === 'DRAFT' && isOwner && canSubmit ? (
          <form action={submitLeaveRequest}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="requestId" value={request.id} />
            <button className="primary-button compact-button" type="submit">ส่งใบลา</button>
          </form>
        ) : null}
        {(request.status === 'DRAFT' || request.status === 'SUBMITTED') && isOwner && canCancel ? (
          <form action={cancelLeaveRequest}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="requestId" value={request.id} />
            <button className="outline-button compact-button" type="submit">ยกเลิก</button>
          </form>
        ) : null}
      </div>

      {request.status === 'SUBMITTED' && canRecordPaperResult ? (
        <details className="leave-action-details">
          <summary>บันทึกผลจากเอกสารกระดาษ</summary>
          <form className="leave-inline-form" action={recordPaperResult}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="requestId" value={request.id} />
            <label>
              ผลเอกสาร
              <select name="result" defaultValue="PAPER_APPROVED" required>
                <option value="PAPER_APPROVED">อนุมัติ</option>
                <option value="PAPER_REJECTED">ไม่อนุมัติ</option>
              </select>
            </label>
            <label>
              วันที่อนุมัติ
              <input name="approvedDays" type="number" min="0.01" step="0.01" placeholder="เช่น 4" />
            </label>
            <label>
              เลขที่เอกสาร
              <input name="documentNumber" maxLength={100} placeholder="ถ้ามี" />
            </label>
            <label>
              วันที่เอกสาร
              <input name="documentDate" type="date" />
            </label>
            <label className="full-width-field">
              หมายเหตุ
              <textarea name="reason" rows={2} maxLength={4000} placeholder="เหตุผลหรือหมายเหตุจากเอกสาร" />
            </label>
            <button className="primary-button compact-button" type="submit">บันทึกผล</button>
          </form>
        </details>
      ) : null}

      {request.status === 'PAPER_APPROVED' && canVoid ? (
        <details className="leave-action-details danger-details">
          <summary>ทำให้ใบลาเป็นโมฆะ</summary>
          <form className="leave-inline-form" action={voidLeaveRequest}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="requestId" value={request.id} />
            <label className="full-width-field">
              เหตุผลที่ทำให้เป็นโมฆะ
              <textarea name="reason" rows={2} maxLength={4000} required />
            </label>
            <button className="danger-button compact-button" type="submit">ยืนยันเป็นโมฆะ</button>
          </form>
        </details>
      ) : null}
    </article>
  );
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[]; noticeType?: string | string[] }>;
}) {
  const cookieHeader = (await cookies()).toString();
  const currentUser = await getCurrentUser(cookieHeader);
  const tenant = currentUser?.workspaces.find((workspace) => workspace.kind === 'tenant');
  const [leaveTypes, leaveRequests] = currentUser && tenant
    ? await Promise.all([
        getLeaveTypes(cookieHeader, tenant.id),
        getLeaveRequests(cookieHeader, tenant.id),
      ])
    : [null, null];
  const query = await searchParams;
  const notice = queryValue(query.notice);
  const noticeType = queryValue(query.noticeType) === 'error' ? 'error' : 'success';
  const authenticated = Boolean(currentUser && tenant);
  const canCreate = Boolean(currentUser && hasPermission(currentUser, LEAVE_REQUEST_CREATE));
  const canSubmit = Boolean(currentUser && hasPermission(currentUser, LEAVE_REQUEST_SUBMIT));
  const canCancel = Boolean(currentUser && hasPermission(currentUser, LEAVE_REQUEST_CANCEL));
  const canRecordPaperResult = Boolean(
    currentUser && hasPermission(currentUser, LEAVE_PAPER_DECISION_RECORD),
  );
  const canVoid = Boolean(currentUser && hasPermission(currentUser, LEAVE_REQUEST_VOID));
  const requests = leaveRequests ?? [];

  return (
    <AppShell currentUser={currentUser} currentPage="ระบบการลา">
      <section className="leave-page" aria-labelledby="leave-page-title">
        <div className="page-heading leave-heading">
          <p className="eyebrow">LEAVE MANAGEMENT</p>
          <h1 id="leave-page-title">ระบบการลา</h1>
          <p className="heading-description">
            บันทึกและติดตามใบลาแบบ Paper-first ข้อมูลที่มีผลจะส่งต่อให้ระบบ ฉ.10/11 ตามรอบที่กำหนด
          </p>
        </div>

        {notice ? <div className={`notice notice-${noticeType}`} role="status">{notice}</div> : null}

        <div className="leave-layout">
          <section className="leave-panel leave-form-panel" aria-labelledby="new-leave-title">
            <div className="dashboard-panel-header">
              <div>
                <h2 id="new-leave-title">บันทึกใบลา</h2>
                <p>สร้างฉบับร่างก่อนตรวจสอบและส่งไปดำเนินการเอกสารภายนอก</p>
              </div>
            </div>
            {canCreate && tenant ? (
              <form className="leave-form" action={createLeaveRequest}>
                <input type="hidden" name="tenantId" value={tenant.id} />
                <label>
                  ประเภทการลา
                  <select name="leaveTypeId" required defaultValue="">
                    <option value="" disabled>เลือกประเภทการลา</option>
                    {(leaveTypes ?? []).map((leaveType) => (
                      <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>
                    ))}
                  </select>
                </label>
                <div className="form-grid-two">
                  <label>
                    ตั้งแต่วันที่
                    <input name="startsOn" type="date" required />
                  </label>
                  <label>
                    ถึงวันที่
                    <input name="endsOn" type="date" required />
                  </label>
                </div>
                <label>
                  เหตุผลการลา
                  <textarea name="reason" rows={4} maxLength={4000} placeholder="ระบุเหตุผล (ถ้ามี)" />
                </label>
                <div className="form-footnote">
                  จำนวนวันคำนวณโดย server และจะแสดงหลังบันทึกฉบับร่าง
                </div>
                <button className="primary-button" type="submit" disabled={!leaveTypes?.length}>
                  บันทึกฉบับร่าง
                </button>
              </form>
            ) : (
              <div className="permission-empty">
                <strong>{authenticated ? 'บัญชีนี้ยังไม่มีสิทธิ์สร้างใบลา' : 'ต้องเข้าสู่ระบบก่อนบันทึกใบลา'}</strong>
                <span>สิทธิ์และขอบเขตข้อมูลควรมาจาก Portal/หน่วยงาน ไม่รับจากค่าที่กรอกใน browser</span>
              </div>
            )}
          </section>

          <section className="leave-panel leave-list-panel" aria-labelledby="leave-list-title">
            <div className="dashboard-panel-header">
              <div>
                <h2 id="leave-list-title">รายการใบลาของฉัน/ในขอบเขต</h2>
                <p>เฉพาะสถานะ PAPER_APPROVED เท่านั้นที่ถือว่ามีผลต่อระบบ ฉ.10/11</p>
              </div>
              <span className="request-count">{requests.length} รายการ</span>
            </div>
            {requests.length === 0 ? (
              <EmptyRequests authenticated={authenticated} />
            ) : (
              <div className="leave-card-list">
                {requests.map((request) => (
                  <LeaveCard
                    key={request.id}
                    request={request}
                    tenantId={tenant?.id ?? request.tenantId}
                    isOwner={currentUser?.employeeId === request.employeeId}
                    canSubmit={canSubmit}
                    canCancel={canCancel}
                    canRecordPaperResult={canRecordPaperResult}
                    canVoid={canVoid}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="dashboard-status-bar">
          <span className="status-dot connected" aria-hidden="true" />
          Paper-first workflow
          <span className="status-separator">•</span>
          `PAPER_APPROVED` = มีผล
          <span className="status-separator">•</span>
          {tenant?.name ?? 'ยังไม่เลือกหน่วยงาน'}
        </footer>
      </section>
    </AppShell>
  );
}
