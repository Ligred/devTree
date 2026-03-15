'use client';

import { useEffect, useState } from 'react';

import { Switch } from '@/components/shared/ui/Switch';
import { useI18n } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { saveUserPreferences } from '@/lib/userPreferences';

import { SegmentButton, SectionHeader, SettingRow } from './settingsShared';

type Props = Readonly<{ open: boolean }>;

export function SettingsDiaryTab({ open }: Props) {
  const { t } = useI18n();
  const { diaryLocationEnabled, diaryTemperatureUnit, setDiaryLocationEnabled, setDiaryTemperatureUnit } =
    useSettingsStore();

  const [browserLocationBlocked, setBrowserLocationBlocked] = useState(false);
  const [locationPermissionMessage, setLocationPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- state updates reflect browser API results */
    if (!open) return;
    if (!('geolocation' in navigator)) {
      setBrowserLocationBlocked(true);
      setLocationPermissionMessage(t('settings.diaryLocationBlockedUnsupported'));
      if (diaryLocationEnabled) {
        setDiaryLocationEnabled(false);
        void saveUserPreferences({ diaryLocationEnabled: false });
      }
      return;
    }

    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
      setBrowserLocationBlocked(false);
      setLocationPermissionMessage(null);
      return;
    }

    let disposed = false;
    let permissionStatus: PermissionStatus | null = null;

    const syncState = (state: PermissionState) => {
      if (disposed) return;
      const blocked = state === 'denied';
      setBrowserLocationBlocked(blocked);
      setLocationPermissionMessage(blocked ? t('settings.diaryLocationBlockedByBrowser') : null);
      if (blocked && diaryLocationEnabled) {
        setDiaryLocationEnabled(false);
        void saveUserPreferences({ diaryLocationEnabled: false });
      }
    };

    navigator.permissions
      // eslint-disable-next-line sonarjs/no-intrusive-permissions -- necessary for feature
      .query({ name: 'geolocation' })
      .then((result) => {
        permissionStatus = result;
        syncState(result.state);
        result.onchange = () => syncState(result.state);
      })
      .catch(() => {
        setBrowserLocationBlocked(false);
        setLocationPermissionMessage(null);
      });

    return () => {
      disposed = true;
      if (permissionStatus) permissionStatus.onchange = null;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [diaryLocationEnabled, open, setDiaryLocationEnabled, t]);

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <SectionHeader title={t('settings.sectionDiary')} />
      <div className="space-y-4">
        <SettingRow
          label={t('settings.diaryLocation')}
          description={locationPermissionMessage ?? t('settings.diaryLocationDescription')}
        >
          <Switch
            checked={diaryLocationEnabled}
            disabled={browserLocationBlocked}
            onChange={(v) => {
              setDiaryLocationEnabled(v);
              void saveUserPreferences({ diaryLocationEnabled: v });
            }}
            label={t('settings.diaryLocation')}
          />
        </SettingRow>

        {diaryLocationEnabled && !browserLocationBlocked && (
          <SettingRow
            label={t('settings.diaryTemperatureUnit')}
            description={t('settings.diaryTemperatureUnitDescription')}
          >
            <div className="flex gap-1.5">
              <SegmentButton
                active={diaryTemperatureUnit === 'c'}
                onClick={() => {
                  setDiaryTemperatureUnit('c');
                  void saveUserPreferences({ diaryTemperatureUnit: 'c' });
                }}
              >
                {t('settings.temperatureCelsius')}
              </SegmentButton>
              <SegmentButton
                active={diaryTemperatureUnit === 'f'}
                onClick={() => {
                  setDiaryTemperatureUnit('f');
                  void saveUserPreferences({ diaryTemperatureUnit: 'f' });
                }}
              >
                {t('settings.temperatureFahrenheit')}
              </SegmentButton>
            </div>
          </SettingRow>
        )}
      </div>
    </section>
  );
}
