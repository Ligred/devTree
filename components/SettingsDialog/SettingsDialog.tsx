'use client';

/**
 * SettingsDialog — application preferences panel.
 *
 * Divided into two sections:
 *   1. Appearance  — theme (light / dark / system) and language.
 *   2. Features    — feature-flag toggles (tags per page, tags per block).
 *
 * ─── STATE MANAGEMENT ─────────────────────────────────────────────────────────
 *
 * Theme and language are delegated to their existing owners:
 *   - `useTheme()`  from next-themes  → persists to localStorage['theme']
 *   - `useI18n()`   from lib/i18n     → persists to localStorage['language']
 *
 * Feature flags are owned by the Zustand settings store (`lib/settingsStore`),
 * which persists to localStorage['learning-tree-settings'].
 *
 * This clean separation avoids creating duplicate sources of truth. Each piece
 * of state has exactly one owner; this component just wires the UI to them.
 *
 * ─── WHY TOGGLE SWITCHES INSTEAD OF BUTTONS FOR FEATURES? ───────────────────
 *
 * The theme/language options are mutually exclusive (radio-button semantics),
 * so button groups with a visual "active" state communicate selection clearly.
 * Feature flags are on/off and independent of each other, which maps naturally
 * to the toggle switch (ARIA role="switch") pattern.
 */

import { useTheme } from 'next-themes';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/Switch';
import { useI18n, type Locale } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/settingsStore';
import { cn } from '@/lib/utils';

type SettingsDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
type ThemeOption = (typeof THEME_OPTIONS)[number];

const LOCALE_OPTIONS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'settings.languageEn' },
  { id: 'uk', labelKey: 'settings.languageUk' },
];

const THEME_LABEL_KEYS: Record<ThemeOption, string> = {
  light: 'settings.themeLight',
  dark:  'settings.themeDark',
  system: 'settings.themeSystem',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SegmentButton({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-sm font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-600'
          : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

/** A single row showing a label+description on the left and a control on the right. */
function SettingRow({
  label,
  description,
  children,
}: Readonly<{ label: string; description?: string; children: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Section header with title */
function SectionHeader({ title }: Readonly<{ title: string }>) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
      {title}
    </h3>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { tagsPerPageEnabled, tagsPerBlockEnabled, setTagsPerPage, setTagsPerBlock } =
    useSettingsStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('settings.title')}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-0 divide-y divide-border">

          {/* ── Appearance ─────────────────────────────────────────────── */}
          <section className="py-5">
            <SectionHeader title={t('settings.sectionAppearance')} />
            <div className="space-y-5">

              <SettingRow
                label={t('settings.theme')}
                description={t('settings.themeDescription')}
              >
                <div className="flex gap-1.5">
                  {THEME_OPTIONS.map((value) => (
                    <SegmentButton
                      key={value}
                      active={theme === value}
                      onClick={() => setTheme(value)}
                    >
                      {t(THEME_LABEL_KEYS[value])}
                    </SegmentButton>
                  ))}
                </div>
              </SettingRow>

              <SettingRow
                label={t('settings.language')}
                description={t('settings.languageDescription')}
              >
                <div className="flex gap-1.5">
                  {LOCALE_OPTIONS.map(({ id, labelKey }) => (
                    <SegmentButton
                      key={id}
                      active={locale === id}
                      onClick={() => setLocale(id)}
                    >
                      {t(labelKey)}
                    </SegmentButton>
                  ))}
                </div>
              </SettingRow>

            </div>
          </section>

          {/* ── Features ───────────────────────────────────────────────── */}
          <section className="py-5">
            <SectionHeader title={t('settings.sectionFeatures')} />
            <div className="space-y-4">

              <SettingRow
                label={t('settings.tagsPerPage')}
                description={t('settings.tagsPerPageDescription')}
              >
                <Switch
                  checked={tagsPerPageEnabled}
                  onChange={setTagsPerPage}
                  label={t('settings.tagsPerPage')}
                />
              </SettingRow>

              <SettingRow
                label={t('settings.tagsPerBlock')}
                description={t('settings.tagsPerBlockDescription')}
              >
                <Switch
                  checked={tagsPerBlockEnabled}
                  onChange={setTagsPerBlock}
                  label={t('settings.tagsPerBlock')}
                />
              </SettingRow>

            </div>
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}
