import type { Metadata } from 'next';
import '../styles/styles.css';

export const metadata: Metadata = {
  title: 'AIMS SaaS INVOICE',
  description: 'Invoice generation process optimization',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
