'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BookOpen, Flame } from 'lucide-react';

import { ActivityBar } from '@/components/ActivityBar/ActivityBar';
import { SettingsDialog } from '@/components/SettingsDialog/SettingsDialog';
import { UserMenu } from '@/components/UserMenu/UserMenu';
import { MotivationBanner } from '@/components/Statistics/MotivationBanner';
import { useUIStore } from '@/lib/uiStore';
import { useStatsStore } from '@/lib/statsStore';
import type { SummaryData } from '@/components/Statistics/types';

/** Routes where the ActivityBar (main nav) should NOT appear. */
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) return true;
  if (pathname.startsWith('/p/')) return true; // Public shared page view
  return false;
}

/**
 * AppShell wraps all authenticated pages with:
 *   - A global top header (logo + streak pill + UserMenu)
 *   - The ActivityBar on the left
 *   - The MotivationBanner shown once per session
 *   - The SettingsDialog (available on all routes)
 *
 * Public routes (login, register, shared pages) render children without the shell.
 */
export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { settingsDialogOpen, openSettings, closeSettings } = useUIStore();
  const { status } = useSession();
  const { enabled: statisticsEnabled } = useStatsStore();
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // Fetch summary once per mount (used for streak pill + motivation banner)
  useEffect(() => {
    if (status !== 'authenticated' || !statisticsEnabled) {
      setSummary(null);
      return;
    }
    fetch('/api/stats/summary')
      .then((r) => (r.ok ? (r.json() as Promise<SummaryData>) : null))
      .then((d) => d && setSummary(d))
      .catch(() => {});
  }, [status, statisticsEnabled]);

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ── Global header ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm md:px-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          <span className="hidden select-none text-sm font-bold tracking-tight text-foreground sm:block">
            Learning Tree
          </span>
        </div>
        <div className="flex items-center gap-3">
          {statisticsEnabled && summary && summary.streakCurrent > 0 && (
            <div
              className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-400"
              title={`${summary.streakCurrent}-day streak`}
            >
              <Flame className="h-3.5 w-3.5" aria-hidden />
              <span>{summary.streakCurrent}d</span>
            </div>
          )}
          <UserMenu onOpenSettings={openSettings} />
        </div>
      </header>

      {/* ── Body: ActivityBar + page content ── */}
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Motivation banner — shown once per session (on any page) */}
          <MotivationBanner data={summary} />
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </div>

      {/* Global SettingsDialog — available on all authenticated routes */}
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={(v) => (v ? openSettings() : closeSettings())}
      />
    </div>
  );
}

