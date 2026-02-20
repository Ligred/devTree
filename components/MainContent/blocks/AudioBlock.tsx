'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { Mic, Upload } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import { useRecordingStore } from '@/lib/recordingStore';
import { useConfirmation } from '@/lib/confirmationContext';
import { attemptStartRecording } from './recordingHelpers';
import type { AudioBlockContent } from '../types';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const LEVEL_BAR_IDS = ['a', 'b', 'c', 'd', 'e'] as const;

type AudioBlockProps = Readonly<{
  content: AudioBlockContent;
  onChange: (content: AudioBlockContent) => void;
  isEditing: boolean;
  enterEdit: () => void;
  blockId?: string;
}>;

/** Small animated bars used for both recording and playback states. */
function LevelBars({
  active,
  compact = false,
}: Readonly<{ active: boolean; compact?: boolean }>) {
  if (!active) return null;
  return (
    <div
      className={compact ? 'audio-bars audio-bars--compact' : 'audio-bars'}
      aria-hidden="true"
    >
      {LEVEL_BAR_IDS.map((id, index) => (
        <span
          key={id}
          className={compact ? 'inline-block h-2 w-0.75 rounded-full bg-indigo-500' : 'inline-block h-3 w-0.75 rounded-full bg-indigo-500'}
          style={{ opacity: 0.9, animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function AudioBlock({ content, onChange, isEditing, enterEdit, blockId }: AudioBlockProps) {
  const { t } = useI18n();
  const { startRecording: startRecordingStore, stopRecording: stopRecordingStore } = useRecordingStore();
  const { confirm } = useConfirmation();
  const generatedBlockId = useId();
  const resolvedBlockId = blockId ?? generatedBlockId;
  const [draftUrl, setDraftUrl] = useState(content.url);
  const [draftCaption, setDraftCaption] = useState(content.caption ?? '');
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { url, caption } = content;

  // When entering edit mode, sync drafts from current content.
  useEffect(() => {
    if (isEditing) {
      setDraftUrl(url);
      setDraftCaption(caption ?? '');
    } else {
      // Leaving edit mode: auto-save any changes.
      const trimmedUrl = draftUrl.trim();
      const trimmedCaption = draftCaption.trim();
      if (trimmedUrl && (trimmedUrl !== url || trimmedCaption !== (caption ?? ''))) {
        onChange({ url: trimmedUrl, caption: trimmedCaption || undefined });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // If user leaves edit mode while recording, automatically stop recording.
  useEffect(() => {
    if (!isEditing && recording && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      stopRecordingStore(resolvedBlockId);
    }
  }, [isEditing, recording, resolvedBlockId, stopRecordingStore]);

  const uploadBlob = useCallback(
    async (blob: Blob): Promise<string> => {
      if (blob.size > MAX_SIZE) {
        throw new Error('Audio must be under 5MB');
      }
      const formData = new FormData();
      formData.append('audio', blob);
      const res = await fetch('/api/block/audio', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Upload failed');
      }
      const data = (await res.json()) as { url: string };
      return data.url;
    },
    [],
  );

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        try {
          const uploadedUrl = await uploadBlob(blob);
          setDraftUrl(uploadedUrl);
          onChange({ url: uploadedUrl, caption: draftCaption || undefined });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save recording');
        }
      };
      mediaRecorderRef.current = recorder;

      // Use attemptStartRecording to handle confirmation if another block is recording
      // Only start the actual recording after confirmation
      await attemptStartRecording({
        blockId: resolvedBlockId,
        confirm,
        startFn: () => {
          recorder.start();
          setRecording(true);
          // Provide cancel callback for the store
          startRecordingStore(resolvedBlockId, () => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              setRecording(false);
            }
          });
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
      setRecording(false);
    }
  }, [resolvedBlockId, draftCaption, onChange, uploadBlob, startRecordingStore, confirm]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      stopRecordingStore(resolvedBlockId);
    }
  }, [resolvedBlockId, stopRecordingStore]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      if (file.size > MAX_SIZE) {
        setError('Audio must be under 5MB');
        return;
      }
      try {
        const uploadedUrl = await uploadBlob(file);
        setDraftUrl(uploadedUrl);
        onChange({ url: uploadedUrl, caption: draftCaption || undefined });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
      e.target.value = '';
    },
    [draftCaption, onChange, uploadBlob],
  );

  if (isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('audio.blockTitle')}
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
              onClick={recording ? stopRecording : startRecording}
              disabled={typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia}
            >
              <Mic size={16} />
              {recording ? t('audio.stopRecording') : t('audio.record')}
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent">
              <Upload size={16} />
              {t('audio.uploadFile')}
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={handleFileSelect}
              />
            </label>
            <LevelBars active={recording} compact />
          </div>
          <div className="text-xs text-muted-foreground">{t('audio.pasteUrl')}</div>
          <input
            type="url"
            id="audio-url"
            name="audio-url"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="https://example.com/audio.mp3"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
          />
          <input
            type="text"
            id="audio-caption"
            name="audio-caption"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder={t('audio.captionPlaceholder')}
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
        <Mic size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('audio.noAudio')}</p>
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500"
          onClick={() => {
            enterEdit();
          }}
        >
          {t('audio.recordOrUpload')}
        </button>
      </div>
    );
  }

  return (
    <figure className="group/audio relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- User-recorded audio notes typically have no transcript; caption shown below when provided */}
        <audio
          src={url}
          controls
          className="w-full"
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        <LevelBars active={isPlaying} />
      </div>
      {caption && (
        <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
