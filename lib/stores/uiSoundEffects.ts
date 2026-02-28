import Snd from 'snd-lib';

import { useSettingsStore } from './settingsStore';

export type UiSoundEvent =
  | 'navigation'
  | 'open'
  | 'close'
  | 'create'
  | 'rename'
  | 'delete'
  | 'move'
  | 'select'
  | 'button'
  | 'toggleOn'
  | 'toggleOff'
  | 'disabled'
  | 'notification';

type SoundChannel = 'ui' | 'hover' | 'typing';

const SOUND_KEY_BY_EVENT: Record<UiSoundEvent, string> = {
  navigation: Snd.SOUNDS.SELECT,
  open: Snd.SOUNDS.TRANSITION_UP,
  close: Snd.SOUNDS.TRANSITION_DOWN,
  create: Snd.SOUNDS.BUTTON,
  rename: Snd.SOUNDS.SELECT,
  delete: Snd.SOUNDS.CAUTION,
  move: Snd.SOUNDS.SELECT,
  select: Snd.SOUNDS.SELECT,
  button: Snd.SOUNDS.BUTTON,
  toggleOn: Snd.SOUNDS.TOGGLE_ON,
  toggleOff: Snd.SOUNDS.TOGGLE_OFF,
  disabled: Snd.SOUNDS.DISABLED,
  notification: Snd.SOUNDS.NOTIFICATION,
};

let sndInstance: Snd | null = null;
let sndLoadPromise: Promise<void> | null = null;
let _lastUiSoundPlayedAt = 0; // track when a sound was last played for throttling
let audioUnlocked = false;

function clampVolume(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function isChannelEnabled(channel: SoundChannel): boolean {
  const settings = useSettingsStore.getState();
  if (channel === 'ui') return settings.uiSoundsEnabled;
  if (channel === 'hover') return settings.hoverSoundsEnabled;
  return settings.typingSoundsEnabled;
}

function getChannelVolume(channel: SoundChannel): number {
  const settings = useSettingsStore.getState();
  if (channel === 'ui') return clampVolume(settings.uiSoundsVolume);
  if (channel === 'hover') return clampVolume(settings.hoverSoundsVolume);
  return clampVolume(settings.typingSoundsVolume);
}

function canUseAudio(): boolean {
  return globalThis.window !== undefined && globalThis.document !== undefined;
}

function getSndInstance(): Snd | null {
  if (!canUseAudio()) return null;
  if (sndInstance) return sndInstance;

  sndInstance = new Snd({ easySetup: false, preloadSoundKit: null, muteOnWindowBlur: true });
  Snd.masterVolume = 1;
  return sndInstance;
}

function ensureSineKitLoaded(instance: Snd): Promise<void> {
  if (sndLoadPromise) return sndLoadPromise;

  sndLoadPromise = instance.load(Snd.KITS.SND01).catch((error) => {
    sndLoadPromise = null;
    throw error;
  });
  return sndLoadPromise;
}

export function primeUiSounds(): void {
  const instance = getSndInstance();
  if (!instance) return;
  ensureSineKitLoaded(instance).catch(() => {});
}

export function playUiSound(event: UiSoundEvent): void {
  playSoundByChannel(SOUND_KEY_BY_EVENT[event], 'ui');
}

export function playHoverSound(): void {
  playSoundByChannel(Snd.SOUNDS.SELECT, 'hover');
}

export function playTypingSound(): void {
  playSoundByChannel(Snd.SOUNDS.BUTTON, 'typing');
}

export function unlockUiSoundPlayback(): void {
  if (audioUnlocked) return;

  const instance = getSndInstance();
  if (!instance) return;

  ensureSineKitLoaded(instance)
    .then(() => {
      instance.play(Snd.SOUNDS.BUTTON, { volume: 0 });
      audioUnlocked = true;
    })
    .catch(() => {});
}

function playSoundByChannel(soundKey: string, channel: SoundChannel): void {
  if (!isChannelEnabled(channel)) {
    return;
  }

  const instance = getSndInstance();
  if (!instance) return;

  const volume = getChannelVolume(channel);
  if (volume <= 0) return;

  _lastUiSoundPlayedAt = Date.now();
  ensureSineKitLoaded(instance)
    .then(() => {
      instance.play(soundKey, { volume });
    })
    .catch(() => {});
}
