import type { Metadata } from 'next';
import { Literata, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const literata = Literata({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LOW — Жизнь сайтов',
  description: 'Self-hosted журнал жизненного цикла сайтов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${literata.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans text-ink-50 antialiased">{children}</body>
    </html>
  );
}
