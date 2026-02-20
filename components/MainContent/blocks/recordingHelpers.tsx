import { useRecordingStore } from '@/lib/recordingStore';
import type { ConfirmationConfig } from '@/lib/confirmationContext';

type AttemptParams = Readonly<{
  blockId: string;
  startFn: () => void;
  confirm: (config: ConfirmationConfig) => Promise<boolean>;
}>;

/**
 * attemptStartRecording — Central helper to start recording with confirmation
 * when another block is already recording.
 */
export async function attemptStartRecording({ blockId, startFn, confirm }: AttemptParams) {
  const store = useRecordingStore.getState();

  if (!store.isRecording) {
    startFn();
    return;
  }

  if (store.recordingBlockId === blockId) {
    // Recording is already active for this block — just start.
    startFn();
    return;
  }

  const confirmed = await confirm({
    title: 'Stop previous recording?',
    description:
      'Another block is currently recording. Do you want to stop it and start recording here instead?',
    confirmText: 'Start New Recording',
    cancelText: 'Keep Current Recording',
    variant: 'default',
  });

  if (!confirmed) return;

  // Stop the previous recording (this will call its cancel callback).
  const prevId = store.recordingBlockId || '';
  store.stopRecording(prevId);

  // Start the new recording.
  startFn();
}
