import { cookies } from 'next/headers';
import { getApiHealth, getCurrentUser } from '../../lib/api';

const navItems = ['ภาพรวม', 'ระบบการลา', 'บุคลากร'];

export const dynamic = 'force-dynamic';

export default async function TenantDashboardPage() {
  const cookieHeader = (await cookies()).toString();
  const [apiHealth, currentUser] = await Promise.all([
    getApiHealth(),
    getCurrentUser(cookieHeader),
  ]);
  const isConnected = apiHealth.reachable && apiHealth.status === 'ok';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">One Data</div>
        <nav className="main-nav" aria-label="เมนูหลัก">
          {navItems.map((item, index) => (
            <a className={index === 0 ? 'nav-link active' : 'nav-link'} href="#" key={item}>
              {item}
            </a>
          ))}
        </nav>
        <div className="account-area">
          <div className="account-copy">
            <span className="account-name">{currentUser?.displayName ?? 'One Data Preview'}</span>
            <span className="account-role">{currentUser?.roles[0] ?? 'TARGET_STACK_PREVIEW'}</span>
          </div>
          <button className="outline-button" type="button">ออกจากระบบ</button>
        </div>
      </header>

      <section className="content" aria-labelledby="page-title">
        <div className="page-heading">
          <p className="eyebrow">TENANT DASHBOARD</p>
          <h1 id="page-title">ภาพรวมระบบ</h1>
          <p className="heading-description">
            พื้นที่ทำงานสำหรับข้อมูลบุคลากร การลา และโมดูลที่จะเชื่อมต่อในอนาคต
          </p>
        </div>

        <section className="metric-grid" aria-label="สรุปข้อมูล">
          <article className="metric-card">
            <span className="metric-label">บุคลากรในขอบเขต</span>
            <strong className="metric-value">—</strong>
            <span className="metric-note">รอเชื่อมข้อมูลจากระบบ ฉ.10/11</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">ใบลารอจัดการ</span>
            <strong className="metric-value">—</strong>
            <span className="metric-note">จะแสดงเมื่อเริ่มใช้งานโมดูลการลา</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">ใบลาที่มีผล</span>
            <strong className="metric-value">—</strong>
            <span className="metric-note">มีผลเมื่อสถานะ PAPER_APPROVED</span>
          </article>
          <article className="metric-card highlighted">
            <span className="metric-label">ลาในวันนี้</span>
            <strong className="metric-value">—</strong>
            <span className="metric-note">สรุปจากข้อมูลที่ยืนยันแล้ว</span>
          </article>
        </section>

        <div className="action-row">
          <button className="primary-button" type="button">บันทึกใบลา</button>
          <button className="outline-button" type="button">ดูรายชื่อบุคลากร</button>
        </div>

        <section className="recent-panel" aria-labelledby="recent-title">
          <div className="panel-heading">
            <div>
              <h2 id="recent-title">รายการใบลาล่าสุด</h2>
              <p>แสดงเฉพาะรายการที่มีสถานะ PAPER_APPROVED เพื่อส่งต่อให้ระบบ ฉ.10/11</p>
            </div>
            <a className="panel-link" href="#">ดูทั้งหมด <span aria-hidden="true">→</span></a>
          </div>
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">✓</div>
            <strong>ยังไม่มีรายการใบลา</strong>
            <span>ข้อมูลจะแสดงที่นี่เมื่อมีการบันทึกในระบบ</span>
          </div>
        </section>

        <footer className="status-bar">
          <span className={isConnected ? 'status-dot connected' : 'status-dot'} aria-hidden="true" />
          {isConnected ? 'เชื่อมต่อ One Data API แล้ว' : 'กำลังรอ One Data API foundation'}
          <span className="status-separator">•</span>
          สถานะระบบ: {apiHealth.status === 'ok' ? 'พร้อมพัฒนา' : 'อยู่ระหว่างเตรียมระบบ'}
        </footer>
      </section>
    </main>
  );
}
