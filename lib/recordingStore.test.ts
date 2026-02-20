/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecordingStore } from './recordingStore';
import { playRecordingStartSound } from './recordingSound';
import { useSettingsStore } from './settingsStore';

vi.mock('./recordingSound', () => ({
  playRecordingStartSound: vi.fn(),
}));

describe('recordingStore', () => {
  beforeEach(() => {
    useRecordingStore.setState({
      isRecording: false,
      recordingBlockId: null,
      cancelRecordingCallback: () => {},
    });
    useSettingsStore.setState({
      tagsPerPageEnabled: true,
      tagsPerBlockEnabled: true,
      recordingStartSoundEnabled: true,
    });

    vi.clearAllMocks();
  });

  it('plays start sound when recording starts', () => {
    const cancelCallback = vi.fn();

    useRecordingStore.getState().startRecording('block-1', cancelCallback);

    expect(playRecordingStartSound).toHaveBeenCalledTimes(1);
    expect(useRecordingStore.getState().isRecording).toBe(true);
    expect(useRecordingStore.getState().recordingBlockId).toBe('block-1');
  });

  it('stops recording only for matching block id', () => {
    const cancelCallback = vi.fn();

    useRecordingStore.getState().startRecording('block-1', cancelCallback);
    useRecordingStore.getState().stopRecording('block-2');

    expect(cancelCallback).not.toHaveBeenCalled();
    expect(useRecordingStore.getState().isRecording).toBe(true);

    useRecordingStore.getState().stopRecording('block-1');

    expect(cancelCallback).toHaveBeenCalledTimes(1);
    expect(useRecordingStore.getState().isRecording).toBe(false);
    expect(useRecordingStore.getState().recordingBlockId).toBeNull();
  });

  it('does not play start sound when disabled in settings', () => {
    useSettingsStore.setState({ recordingStartSoundEnabled: false });

    useRecordingStore.getState().startRecording('block-1', vi.fn());

    expect(playRecordingStartSound).not.toHaveBeenCalled();
    expect(useRecordingStore.getState().isRecording).toBe(true);
  });
});
