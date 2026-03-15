'use client';

import { Switch } from '@/components/shared/ui/Switch';
import { useI18n } from '@/lib/i18n';
import { useStatsStore } from '@/lib/stores/statsStore';
import { saveUserPreferences } from '@/lib/userPreferences';

import { SectionHeader, SettingRow } from './settingsShared';

export function SettingsStatisticsTab() {
  const { t } = useI18n();
  const {
    enabled: statisticsEnabled,
    trackSessionTime,
    trackPageTime,
    trackContentEvents,
    setEnabled: setStatisticsEnabled,
    setTrackSessionTime,
    setTrackPageTime,
    setTrackFolderTime,
    setTrackContentEvents,
  } = useStatsStore();

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <SectionHeader title={t('settings.sectionStatistics')} />
      <div className="space-y-4">
        <SettingRow
          label={t('settings.statisticsEnabled')}
          description={t('settings.statisticsEnabledDescription')}
        >
          <Switch
            checked={statisticsEnabled}
            onChange={(v) => {
              setStatisticsEnabled(v);
              void saveUserPreferences({ statisticsEnabled: v }, { purgeDisabledStats: true });
            }}
            label={t('settings.statisticsEnabled')}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.trackSessionTime')}
          description={t('settings.trackSessionTimeDescription')}
        >
          <Switch
            checked={trackSessionTime}
            disabled={!statisticsEnabled}
            onChange={(v) => {
              setTrackSessionTime(v);
              void saveUserPreferences({ trackSessionTime: v }, { purgeDisabledStats: true });
            }}
            label={t('settings.trackSessionTime')}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.trackPageTime')}
          description={t('settings.trackPageTimeDescription')}
        >
          <Switch
            checked={trackPageTime}
            disabled={!statisticsEnabled}
            onChange={(v) => {
              setTrackPageTime(v);
              setTrackFolderTime(v);
              void saveUserPreferences(
                { trackPageTime: v, trackFolderTime: v },
                { purgeDisabledStats: true },
              );
            }}
            label={t('settings.trackPageTime')}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.trackContentEvents')}
          description={t('settings.trackContentEventsDescription')}
        >
          <Switch
            checked={trackContentEvents}
            disabled={!statisticsEnabled}
            onChange={(v) => {
              setTrackContentEvents(v);
              void saveUserPreferences({ trackContentEvents: v }, { purgeDisabledStats: true });
            }}
            label={t('settings.trackContentEvents')}
          />
        </SettingRow>
      </div>
    </section>
  );
}
