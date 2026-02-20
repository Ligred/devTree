const START_RECORDING_SOUND_SRC = '/sounds/mixkit-interface-option-select-2573.wav';

let startRecordingAudio: HTMLAudioElement | null = null;

export function playRecordingStartSound() {
  if (globalThis.window === undefined || globalThis.Audio === undefined) {
    return;
  }

  try {
    if (!startRecordingAudio) {
      startRecordingAudio = new globalThis.Audio(START_RECORDING_SOUND_SRC);
      startRecordingAudio.preload = 'auto';
    }

    startRecordingAudio.currentTime = 0;
    void startRecordingAudio.play().catch(() => {});
  } catch {}
}
