import { cookies } from 'next/headers';
import { AppShell } from '../../components/app-shell';
import { Icon } from '../../components/icons';
import { getCurrentUser } from '../../lib/api';

const moduleLabels: Record<string, string> = {
  'annual-plan': 'แผนเบิกประจำปี',
  employees: 'พนักงาน',
  finance: 'แผนการใช้จ่ายเงินบำรุง',
  'finance-monthly': 'สรุปรายการรับ-จ่าย',
  holidays: 'วันหยุด',
  reports: 'เอกสาร',
  'stock-in': 'นำเข้าวัสดุ',
  'stock-out': 'เบิกวัสดุ',
  stores: 'ร้านค้า/บริษัท',
  supplies: 'คลังวัสดุ',
  schedule: 'ตารางเวร',
  'durable-assets': 'ทะเบียนครุภัณฑ์',
  'tenant-settings': 'ตั้งค่าหน่วยงาน',
};

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string | string[] }>;
}) {
  const currentUser = await getCurrentUser((await cookies()).toString());
  const moduleKey = queryValue((await searchParams).module);
  const label = moduleLabels[moduleKey] ?? 'โมดูลใหม่';

  return (
    <AppShell currentUser={currentUser} currentPage={label}>
      <section className="module-page module-coming-soon" aria-labelledby="coming-soon-title">
        <div className="coming-soon-card">
          <span className="coming-soon-icon"><Icon name="archive" size={28} /></span>
          <p className="dashboard-eyebrow">ONE DATA MODULE</p>
          <h1 id="coming-soon-title">{label}</h1>
          <p>โครงสร้างหน้าจอพร้อมสำหรับการต่อยอด แต่โมดูลนี้ยังไม่เปิดใช้งานใน target รุ่นปัจจุบัน</p>
          <span className="preview-badge"><span /> FRONTEND PREVIEW</span>
        </div>
      </section>
    </AppShell>
  );
}
