'use client';

import { useTheme } from 'next-themes';

import { type Locale, useI18n } from '@/lib/i18n';
import { saveUserPreferences } from '@/lib/userPreferences';

import { SegmentButton, SectionHeader, SettingRow } from './settingsShared';

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
type ThemeOption = (typeof THEME_OPTIONS)[number];

const LOCALE_OPTIONS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'settings.languageEn' },
  { id: 'uk', labelKey: 'settings.languageUk' },
];

const THEME_LABEL_KEYS: Record<ThemeOption, string> = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
};

export function SettingsAppearanceTab() {
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <SectionHeader title={t('settings.sectionAppearance')} />
      <div className="space-y-5">
        <SettingRow label={t('settings.theme')} description={t('settings.themeDescription')}>
          <div className="flex gap-1.5">
            {THEME_OPTIONS.map((value) => (
              <SegmentButton
                key={value}
                active={theme === value}
                onClick={() => {
                  setTheme(value);
                  void saveUserPreferences({ theme: value });
                }}
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
                onClick={() => {
                  setLocale(id);
                  void saveUserPreferences({ locale: id });
                }}
              >
                {t(labelKey)}
              </SegmentButton>
            ))}
          </div>
        </SettingRow>
      </div>
    </section>
  );
}
