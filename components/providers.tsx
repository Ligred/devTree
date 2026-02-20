'use client';

import { useEffect, useRef } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { useTheme, ThemeProvider as NextThemesProvider } from 'next-themes';

import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/settingsStore';
import { loadUserPreferences } from '@/lib/userPreferences';
import { ConfirmationProvider } from '@/lib/confirmationContext';
import { RecordingIndicator } from './RecordingIndicator';

/**
 * When the user is logged in, fetch their saved preferences from the API and
 * apply theme, locale, and feature flags so settings follow them across devices.
 * Runs once per session. Applying locale via setLocale also persists it to the
 * cookie, so the next full page refresh will use the same language.
 */
function SyncUserPreferences() {
  const { data: session, status } = useSession();
  const { setTheme } = useTheme();
  const { setLocale } = useI18n();
  const { setTagsPerPage, setTagsPerBlock } = useSettingsStore();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user || appliedRef.current) return;
    appliedRef.current = true;
    loadUserPreferences().then((prefs) => {
      if (!prefs) return;
      if (prefs.theme) setTheme(prefs.theme);
      if (prefs.locale) setLocale(prefs.locale);
      if (typeof prefs.tagsPerPageEnabled === 'boolean') setTagsPerPage(prefs.tagsPerPageEnabled);
      if (typeof prefs.tagsPerBlockEnabled === 'boolean') setTagsPerBlock(prefs.tagsPerBlockEnabled);
    });
  }, [status, session?.user, setTheme, setLocale, setTagsPerPage, setTagsPerBlock]);

  return null;
}

export function Providers({
  children,
  initialLocale = 'en',
}: Readonly<{ children: React.ReactNode; initialLocale?: Locale }>) {
  return (
    <SessionProvider>
      <ConfirmationProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={initialLocale}>
            <SyncUserPreferences />
            {children}
            <RecordingIndicator />
          </I18nProvider>
        </NextThemesProvider>
      </ConfirmationProvider>
    </SessionProvider>
  );
}
