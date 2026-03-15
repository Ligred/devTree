'use client';

import { Switch } from '@/components/shared/ui/Switch';
import { useI18n } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { playUiSound, primeUiSounds } from '@/lib/stores/uiSoundEffects';
import { saveUserPreferences } from '@/lib/userPreferences';

import { SectionHeader, SettingRow, VolumeControl } from './settingsShared';

export function SettingsFeaturesTab() {
  const { t } = useI18n();
  const {
    tagsPerPageEnabled,
    tagsPerBlockEnabled,
    recordingStartSoundEnabled,
    uiSoundsEnabled,
    hoverSoundsEnabled,
    typingSoundsEnabled,
    uiSoundsVolume,
    hoverSoundsVolume,
    typingSoundsVolume,
    dictationFormattingEnabled,
    setTagsPerPage,
    setTagsPerBlock,
    setRecordingStartSound,
    setUiSoundsEnabled,
    setHoverSoundsEnabled,
    setTypingSoundsEnabled,
    setUiSoundsVolume,
    setHoverSoundsVolume,
    setTypingSoundsVolume,
    setDictationFormatting,
  } = useSettingsStore();

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <SectionHeader title={t('settings.sectionFeatures')} />
      <div className="space-y-4">
        <SettingRow
          label={t('settings.tagsPerPage')}
          description={t('settings.tagsPerPageDescription')}
        >
          <Switch
            checked={tagsPerPageEnabled}
            onChange={(v) => {
              setTagsPerPage(v);
              void saveUserPreferences({ tagsPerPageEnabled: v });
            }}
            label={t('settings.tagsPerPage')}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.tagsPerBlock')}
          description={t('settings.tagsPerBlockDescription')}
        >
          <Switch
            checked={tagsPerBlockEnabled}
            onChange={(v) => {
              setTagsPerBlock(v);
              void saveUserPreferences({ tagsPerBlockEnabled: v });
            }}
            label={t('settings.tagsPerBlock')}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.recordingStartSound')}
          description={t('settings.recordingStartSoundDescription')}
        >
          <Switch
            checked={recordingStartSoundEnabled}
            onChange={(v) => {
              setRecordingStartSound(v);
              void saveUserPreferences({ recordingStartSoundEnabled: v });
            }}
            label={t('settings.recordingStartSound')}
          />
        </SettingRow>

        <SettingRow label={t('settings.uiSounds')} description={t('settings.uiSoundsDescription')}>
          <Switch
            checked={uiSoundsEnabled}
            onChange={(v) => {
              if (v) {
                setUiSoundsEnabled(true);
                primeUiSounds();
                playUiSound('notification');
              } else {
                setUiSoundsEnabled(false);
              }
              void saveUserPreferences({ uiSoundsEnabled: v });
            }}
            label={t('settings.uiSounds')}
          />
        </SettingRow>

        {uiSoundsEnabled && (
          <SettingRow
            label={t('settings.uiSoundsVolume')}
            description={t('settings.uiSoundsVolumeDescription')}
          >
            <VolumeControl
              value={uiSoundsVolume}
              label={t('settings.uiSoundsVolume')}
              onChange={(value) => {
                setUiSoundsVolume(value);
                void saveUserPreferences({ uiSoundsVolume: value });
              }}
            />
          </SettingRow>
        )}

        <SettingRow
          label={t('settings.hoverSounds')}
          description={t('settings.hoverSoundsDescription')}
        >
          <Switch
            checked={hoverSoundsEnabled}
            onChange={(v) => {
              setHoverSoundsEnabled(v);
              void saveUserPreferences({ hoverSoundsEnabled: v });
            }}
            label={t('settings.hoverSounds')}
          />
        </SettingRow>

        {hoverSoundsEnabled && (
          <SettingRow
            label={t('settings.hoverSoundsVolume')}
            description={t('settings.hoverSoundsVolumeDescription')}
          >
            <VolumeControl
              value={hoverSoundsVolume}
              label={t('settings.hoverSoundsVolume')}
              onChange={(value) => {
                setHoverSoundsVolume(value);
                void saveUserPreferences({ hoverSoundsVolume: value });
              }}
            />
          </SettingRow>
        )}

        <SettingRow
          label={t('settings.typingSounds')}
          description={t('settings.typingSoundsDescription')}
        >
          <Switch
            checked={typingSoundsEnabled}
            onChange={(v) => {
              if (v) {
                setTypingSoundsEnabled(true);
                primeUiSounds();
                playUiSound('notification');
              } else {
                setTypingSoundsEnabled(false);
              }
              void saveUserPreferences({ typingSoundsEnabled: v });
            }}
            label={t('settings.typingSounds')}
          />
        </SettingRow>

        {typingSoundsEnabled && (
          <SettingRow
            label={t('settings.typingSoundsVolume')}
            description={t('settings.typingSoundsVolumeDescription')}
          >
            <VolumeControl
              value={typingSoundsVolume}
              label={t('settings.typingSoundsVolume')}
              onChange={(value) => {
                setTypingSoundsVolume(value);
                void saveUserPreferences({ typingSoundsVolume: value });
              }}
            />
          </SettingRow>
        )}

        <SettingRow
          label={t('settings.dictationFormatting')}
          description={t('settings.dictationFormattingDescription')}
        >
          <Switch
            checked={dictationFormattingEnabled}
            onChange={(v) => {
              setDictationFormatting(v);
              void saveUserPreferences({ dictationFormattingEnabled: v });
            }}
            label={t('settings.dictationFormatting')}
          />
        </SettingRow>
      </div>
    </section>
  );
}
