'use client';

import { useTheme } from 'next-themes';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useI18n, type Locale } from '@/lib/i18n';

type SettingsDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
const LOCALE_OPTIONS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'settings.languageEn' },
  { id: 'uk', labelKey: 'settings.languageUk' },
];

const THEME_LABEL_KEYS: Record<typeof THEME_OPTIONS[number], string> = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
};

function OptionButton({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card',
        active
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-400'
          : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              {t('settings.theme')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((value) => (
                <OptionButton
                  key={value}
                  active={theme === value}
                  onClick={() => setTheme(value)}
                >
                  {t(THEME_LABEL_KEYS[value])}
                </OptionButton>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              {t('settings.language')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {LOCALE_OPTIONS.map(({ id, labelKey }) => (
                <OptionButton
                  key={id}
                  active={locale === id}
                  onClick={() => setLocale(id)}
                >
                  {t(labelKey)}
                </OptionButton>
              ))}
            </div>
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}
