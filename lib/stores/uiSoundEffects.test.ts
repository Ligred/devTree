/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsStore } from './settingsStore';
import { playHoverSound, playTypingSound, playUiSound } from './uiSoundEffects';

const loadMock = vi.fn(() => Promise.resolve());
const playMock = vi.fn();

vi.mock('snd-lib', () => {
  return {
    default: class Snd {
      static readonly SOUNDS = {
        SWIPE: 'swipe',
        TRANSITION_UP: 'transition_up',
        TRANSITION_DOWN: 'transition_down',
        BUTTON: 'button',
        SELECT: 'select',
        CAUTION: 'caution',
        NOTIFICATION: 'notification',
        TOGGLE_ON: 'toggle_on',
        TOGGLE_OFF: 'toggle_off',
        DISABLED: 'disabled',
      };

      static readonly KITS = {
        SND01: '01',
      };

      load = loadMock;
      play = playMock;
    },
  };
});

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('uiSoundEffects', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    loadMock.mockClear();
    playMock.mockClear();
    useSettingsStore.setState({
      uiSoundsEnabled: false,
      hoverSoundsEnabled: true,
      typingSoundsEnabled: false,
      uiSoundsVolume: 0.4,
      hoverSoundsVolume: 0.6,
      typingSoundsVolume: 0.3,
    });
  });

  it('does not create or play audio when ui sounds are disabled', () => {
    playUiSound('navigation');

    expect(loadMock).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
  });

  it('loads sine kit and plays mapped sound when ui sounds are enabled', async () => {
    useSettingsStore.setState({ uiSoundsEnabled: true });

    playUiSound('create');
    await flushMicrotasks();

    expect(loadMock).toHaveBeenCalledWith('01');
    expect(playMock).toHaveBeenCalledWith('button', { volume: 0.4 });
  });

  it('uses mapped sine sound keys for toggle events', async () => {
    useSettingsStore.setState({ uiSoundsEnabled: true });

    playUiSound('toggleOn');
    playUiSound('toggleOff');
    await flushMicrotasks();

    expect(playMock).toHaveBeenCalledWith('toggle_on', { volume: 0.4 });
    expect(playMock).toHaveBeenCalledWith('toggle_off', { volume: 0.4 });
  });

  it('plays select for move interactions', async () => {
    useSettingsStore.setState({ uiSoundsEnabled: true });

    playUiSound('move');
    await flushMicrotasks();

    expect(playMock).toHaveBeenCalledWith('select', { volume: 0.4 });
  });

  it('uses hover channel volume for hover sounds', async () => {
    playHoverSound();
    await flushMicrotasks();

    expect(playMock).toHaveBeenCalledWith('select', { volume: 0.6 });
  });

  it('does not play typing sound when typing channel is disabled', async () => {
    playTypingSound();
    await flushMicrotasks();

    expect(playMock).not.toHaveBeenCalled();
  });

  it('plays typing channel sound when typing channel is enabled', async () => {
    useSettingsStore.setState({ typingSoundsEnabled: true });

    playTypingSound();
    await flushMicrotasks();

    expect(playMock).toHaveBeenCalledWith('button', { volume: 0.3 });
  });
});
