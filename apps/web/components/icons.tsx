import type { ReactNode } from 'react';

export type IconName =
  | 'archive'
  | 'arrow-right'
  | 'briefcase'
  | 'calendar'
  | 'car'
  | 'chevron-down'
  | 'clipboard'
  | 'download'
  | 'file'
  | 'grid'
  | 'help'
  | 'hospital'
  | 'menu'
  | 'moon'
  | 'package'
  | 'settings'
  | 'sun'
  | 'upload'
  | 'user'
  | 'users'
  | 'wallet'
  | 'x';

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

const paths: Record<IconName, ReactNode> = {
  archive: <path d="M4 5.5h16M5.5 5.5v13h13v-13M8 9h8M8 13h6" />,
  'arrow-right': <path d="M4 12h15m-6-6 6 6-6 6" />,
  briefcase: <path d="M5 7.5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Zm4-3h6l1 3H8l1-3Zm-5 7h16m-9 0v2h2v-2" />,
  calendar: <path d="M6 4v3m12-3v3M4.5 8h15M5 5.5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />,
  car: <path d="m5 16 1.2-5.2A2 2 0 0 1 8.1 9.3h7.8a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4v-3Zm2 3v1m12-1v1M7.5 13h9" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  clipboard: <path d="M8 5h8v3H8V5Zm-2 1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1M8 12h8M8 16h5" />,
  download: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />,
  file: <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Zm8 0V8h4M9 12h6m-6 4h5" />,
  grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
  help: <path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.8c-.9.9-1.8 1.2-1.8 2.7M12 17h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
  hospital: <path d="M12 3 4.5 6v12.5h15V6L12 3Zm-2 5h4m-2-2v4m-3 8v-3a3 3 0 0 1 6 0v3M7 12h.01M17 12h.01" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: <path d="M19.5 15.5A7.5 7.5 0 0 1 8.5 4.5 7.5 7.5 0 1 0 19.5 15.5Z" />,
  package: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9M8 5.3l8 4.5" />,
  settings: <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m9-8h-2m-14 0H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6" />,
  sun: <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 0 1.4 1.4M4.9 4.9l1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
  upload: <path d="M12 16V5m0 0L8 9m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  users: <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-6a3 3 0 0 1 0 6m2 9v-1a4 4 0 0 0-3-3.9" />,
  wallet: <path d="M4 6.5h15a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12m3 8h-4a2 2 0 1 0 0 4h4" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

export function Icon({ name, size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="ui-icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
        {paths[name]}
      </g>
    </svg>
  );
}
