'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { CurrentUser } from '@onedata/contracts';
import { Icon, type IconName } from './icons';

type NavigationItem = {
  label: string;
  href: string;
  icon: IconName;
  match?: string;
};

type NavigationGroup = {
  label: string;
  icon: IconName;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: 'การปฏิบัติงาน',
    icon: 'clipboard',
    items: [
      { label: 'แดชบอร์ด', href: '/tenant-dashboard', icon: 'grid' },
      { label: 'ตารางเวร', href: '/coming-soon?module=schedule', icon: 'calendar' },
      { label: 'พนักงาน', href: '/coming-soon?module=employees', icon: 'users' },
      { label: 'วันหยุด', href: '/coming-soon?module=holidays', icon: 'calendar' },
      { label: 'ลา/ไปราชการ', href: '/leave', icon: 'clipboard', match: '/leave' },
      { label: 'เอกสาร', href: '/coming-soon?module=reports', icon: 'file' },
    ],
  },
  {
    label: 'วัสดุ',
    icon: 'package',
    items: [
      { label: 'คลังวัสดุ', href: '/coming-soon?module=supplies', icon: 'package' },
      { label: 'นำเข้าวัสดุ', href: '/coming-soon?module=stock-in', icon: 'upload' },
      { label: 'เบิกวัสดุ', href: '/coming-soon?module=stock-out', icon: 'download' },
      { label: 'แผนเบิกประจำปี', href: '/coming-soon?module=annual-plan', icon: 'calendar' },
      { label: 'ร้านค้า/บริษัท', href: '/coming-soon?module=stores', icon: 'archive' },
    ],
  },
  {
    label: 'ครุภัณฑ์',
    icon: 'archive',
    items: [
      { label: 'ทะเบียนครุภัณฑ์', href: '/coming-soon?module=durable-assets', icon: 'archive' },
    ],
  },
  {
    label: 'ยานพาหนะ',
    icon: 'car',
    items: [
      { label: 'ทะเบียนยานพาหนะ', href: '/vehicles', icon: 'car', match: '/vehicles' },
    ],
  },
  {
    label: 'การเงิน',
    icon: 'wallet',
    items: [
      { label: 'แผนการใช้จ่ายเงินบำรุง', href: '/coming-soon?module=finance', icon: 'wallet' },
      { label: 'สรุปรายการรับ-จ่าย', href: '/coming-soon?module=finance-monthly', icon: 'file' },
    ],
  },
  {
    label: 'จัดการระบบ',
    icon: 'settings',
    items: [
      { label: 'ตั้งค่าหน่วยงาน', href: '/coming-soon?module=tenant-settings', icon: 'settings' },
    ],
  },
];

const defaultOpenGroups = Object.fromEntries(navigationGroups.map((group) => [group.label, true]));

function roleLabel(user: CurrentUser | null): string {
  const role = user?.roles[0];
  if (!role) return 'ต้องเข้าสู่ระบบ';
  if (role === 'DEVELOPMENT_ONLY') return 'ผู้ดูแลระบบ · ทดสอบ';
  if (role === 'pcu_director') return 'ผู้อำนวยการ รพ.สต.';
  if (role === 'pcu_staff') return 'เจ้าหน้าที่ รพ.สต.';
  if (role === 'PAPER_RESULT_RECORDER') return 'ผู้บันทึกผลเอกสาร';
  return role.replaceAll('_', ' ');
}

function initials(displayName: string): string {
  return displayName.trim().slice(0, 1) || 'U';
}

function isActivePath(pathname: string, item: NavigationItem): boolean {
  return item.match ? pathname.startsWith(item.match) : pathname === item.href;
}

export function AppShell({
  children,
  currentUser,
  currentPage,
}: {
  children: React.ReactNode;
  currentUser: CurrentUser | null;
  currentPage?: string;
}) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpenGroups);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const tenant = useMemo(
    () => currentUser?.workspaces.find((workspace) => workspace.kind === 'tenant')
      ?? currentUser?.workspaces[0],
    [currentUser],
  );
  const displayName = currentUser?.displayName ?? 'One Data Preview';
  const currentSection = currentPage ?? (pathname === '/tenant-dashboard' ? 'แดชบอร์ดหน่วยงาน' : 'One Data');

  function toggleGroup(label: string): void {
    setOpenGroups((groups) => ({ ...groups, [label]: !groups[label] }));
  }

  return (
    <div className={`app-shell ${compact ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen ? <button className="sidebar-backdrop" aria-label="ปิดเมนู" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="เมนูหลัก">
        <div className="sidebar-brand-row">
          <Link className="ods-logo" href="/tenant-dashboard" aria-label="One Data dashboard">
            <span className="ods-logo-mark">◒</span>
            <span>ODS</span>
          </Link>
          <button
            className="icon-button sidebar-toggle"
            type="button"
            aria-label={compact ? 'ขยายเมนู' : 'ย่อเมนู'}
            onClick={() => setCompact((value) => !value)}
          >
            <Icon name="menu" size={17} />
          </button>
        </div>

        <div className="organization-card">
          <div className="organization-avatar"><Icon name="hospital" size={26} /></div>
          <div className="organization-copy">
            <strong>{tenant?.name ?? 'ยังไม่เลือกหน่วยงาน'}</strong>
            <span>{tenant?.code ?? 'WORKSPACE'}</span>
          </div>
        </div>

        <nav className="sidebar-navigation">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <button className="nav-group-heading" type="button" onClick={() => toggleGroup(group.label)}>
                <span><Icon name={group.icon} size={15} /><span>{group.label}</span></span>
                <Icon name="chevron-down" size={14} />
              </button>
              {openGroups[group.label] ? (
                <div className="nav-group-items">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item);
                    return (
                      <Link
                        className={`sidebar-link ${active ? 'active' : ''}`}
                        href={item.href}
                        key={item.label}
                        aria-current={active ? 'page' : undefined}
                        title={compact ? item.label : undefined}
                      >
                        <Icon name={item.icon} size={17} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-utility" type="button"><Icon name="help" size={17} /><span>แจ้งปัญหาการใช้งาน</span></button>
          <a className="developed-by" href="https://www.gmtech.co.th/" rel="noreferrer" target="_blank">
            <span>Developed by</span><strong>GMTech</strong>
          </a>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-leading">
            <button className="icon-button mobile-menu-button" type="button" aria-label="เปิดเมนู" onClick={() => setMobileOpen(true)}>
              <Icon name="menu" size={20} />
            </button>
            <span className="topbar-title">{currentSection}</span>
          </div>
          <div className="trial-banner"><Icon name="help" size={15} /><span>ทดลองใช้งานฟรีชั่วคราว จนถึงวันที่ 30 กันยายน 2569</span></div>
          <div className="topbar-actions">
            <button className="workspace-switcher" type="button">
              <Icon name="hospital" size={16} />
              <span>{tenant?.name ?? 'เลือกหน่วยงาน'}</span>
              <Icon name="chevron-down" size={14} />
            </button>
            <button className="user-switcher" type="button">
              <span className="user-avatar">{initials(displayName)}</span>
              <span className="user-copy"><strong>{displayName}</strong><small>{roleLabel(currentUser)}</small></span>
              <Icon name="chevron-down" size={14} />
            </button>
            <button className="icon-button theme-toggle" type="button" aria-label="เปลี่ยนธีม" onClick={() => setDarkMode((value) => !value)}>
              <Icon name={darkMode ? 'sun' : 'moon'} size={18} />
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
