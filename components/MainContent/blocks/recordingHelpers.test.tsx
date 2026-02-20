/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attemptStartRecording } from './recordingHelpers';
import { useRecordingStore } from '@/lib/recordingStore';

describe('attemptStartRecording', () => {
  beforeEach(() => {
    // Reset the store to default
    useRecordingStore.setState({ isRecording: false, recordingBlockId: null, cancelRecordingCallback: () => {} });
  });

  it('starts recording when none active', async () => {
    const startFn = vi.fn();
    const confirm = vi.fn(() => Promise.resolve(true));

    await attemptStartRecording({ blockId: 'b1', startFn, confirm });

    expect(startFn).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('starts recording when already recording on same block', async () => {
    const startFn = vi.fn();
    const confirm = vi.fn(() => Promise.resolve(true));

    useRecordingStore.setState({ isRecording: true, recordingBlockId: 'b1', cancelRecordingCallback: () => {} });

    await attemptStartRecording({ blockId: 'b1', startFn, confirm });

    expect(startFn).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks for confirmation and switches when confirmed', async () => {
    const startFn = vi.fn();
    const cancelCb = vi.fn();
    const confirm = vi.fn(() => Promise.resolve(true));

    useRecordingStore.setState({ isRecording: true, recordingBlockId: 'b-old', cancelRecordingCallback: cancelCb });

    await attemptStartRecording({ blockId: 'b-new', startFn, confirm });

    expect(confirm).toHaveBeenCalled();
    expect(cancelCb).toHaveBeenCalled();
    expect(startFn).toHaveBeenCalled();
  });

  it('does not switch when confirmation is cancelled', async () => {
    const startFn = vi.fn();
    const cancelCb = vi.fn();
    const confirm = vi.fn(() => Promise.resolve(false));

    useRecordingStore.setState({ isRecording: true, recordingBlockId: 'b-old', cancelRecordingCallback: cancelCb });

    await attemptStartRecording({ blockId: 'b-new', startFn, confirm });

    expect(confirm).toHaveBeenCalled();
    expect(cancelCb).not.toHaveBeenCalled();
    expect(startFn).not.toHaveBeenCalled();
  });
});
