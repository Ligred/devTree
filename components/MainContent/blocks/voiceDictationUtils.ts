import type { Locale } from '@/lib/i18n';

export const DICTATION_LANGUAGE_CODES: Readonly<Record<Locale, string>> = {
  en: 'en-US',
  uk: 'uk-UA',
};

export function isChromeBasedBrowser(): boolean {
  if (globalThis.window === undefined) return true;

  const userAgent = navigator.userAgent;
  const isChromeFamily = /Chrome|Chromium|CriOS/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  const isOpera = /OPR/.test(userAgent);

  return isChromeFamily && !isEdge && !isOpera;
}

export function getSpeechRecognitionApi(): typeof SpeechRecognition | null {
  if (globalThis.window === undefined) return null;

  return (
    (globalThis as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
    || (globalThis as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    || null
  );
}