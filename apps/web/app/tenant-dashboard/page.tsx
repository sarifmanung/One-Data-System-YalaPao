import Link from 'next/link';
import { cookies } from 'next/headers';
import type { LeaveRequestSummary, PersonListItem } from '@onedata/contracts';
import { AppShell } from '../../components/app-shell';
import { Icon, type IconName } from '../../components/icons';
import { getApiHealth, getCurrentUser, getLeaveRequests, getPeople } from '../../lib/api';

export const dynamic = 'force-dynamic';

type MetricCardProps = {
  icon: IconName;
  label: string;
  value: string | number;
  unit?: string;
  note: string;
  tone?: 'blue' | 'cyan' | 'orange' | 'purple';
};

function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatThaiDate(value: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function formatThaiMonth(value: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function isEffectiveToday(request: LeaveRequestSummary, today: string): boolean {
  return request.status === 'PAPER_APPROVED'
    && request.startsOn <= today
    && request.endsOn >= today;
}

function groupPeopleByPosition(people: PersonListItem[]): Array<{ name: string; count: number; percentage: number }> {
  const groups = new Map<string, number>();
  for (const person of people) {
    const position = person.positionName || person.positionGroup || 'ไม่ระบุตำแหน่ง';
    groups.set(position, (groups.get(position) ?? 0) + 1);
  }
  return [...groups.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'th'))
    .map(([name, count]) => ({
      name,
      count,
      percentage: people.length > 0 ? Math.round((count / people.length) * 100) : 0,
    }));
}

function MetricCard({ icon, label, value, unit, note, tone = 'blue' }: MetricCardProps) {
  return (
    <article className={`dashboard-metric-card metric-tone-${tone}`}>
      <div className="metric-card-topline">
        <span>{label}</span>
        <span className="metric-icon"><Icon name={icon} size={18} /></span>
      </div>
      <div className="metric-number">
        <strong>{value}</strong>
        {unit ? <small>{unit}</small> : null}
      </div>
      <p><span className="metric-dot" />{note}</p>
    </article>
  );
}

function PanelHeader({ title, description, href }: { title: string; description: string; href?: string }) {
  return (
    <div className="dashboard-panel-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {href ? <Link className="panel-action" href={href}>ดูรายละเอียด <Icon name="arrow-right" size={15} /></Link> : null}
    </div>
  );
}

function EmptyDashboardState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="dashboard-empty-state">
      <span className="dashboard-empty-icon"><Icon name={icon} size={21} /></span>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function StatusPanel({ employeeCount, leaveToday }: { employeeCount: number | null; leaveToday: number | null }) {
  const hasAttendanceData = false;
  return (
    <section className="dashboard-panel status-panel">
      <PanelHeader title="สถานะวันนี้" description="การปฏิบัติงานของพนักงานวันนี้" />
      <div className="status-panel-body">
        <div className="status-donut" aria-label="ยังไม่มีข้อมูลการปฏิบัติงาน">
          <div>
            <strong>{hasAttendanceData ? employeeCount ?? 0 : '—'}</strong>
            <span>พนักงาน</span>
          </div>
        </div>
        <div className="status-legend">
          <div><i className="legend-blue" /><span>ปฏิบัติงาน</span><strong>{hasAttendanceData ? 0 : '—'}</strong><small>{hasAttendanceData ? '0%' : 'ยังไม่เชื่อม'}</small></div>
          <div><i className="legend-cyan" /><span>ไปราชการ</span><strong>{hasAttendanceData ? 0 : '—'}</strong><small>{hasAttendanceData ? '0%' : 'ยังไม่เชื่อม'}</small></div>
          <div><i className="legend-orange" /><span>ลา</span><strong>{hasAttendanceData ? leaveToday ?? 0 : '—'}</strong><small>{hasAttendanceData ? '0%' : 'ยังไม่เชื่อม'}</small></div>
          <div><i className="legend-gray" /><span>หยุด</span><strong>{hasAttendanceData ? Math.max((employeeCount ?? 0) - (leaveToday ?? 0), 0) : '—'}</strong><small>{hasAttendanceData ? '0%' : 'ยังไม่เชื่อม'}</small></div>
        </div>
      </div>
      <div className="panel-footnote"><Icon name="calendar" size={14} /> ยังไม่มีข้อมูลตารางเวร/การปฏิบัติงานใน target รุ่นนี้</div>
    </section>
  );
}

function StaffingPanel() {
  const staffingRows = [
    { label: 'ผู้อำนวยการ รพ.สต. / สอน.', current: '—', target: '—', state: 'ยังไม่เชื่อม' },
    { label: 'กลุ่มงานบริหารสาธารณสุข', current: '—', target: '—', state: 'ยังไม่เชื่อม' },
    { label: 'กลุ่มงานสร้างเสริมและป้องกันโรค', current: '—', target: '—', state: 'ยังไม่เชื่อม' },
    { label: 'กลุ่มงานเวชปฏิบัติครอบครัว', current: '—', target: '—', state: 'ยังไม่เชื่อม' },
    { label: 'กลุ่มงานสนับสนุนบริการ', current: '—', target: '—', state: 'ไม่กำหนด' },
  ];
  return (
    <section className="dashboard-panel staffing-panel">
      <PanelHeader title="จำนวนพนักงานในขนาดองค์กร" description="ข้อมูลกรอบอัตรากำลังและจำนวนพนักงาน" />
      <div className="staffing-summary"><strong>ยังไม่กำหนดขนาดองค์กร</strong><span>รอข้อมูลโครงสร้างตำแหน่งจากระบบหลัก</span></div>
      <div className="staffing-tabs"><button className="active" type="button">ข้าราชการ</button><button type="button">พกส.</button><button type="button">ลูกจ้างชั่วคราว</button></div>
      <div className="staffing-list">
        {staffingRows.map((row) => (
          <div className="staffing-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.current} / {row.target} คน</strong>
            <small>{row.state}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function TenantDashboardPage() {
  const cookieHeader = (await cookies()).toString();
  const [apiHealth, currentUser] = await Promise.all([
    getApiHealth(),
    getCurrentUser(cookieHeader),
  ]);
  const tenant = currentUser?.workspaces.find((workspace) => workspace.kind === 'tenant');
  const [people, leaveRequests] = currentUser && tenant
    ? await Promise.all([
        getPeople(cookieHeader, tenant.id),
        getLeaveRequests(cookieHeader, tenant.id),
      ])
    : [null, null];
  const today = todayIso();
  const effectiveToday = leaveRequests?.filter((request) => isEffectiveToday(request, today)) ?? [];
  const pendingLeaves = leaveRequests?.filter((request) => request.status === 'SUBMITTED').length ?? null;
  const employeeCount = people?.length ?? null;
  const positions = groupPeopleByPosition(people ?? []);
  const monthLabel = formatThaiMonth(today.slice(0, 7));
  const todayLabel = formatThaiDate(today);
  const fiscalYear = new Intl.DateTimeFormat('th-TH', { year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date());
  const isConnected = apiHealth.reachable && apiHealth.status === 'ok';

  return (
    <AppShell currentUser={currentUser} currentPage="แดชบอร์ดหน่วยงาน">
      <section className="dashboard-page" aria-labelledby="dashboard-title">
        <div className="dashboard-page-heading">
          <div>
            <p className="dashboard-eyebrow">ภาพรวมหน่วยงาน · {monthLabel}</p>
            <h1 id="dashboard-title">แดชบอร์ด</h1>
            <p>สรุปกำลังคนและการลาของ {tenant?.name ?? 'หน่วยงานที่เลือก'}</p>
          </div>
          <div className="date-chip"><Icon name="calendar" size={16} /> {todayLabel}</div>
        </div>

        <section className="dashboard-metric-grid" aria-label="สรุปข้อมูลหน่วยงาน">
          <MetricCard icon="users" label="พนักงานทั้งหมด" value={employeeCount ?? '—'} unit="คน" note={employeeCount === null ? 'ยังไม่เชื่อมข้อมูลบุคลากร' : `${positions.length} ประเภทตำแหน่ง`} tone="blue" />
          <MetricCard icon="calendar" label="ปฏิบัติงานวันนี้" value="—" unit="คน" note="ยังไม่เชื่อมข้อมูลการปฏิบัติงาน" tone="cyan" />
          <MetricCard icon="clipboard" label="ลาวันนี้" value={leaveRequests ? effectiveToday.length : '—'} unit="คน" note={leaveRequests ? (effectiveToday.length > 0 ? 'มีพนักงานลา' : 'ไม่มีพนักงานลา') : 'ยังไม่เชื่อมข้อมูลการลา'} tone="orange" />
          <MetricCard icon="briefcase" label="ไปราชการวันนี้" value="—" unit="คน" note="ยังไม่เปิดโมดูลไปราชการ" tone="purple" />
        </section>

        <section className="dashboard-panel finance-panel">
          <PanelHeader title={`สรุปการเงิน · ปีงบประมาณ ${fiscalYear}`} description="รายรับ–รายจ่ายจริงสะสมของหน่วยงาน" href="/coming-soon?module=finance-monthly" />
          <div className="finance-cards">
            <div><span className="finance-label finance-income"><Icon name="arrow-right" size={14} /> รายรับจริง</span><strong>—</strong><small>บาท</small></div>
            <div><span className="finance-label finance-expense"><Icon name="arrow-right" size={14} /> รายจ่ายจริง</span><strong>—</strong><small>บาท</small></div>
            <div><span className="finance-label finance-balance"><Icon name="wallet" size={14} /> สุทธิ รับ−จ่าย</span><strong>—</strong><small>บาท</small></div>
          </div>
          <div className="finance-progress-label"><span>ใช้จ่ายเทียบแผน</span><strong>ยังไม่เชื่อม</strong></div>
          <div className="finance-progress"><span /></div>
        </section>

        <div className="dashboard-two-column">
          <section className="dashboard-panel position-panel">
            <PanelHeader title="พนักงานแยกตามตำแหน่ง" description={`รวม ${employeeCount ?? '—'} คน`} />
            <div className="position-legend"><span><i className="legend-blue" /> ข้าราชการ</span><span><i className="legend-cyan" /> พกส.</span><span><i className="legend-orange" /> ลูกจ้างชั่วคราว</span></div>
            {positions.length > 0 ? (
              <div className="position-list">
                {positions.map((position) => (
                  <div className="position-row" key={position.name}>
                    <div><strong>{position.name}</strong><span>{position.count} · {position.percentage}%</span></div>
                    <div className="position-bar"><span style={{ width: `${position.percentage}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyDashboardState icon="users" title="ยังไม่มีข้อมูลตำแหน่ง" description="ข้อมูลจะแสดงเมื่อเชื่อม master data บุคลากร" />
            )}
          </section>
          <StatusPanel employeeCount={employeeCount} leaveToday={effectiveToday.length} />
        </div>

        <StaffingPanel />

        <div className="dashboard-three-column">
          <section className="dashboard-panel dashboard-list-panel">
            <PanelHeader title="เวรวันนี้" description="พนักงานปฏิบัติเวร 0 คน" />
            <EmptyDashboardState icon="calendar" title="ยังไม่มีเวรสำหรับวันนี้" description="ตารางเวรจะแสดงเมื่อเปิดใช้งานโมดูลการปฏิบัติงาน" />
          </section>
          <section className="dashboard-panel dashboard-list-panel">
            <PanelHeader title="พนักงานที่ลาวันนี้" description={`${effectiveToday.length} คนไม่ได้ปฏิบัติงานในวันนี้`} />
            {effectiveToday.length > 0 ? (
              <div className="dashboard-person-list">{effectiveToday.map((request) => <div className="dashboard-person-row" key={request.id}><span className="person-avatar">{request.employeeDisplayName.slice(0, 1)}</span><span><strong>{request.employeeDisplayName}</strong><small>{request.leaveType.name}</small></span></div>)}</div>
            ) : (
              <EmptyDashboardState icon="clipboard" title="ไม่มีพนักงานลาในวันนี้" description={leaveRequests ? 'ไม่พบใบลาที่มีผลในวันนี้' : 'ข้อมูลจะแสดงเมื่อเชื่อมข้อมูลการลา'} />
            )}
          </section>
          <section className="dashboard-panel dashboard-list-panel">
            <PanelHeader title="ไปราชการวันนี้" description="0 คนปฏิบัติราชการนอกหน่วยงาน" />
            <EmptyDashboardState icon="briefcase" title="ยังไม่มีข้อมูลไปราชการ" description="โมดูลไปราชการจะเพิ่มในระยะถัดไป" />
          </section>
        </div>

        <footer className="dashboard-status-bar">
          <span className={`status-dot ${isConnected ? 'connected' : ''}`} />
          {isConnected ? 'เชื่อมต่อ One Data API แล้ว' : 'กำลังรอ One Data API'}
          <span>•</span>
          <span>Target UI Preview</span>
          {pendingLeaves !== null ? <><span>•</span><span>ใบลารอผล {pendingLeaves} รายการ</span></> : null}
        </footer>
      </section>
    </AppShell>
  );
}
