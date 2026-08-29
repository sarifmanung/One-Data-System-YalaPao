import { cookies } from 'next/headers';
import type {
  CurrentUser,
  LeaveExportBatchSummary,
  LeaveSnapshotReconciliationStatus,
  LeaveSnapshotScheduleStatus,
} from '@onedata/contracts';
import {
  LEAVE_SNAPSHOT_MANAGE,
  LEAVE_SNAPSHOT_SCHEDULE_MANAGE,
} from '@onedata/contracts';
import { AppShell } from '../../../components/app-shell';
import {
  approveLeaveSnapshotSchedule,
  deliverLeaveSnapshot,
  pauseLeaveSnapshotSchedule,
  prepareLeaveSnapshot,
  saveLeaveSnapshotSchedule,
} from './actions';
import {
  getCurrentUser,
  getLeaveSnapshotBatches,
  getLeaveSnapshotSchedules,
} from '../../../lib/api';

export const dynamic = 'force-dynamic';

const RECONCILIATION_LABELS: Record<LeaveSnapshotReconciliationStatus, string> = {
  NOT_SENT: 'ยังไม่ส่ง',
  PENDING: 'รอตรวจผลการส่ง',
  MATCHED: 'ข้อมูลตรงกัน',
  MISMATCH: 'ข้อมูลไม่ตรงกัน',
  BLOCKED: 'รอตรวจสอบโดยเจ้าหน้าที่',
};

const SCHEDULE_LABELS: Record<LeaveSnapshotScheduleStatus, string> = {
  DRAFT: 'ฉบับร่าง',
  APPROVED: 'อนุมัติแล้ว',
  PAUSED: 'หยุดชั่วคราว',
};

