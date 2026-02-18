'use client';

/**
 * i18n.tsx — lightweight internationalisation (i18n) system.
 *
 * ─── WHY A CUSTOM IMPLEMENTATION? ────────────────────────────────────────────
 *
 * Production-grade libraries like `next-intl` or `react-i18next` are excellent
 * but add significant bundle size and configuration complexity. For a learning
 * project with two locales and a small key set, a custom implementation:
 *   - Keeps bundle size minimal (~1 KB vs ~30 KB for i18next).
 *   - Is fully transparent — you can read every line of the i18n logic here.
 *   - Avoids complex RSC/SSR locale routing (locale lives purely in the browser).
 *
 * IMPROVEMENT: Migrate to `next-intl` when you need:
 *   - Server-side rendering with locale-aware content.
 *   - URL-based locale routing (/en/..., /uk/...).
 *   - Pluralisation rules, number/date formatting, or RTL support.
 *
 * ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
 *
 * 1. Message files (`messages/en.json`, `messages/uk.json`) hold flat key→value
 *    maps.  Keys use dot notation as a naming convention (e.g. 'sidebar.show').
 *
 * 2. `I18nProvider` wraps the app, holds the active locale in React state, and
 *    exposes { locale, setLocale, t } via React Context.
 *
 * 3. `t(key, params?)` looks up the key in the active locale, falls back to
 *    English if missing, then interpolates `{{placeholders}}` with `params`.
 *
 * 4. The selected locale is persisted to `localStorage` so it survives page
 *    refreshes.  To avoid a hydration mismatch (server renders 'en', client
 *    reads a different locale from localStorage), we initialise state to 'en'
 *    and synchronise from localStorage in a `useEffect` (runs client-only).
 *
 * ─── TEMPLATE SUBSTITUTION ────────────────────────────────────────────────────
 *
 * Parameters use `{{name}}` syntax (double curly braces, same as Handlebars /
 * Mustache). Example:
 *
 *   // messages/en.json
 *   "delete.folderDescription": "\"{{name}}\" contains {{count}} item(s)."
 *
 *   // Usage
 *   t('delete.folderDescription', { name: 'Notes', count: 5 })
 *   → '"Notes" contains 5 item(s).'
 *
 * WHY regex-based substitution instead of template literals?
 *   Template literals evaluate at definition time, but translation strings are
 *   loaded from JSON at runtime. We need to substitute placeholders dynamically
 *   after fetching the raw string.
 *
 * ─── IMPROVEMENT IDEAS ────────────────────────────────────────────────────────
 *   - Add a `missingKeyWarning` in development (console.warn) to catch typos.
 *   - Support pluralisation: t('item', { count: 3 }) → "3 items".
 *   - Auto-detect locale from the browser's navigator.language.
 *   - Add a third locale (e.g. Polish 'pl') — only requires a new messages file
 *     and adding 'pl' to the Locale union type.
 */

import React, { useCallback, useMemo, useState } from 'react';

// Relative path so Vitest resolves JSON without special config;
// Next.js resolves this too via its built-in JSON import support.
import en from '../messages/en.json';
import uk from '../messages/uk.json';

export type Locale = 'en' | 'uk';

/**
 * All messages keyed by locale.
 *
 * WHY `as Record<string, string>`?
 *   TypeScript infers JSON imports as literal types (exact key/value pairs).
 *   The `t()` function does a dynamic key lookup, which requires a plain
 *   `Record<string, string>` index signature. The cast is safe because all
 *   JSON values are strings.
 */
const messages: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  uk: uk as Record<string, string>,
};

const LOCALE_STORAGE_KEY = 'devtree-locale';

/**
 * Read the persisted locale from localStorage.
 *
 * WHY check `typeof window === 'undefined'`?
 *   This function is called during the `useEffect` (client only), so the check
 *   is technically redundant. It is kept as a guard against accidental server-
 *   side calls and to make the function self-documenting.
 */
function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'en' || stored === 'uk') return stored;
  return 'en';
}

/** The value exposed by the I18n context to every consumer. */
type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /**
   * Translate a key to the current locale string, interpolating `params`.
   *
   * Fallback chain:  current locale  →  English  →  raw key (never undefined).
   */
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

/**
 * I18nProvider — must wrap the component tree above any component that calls useI18n.
 *
 * Placed in `app/Providers.tsx` so it covers the entire application.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  /**
   * Initialise to 'en' to match server rendering.
   *
   * WHY not read localStorage here directly?
   *   State initialisers run on the server during SSR. localStorage doesn't
   *   exist on the server, so reading it here would throw. The useEffect below
   *   syncs the value client-side after hydration, which is the safe pattern.
   */
  const [locale, setLocaleState] = useState<Locale>('en');

  /** Persist locale change to localStorage and update React state. */
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  /**
   * Sync locale from localStorage after first render.
   *
   * This runs once, client-side only. The empty dependency array ensures it
   * doesn't re-run. Because this is a useEffect, it fires after React has
   * committed the initial render and hydration is complete — avoiding any
   * server/client HTML mismatch.
   */
  React.useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  /**
   * Translate a key with optional parameter interpolation.
   *
   * Algorithm:
   *   1. Look up `key` in the current locale's message map.
   *   2. Fall back to English if not found (handles missing translations).
   *   3. Fall back to the raw key if not found in English (prevents crashes on typos).
   *   4. Replace all `{{paramName}}` occurrences with the corresponding value.
   *
   * WHY useCallback with [locale] dependency?
   *   The `t` function captures `locale` via closure. When the locale changes,
   *   a new `t` function is created. Components that call `t` will then re-render
   *   with the new translations because `t` is part of the context value.
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Fallback chain: current locale → English → raw key
      const raw = messages[locale][key] ?? messages.en[key] ?? key;
      if (!params) return raw;
      // Replace each {{placeholder}} with its value
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
        raw,
      );
    },
    [locale],
  );

  /**
   * Memoize the context value so consumers only re-render when locale changes.
   *
   * WHY useMemo?
   *   Without it, every render of I18nProvider creates a new context object,
   *   causing every consumer to re-render — even if the locale hasn't changed.
   *   useMemo ensures referential stability when locale, setLocale, and t are
   *   all unchanged.
   */
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * useI18n — access translations in any client component.
 *
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   return <button>{t('main.save')}</button>;
 *
 * WHY throw instead of returning a default?
 *   Failing loudly surfaces the error immediately during development rather
 *   than silently rendering untranslated keys in production.
 */
export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
