import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'One Data',
  description: 'One Data System for Yala PAO',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
