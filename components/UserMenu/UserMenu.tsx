'use client';

/**
 * UserMenu — the user avatar button and its dropdown.
 *
 * The dropdown provides quick access to the most commonly adjusted settings
 * (theme, language) without opening the full settings dialog, as well as a
 * link to the full settings panel. This follows the pattern used by apps like
 * Notion, Linear, and GitHub where the user menu doubles as a quick-settings
 * panel.
 *
 * ─── LAYOUT ───────────────────────────────────────────────────────────────────
 *
 * ┌─────────────────────────────────┐
 * │  [LT]  Learning Tree            │  ← User info header (gradient avatar)
 * │        Personal workspace       │
 * ├─────────────────────────────────┤
 * │  Theme    [Light] [Dark] [Sys]  │  ← Inline segment controls
 * ├─────────────────────────────────┤
 * │  Language   [EN]  [UK]          │
 * ├─────────────────────────────────┤
 * │  ⚙  Settings                    │  ← Opens full SettingsDialog
 * └─────────────────────────────────┘
 *
 * ─── WHY RADIX DROPDOWN MENU? ────────────────────────────────────────────────
 *
 * Radix DropdownMenu provides focus trapping, keyboard navigation (arrow keys,
 * Escape), and correct ARIA roles out of the box. Implementing these correctly
 * with a plain <div> would require significant effort and is error-prone.
 *
 * The `modal={false}` option keeps the page interactive while the menu is open,
 * which is the correct behaviour for a persistent-sidebar layout where users
 * may want to scroll the tree while the menu is open.
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import { useI18n, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type UserMenuProps = Readonly<{
  onOpenSettings: () => void;
}>;

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
type ThemeOption = (typeof THEME_OPTIONS)[number];

const LOCALE_OPTIONS: { id: Locale; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'uk', label: 'UK' },
];

// Map theme value to a short display label
const THEME_SHORT: Record<ThemeOption, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto',
};

// ─── Inline segment button (used inside the dropdown) ─────────────────────────

function InlineSegment({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // Prevent DropdownMenu from interpreting clicks inside as item selections
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-indigo-600 text-white dark:bg-indigo-500'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  // Close menu when the user scrolls anywhere on the page
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    globalThis.addEventListener('scroll', close, { capture: true, passive: true });
    return () => globalThis.removeEventListener('scroll', close, { capture: true });
  }, [open]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      {/**
       * Avatar trigger button — gradient circle with "LT" initials.
       *
       * WHY initials instead of a photo?
       *   The app currently has no user authentication that provides a profile
       *   photo. Initials with a branded gradient are a common placeholder
       *   (used by Google, Notion, Linear) and look polished without requiring
       *   an image asset or upload feature.
       *
       * IMPROVEMENT: Replace with an <Image> when user profiles are added.
       */}
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('userMenu.label')}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            'bg-linear-to-br from-indigo-500 to-violet-600',
            'text-xs font-bold text-white shadow-sm',
            'transition-shadow hover:shadow-md',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            open && 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-background',
          )}
        >
          LT
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-xl',
            'text-popover-foreground',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
          sideOffset={8}
          align="end"
        >

          {/* ── User info header ──────────────────────────────────────── */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              LT
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {t('userMenu.userName')}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t('userMenu.workspace')}
              </p>
            </div>
          </div>

          {/* ── Theme ────────────────────────────────────────────────── */}
          <div className="border-b border-border/60 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t('settings.theme')}
            </p>
            <div className="flex gap-1 rounded-md bg-muted/50 p-0.5">
              {THEME_OPTIONS.map((value) => (
                <InlineSegment
                  key={value}
                  active={theme === value}
                  onClick={() => setTheme(value)}
                >
                  {THEME_SHORT[value]}
                </InlineSegment>
              ))}
            </div>
          </div>

          {/* ── Language ─────────────────────────────────────────────── */}
          <div className="border-b border-border/60 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t('settings.language')}
            </p>
            <div className="flex gap-1 rounded-md bg-muted/50 p-0.5">
              {LOCALE_OPTIONS.map(({ id, label }) => (
                <InlineSegment
                  key={id}
                  active={locale === id}
                  onClick={() => setLocale(id)}
                >
                  {label}
                </InlineSegment>
              ))}
            </div>
          </div>

          {/* ── Settings link ─────────────────────────────────────────── */}
          <div className="p-1">
            <DropdownMenu.Item
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5',
                'text-sm text-foreground outline-none transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:bg-accent focus:text-accent-foreground',
              )}
              onSelect={(e) => {
                e.preventDefault();
                setOpen(false);
                onOpenSettings();
              }}
            >
              <Settings size={14} className="shrink-0 text-muted-foreground" />
              <span>{t('userMenu.settings')}</span>
            </DropdownMenu.Item>
          </div>

        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