function hasPermission(user: CurrentUser, permission: string): boolean {
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function previousPeriod(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function reconciliationClass(status: LeaveSnapshotReconciliationStatus): string {
  return `snapshot-status snapshot-status-${status.toLowerCase()}`;
}

function scheduleClass(status: LeaveSnapshotScheduleStatus): string {
  return `snapshot-status snapshot-status-${status.toLowerCase()}`;
}

function SnapshotCard({
  batch,
  affiliationId,
  canManage,
}: {
  batch: LeaveExportBatchSummary;
  affiliationId: string;
  canManage: boolean;
}) {
  const reconciliation = batch.reconciliation;
  const canDeliver = canManage && ['PREPARED', 'RETRYABLE_FAILURE'].includes(batch.status);
  return (
    <article className="snapshot-card">
      <div className="snapshot-card-header">
        <div>
          <span className={reconciliationClass(reconciliation.status)}>
            {RECONCILIATION_LABELS[reconciliation.status]}
          </span>
          <h3>งวด {batch.period} · snapshot v{batch.snapshotVersion}</h3>
          <p className="snapshot-card-meta">
            สร้างเมื่อ {formatDateTime(batch.createdAt)} · contract {batch.contractVersion}
          </p>
        </div>
        <span className={`snapshot-batch-status snapshot-batch-${batch.status.toLowerCase()}`}>
          {batch.status}
        </span>
      </div>

      <div className="snapshot-count-grid">
        <div><span>One Data บุคลากร</span><strong>{reconciliation.localEmployees}</strong></div>
        <div><span>Special บุคลากร</span><strong>{reconciliation.upstreamEmployees ?? '—'}</strong></div>
        <div><span>One Data รายการลา</span><strong>{reconciliation.localLeaveEntries}</strong></div>
        <div><span>Special รายการลา</span><strong>{reconciliation.upstreamLeaveEntries ?? '—'}</strong></div>
      </div>

      <div className="snapshot-card-details">
        <span>ส่งล่าสุด {formatDateTime(reconciliation.checkedAt)}</span>
        <span>hash {batch.sourceHash.slice(0, 12)}…</span>
        {reconciliation.upstreamPeriodId ? <span>Special period {reconciliation.upstreamPeriodId}</span> : null}
      </div>

      {reconciliation.mismatchReasons.length > 0 ? (
        <ul className="snapshot-mismatch-list">
          {reconciliation.mismatchReasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      ) : null}

      {canDeliver ? (
        <div className="snapshot-card-actions">
          <form action={deliverLeaveSnapshot}>
            <input type="hidden" name="affiliationId" value={affiliationId} />
            <input type="hidden" name="batchId" value={batch.id} />
            <button className="primary-button compact-button" type="submit">ส่งไปยังระบบ ฉ.</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export default async function LeaveSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[]; noticeType?: string | string[] }>;
}) {
  const cookieHeader = (await cookies()).toString();
  const currentUser = await getCurrentUser(cookieHeader);
  const affiliation = currentUser?.workspaces.find((workspace) => workspace.kind === 'affiliation');
  const canManage = Boolean(currentUser && hasPermission(currentUser, LEAVE_SNAPSHOT_MANAGE));
  const canManageSchedule = Boolean(
    currentUser && hasPermission(currentUser, LEAVE_SNAPSHOT_SCHEDULE_MANAGE),
  );
  const [batches, schedules] = currentUser && affiliation
    ? await Promise.all([
        canManage ? getLeaveSnapshotBatches(cookieHeader, affiliation.id) : Promise.resolve(null),
        canManageSchedule ? getLeaveSnapshotSchedules(cookieHeader, affiliation.id) : Promise.resolve(null),
      ])
    : [null, null];
  const query = await searchParams;
  const notice = queryValue(query.notice);
  const noticeType = queryValue(query.noticeType) === 'error' ? 'error' : 'success';
  const schedule = schedules?.[0] ?? null;
  const showScheduleForm = canManageSchedule && (!schedule || schedule.status !== 'APPROVED');

  return (
    <AppShell currentUser={currentUser} currentPage="ติดตามการส่งระบบ ฉ.">
      <section className="leave-page snapshot-page" aria-labelledby="snapshot-page-title">
        <div className="page-heading leave-heading">
          <p className="eyebrow">SPECIAL-ALLOWANCES INTEGRATION</p>
          <h1 id="snapshot-page-title">ติดตามการส่งข้อมูลระบบ ฉ.10/11</h1>
          <p className="heading-description">
            ตรวจสอบ snapshot รายเดือนจาก One Data และผลตอบรับจากระบบ ฉ. โดยไม่เปิดเผย payload รายบุคคลเกินจำเป็น
          </p>
        </div>

        {notice ? <div className={`notice notice-${noticeType}`} role="status">{notice}</div> : null}

        {!currentUser || !affiliation ? (
          <section className="leave-panel permission-empty">
            <strong>{currentUser ? 'บัญชีนี้ยังไม่มี affiliation workspace' : 'ต้องเข้าสู่ระบบก่อนใช้งาน'}</strong>
            <span>การตรวจสอบ snapshot และ schedule ต้องทำจาก workspace ระดับสังกัดที่ได้รับอนุญาต</span>
          </section>
        ) : !canManage && !canManageSchedule ? (
          <section className="leave-panel permission-empty">
            <strong>บัญชีนี้ยังไม่มีสิทธิ์ดูแล integration</strong>
            <span>กรุณาใช้บัญชีผู้ดูแล snapshot หรือผู้รับผิดชอบ schedule ที่ได้รับอนุญาต</span>
          </section>
        ) : (
          <div className="snapshot-layout">
            {canManageSchedule ? (
              <section className="leave-panel snapshot-schedule-panel" aria-labelledby="snapshot-schedule-title">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 id="snapshot-schedule-title">รอบส่งข้อมูลอัตโนมัติ</h2>
                    <p>worker จะส่งได้ต่อเมื่อ schedule เป็น “อนุมัติแล้ว” เท่านั้น</p>
                  </div>
                  {schedule ? <span className={scheduleClass(schedule.status)}>{SCHEDULE_LABELS[schedule.status]}</span> : null}
                </div>

                {showScheduleForm ? (
                  <form className="snapshot-form" action={saveLeaveSnapshotSchedule}>
                    <input type="hidden" name="affiliationId" value={affiliation.id} />
                    <label>
                      ส่งหลังสิ้นงวด (วัน)
                      <input name="cutoffDays" type="number" min="0" max="31" defaultValue={schedule?.cutoffDays ?? 3} required />
                    </label>
                    <label>
                      Contract version
                      <input name="contractVersion" defaultValue={schedule?.contractVersion ?? '1.0'} readOnly />
                    </label>
                    <button className="primary-button compact-button" type="submit">บันทึกฉบับร่าง</button>
                  </form>
                ) : null}

                {schedule?.status === 'DRAFT' || schedule?.status === 'PAUSED' ? (
                  <div className="snapshot-inline-actions">
                    <form action={approveLeaveSnapshotSchedule}>
                      <input type="hidden" name="affiliationId" value={affiliation.id} />
                      <input type="hidden" name="scheduleId" value={schedule.id} />
                      <button className="outline-button compact-button" type="submit">อนุมัติ schedule</button>
                    </form>
                  </div>
                ) : null}
                {schedule?.status === 'APPROVED' ? (
                  <div className="snapshot-inline-actions">
                    <span>ตั้งไว้ {schedule.cutoffDays} วันหลังสิ้นงวด · {formatDateTime(schedule.approvedAt)}</span>
                    <form action={pauseLeaveSnapshotSchedule}>
                      <input type="hidden" name="affiliationId" value={affiliation.id} />
                      <input type="hidden" name="scheduleId" value={schedule.id} />
                      <button className="outline-button compact-button" type="submit">หยุด schedule</button>
                    </form>
                  </div>
                ) : null}
              </section>
            ) : null}

            {canManage ? (
              <section className="leave-panel snapshot-prepare-panel" aria-labelledby="snapshot-prepare-title">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 id="snapshot-prepare-title">เตรียม snapshot</h2>
                    <p>สร้างข้อมูลของงวดเพื่อให้ตรวจ reconciliation ก่อนกดส่ง</p>
                  </div>
                </div>
                <form className="snapshot-form" action={prepareLeaveSnapshot}>
                  <input type="hidden" name="affiliationId" value={affiliation.id} />
                  <label>
                    งวดเดือน
                    <input name="period" type="month" defaultValue={previousPeriod()} required />
                  </label>
                  <button className="primary-button compact-button" type="submit">เตรียม snapshot</button>
                </form>
              </section>
            ) : null}

            {canManage ? (
              <section className="leave-panel snapshot-list-panel" aria-labelledby="snapshot-list-title">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 id="snapshot-list-title">ประวัติ snapshot</h2>
                    <p>ตรวจ period, version, จำนวน และสถานะ reconciliation ก่อนส่ง/แก้ไข</p>
                  </div>
                  <span className="request-count">{batches?.length ?? 0} รายการ</span>
                </div>
                {!batches || batches.length === 0 ? (
                  <div className="leave-empty-state">
                    <div className="empty-icon" aria-hidden="true">↗</div>
                    <strong>ยังไม่มี snapshot</strong>
                    <span>เตรียม snapshot จากใบลา PAPER_APPROVED แล้วตรวจผลได้ที่นี่</span>
                  </div>
                ) : (
                  <div className="snapshot-card-list">
                    {batches.map((batch) => (
                      <SnapshotCard key={batch.id} batch={batch} affiliationId={affiliation.id} canManage={canManage} />
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </section>
    </AppShell>
  );
}
