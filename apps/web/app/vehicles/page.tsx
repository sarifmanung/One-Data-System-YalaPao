import { cookies } from 'next/headers';
import { AppShell } from '../../components/app-shell';
import { Icon } from '../../components/icons';
import { getCurrentUser } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function VehiclesPage() {
  const currentUser = await getCurrentUser((await cookies()).toString());

  return (
    <AppShell currentUser={currentUser} currentPage="ทะเบียนยานพาหนะ">
      <section className="module-page" aria-labelledby="vehicles-title">
        <div className="module-page-heading">
          <div>
            <p className="dashboard-eyebrow">งานพาหนะ · ทะเบียนกลาง</p>
            <h1 id="vehicles-title">ทะเบียนยานพาหนะ</h1>
            <p>จัดการข้อมูลรถและติดตามสถานะยานพาหนะของหน่วยงาน</p>
          </div>
          <span className="preview-badge"><span /> FRONTEND PREVIEW</span>
        </div>

        <div className="module-toolbar">
          <label className="search-field">
            <Icon name="grid" size={17} />
            <input type="search" placeholder="ค้นหาทะเบียนรถ หรือยี่ห้อรถ" aria-label="ค้นหาทะเบียนรถ" />
          </label>
          <button className="primary-button" type="button" disabled title="ยังไม่เชื่อม backend">
            <Icon name="car" size={17} /> เพิ่มยานพาหนะ
          </button>
        </div>

        <section className="module-summary-grid" aria-label="สรุปยานพาหนะ">
          <article className="module-summary-card"><span className="summary-icon blue"><Icon name="car" size={18} /></span><div><small>รถทั้งหมด</small><strong>—</strong></div></article>
          <article className="module-summary-card"><span className="summary-icon green"><Icon name="grid" size={18} /></span><div><small>พร้อมใช้งาน</small><strong>—</strong></div></article>
          <article className="module-summary-card"><span className="summary-icon orange"><Icon name="clipboard" size={18} /></span><div><small>ออกปฏิบัติงาน</small><strong>—</strong></div></article>
          <article className="module-summary-card"><span className="summary-icon purple"><Icon name="settings" size={18} /></span><div><small>ซ่อมบำรุง</small><strong>—</strong></div></article>
        </section>

        <section className="dashboard-panel module-table-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>รายการยานพาหนะ</h2>
              <p>ทะเบียนรถที่อยู่ในความรับผิดชอบของหน่วยงาน</p>
            </div>
            <span className="request-count">0 รายการ</span>
          </div>
          <div className="module-table-wrap">
            <table className="module-table">
              <thead><tr><th>ทะเบียนรถ</th><th>ประเภทรถ</th><th>ยี่ห้อ/รุ่น</th><th>สถานะ</th><th>ผู้รับผิดชอบ</th><th /></tr></thead>
              <tbody><tr><td colSpan={6}><div className="dashboard-empty-state"><span className="dashboard-empty-icon"><Icon name="car" size={22} /></span><strong>ยังไม่มีข้อมูลยานพาหนะ</strong><span>หน้านี้เตรียมไว้สำหรับเชื่อมระบบจองรถในระยะถัดไป</span></div></td></tr></tbody>
            </table>
          </div>
        </section>

        <footer className="dashboard-status-bar"><span className="status-dot connected" /> One Data UI Preview <span>•</span> Backend ของระบบยานพาหนะยังไม่เชื่อม</footer>
      </section>
    </AppShell>
  );
}
