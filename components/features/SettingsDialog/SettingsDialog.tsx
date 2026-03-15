'use client';

import { useState } from 'react';

import { BarChart2, MapPinned, Palette, SlidersHorizontal, User } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { playUiSound } from '@/lib/stores/uiSoundEffects';
import { cn } from '@/lib/utils';

import { SettingsAccountTab } from './SettingsAccountTab';
import { SettingsAppearanceTab } from './SettingsAppearanceTab';
import { SettingsDiaryTab } from './SettingsDiaryTab';
import { SettingsFeaturesTab } from './SettingsFeaturesTab';
import { SettingsStatisticsTab } from './SettingsStatisticsTab';

type SettingsTab = 'account' | 'appearance' | 'features' | 'diary' | 'statistics';

type SettingsDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const tabs: { id: SettingsTab; labelKey: string; icon: React.ReactNode }[] = [
    { id: 'account', labelKey: 'settings.sectionAccount', icon: <User size={18} /> },
    { id: 'appearance', labelKey: 'settings.sectionAppearance', icon: <Palette size={18} /> },
    { id: 'features', labelKey: 'settings.sectionFeatures', icon: <SlidersHorizontal size={18} /> },
    { id: 'diary', labelKey: 'settings.sectionDiary', icon: <MapPinned size={18} /> },
    { id: 'statistics', labelKey: 'settings.sectionStatistics', icon: <BarChart2 size={18} /> },
  ];

  const handleDialogOpenChange = (nextOpen: boolean) => {
    playUiSound(nextOpen ? 'open' : 'close');
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          'h-dvh max-h-none w-[calc(100vw-1rem)] max-w-full',
          'sm:h-[85vh] sm:max-h-180 sm:w-full sm:max-w-2xl',
        )}
      >
        <DialogHeader className="border-border shrink-0 border-b px-4 py-3 pr-12 sm:px-6 sm:py-4">
          <DialogTitle className="text-base font-semibold sm:text-lg">
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            className={cn(
              'border-border bg-muted/30 flex shrink-0 flex-row gap-0 overflow-x-auto overflow-y-hidden border-b py-2 [scrollbar-width:none] sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:py-2',
              'w-full sm:w-44',
            )}
            style={{ WebkitOverflowScrolling: 'touch' }}
            aria-label={t('settings.title')}
          >
            {tabs.map(({ id, labelKey, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-label={t(labelKey)}
                className={cn(
                  'motion-interactive flex shrink-0 items-center justify-center gap-2 px-3 py-2.5 text-center text-sm font-medium whitespace-nowrap transition-colors sm:flex-initial sm:justify-start sm:px-4 sm:text-left',
                  activeTab === id
                    ? 'bg-background text-foreground border-b-2 border-indigo-600 sm:border-r-2 sm:border-b-0 dark:border-indigo-400'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'shrink-0',
                    activeTab === id ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {icon}
                </span>
                <span className="sr-only sm:not-sr-only sm:inline">{t(labelKey)}</span>
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            {activeTab === 'account' && <SettingsAccountTab open={open} />}
            {activeTab === 'appearance' && <SettingsAppearanceTab />}
            {activeTab === 'features' && <SettingsFeaturesTab />}
            {activeTab === 'statistics' && <SettingsStatisticsTab />}
            {activeTab === 'diary' && <SettingsDiaryTab open={open} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
