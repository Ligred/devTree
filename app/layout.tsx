import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';

import { Providers } from '@/components/providers';
import type { Locale } from '@/lib/i18n';

import './globals.css';

const LOCALE_HEADER = 'x-devtree-locale';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Learning Tree',
  description: 'A structured learning workspace with notes, code, diagrams, and more.',
};

/** Ensure layout runs per-request. */
export const dynamic = 'force-dynamic';

/** Read initial locale from header set by middleware (middleware reads cookie + Accept-Language so first paint is correct). */
async function getInitialLocale(): Promise<Locale> {
  const h = await headers();
  const v = h.get(LOCALE_HEADER);
  if (v === 'uk' || v === 'en') return v;
  return 'en';
}

/**
 * Run before React: if user's saved locale in localStorage is not reflected in the cookie,
 * set the cookie and reload once so the next request gets the correct server-rendered locale.
 * Prevents "English first, then switch" flash when the cookie was missing on this request.
 */
const localeSyncScript = `(function(){var m=document.cookie.match(/devtree-locale=([^;]+)/);var cur=m?m[1]:null;var l=localStorage.getItem('devtree-locale');if((l==='uk'||l==='en')&&cur!==l){document.cookie='devtree-locale='+l+'; path=/; max-age=31536000; SameSite=Lax';location.reload();}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getInitialLocale();

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeSyncScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
