'use client';

import { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import type { AudioBlockContent } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type AudioBlockProps = Readonly<{
  content: AudioBlockContent;
  onChange: (content: AudioBlockContent) => void;
  isEditing: boolean;
  enterEdit: () => void;
  exitEdit?: () => void;
}>;

// ─── LevelBars ────────────────────────────────────────────────────────────────

/** Five animated bars shown while audio is playing — pure CSS visualizer. */
const BAR_KEYS = ['a', 'b', 'c', 'd', 'e'] as const;

function LevelBars({ active }: Readonly<{ active: boolean }>) {
  if (!active) return null;
  return (
    <div className="audio-bars" aria-hidden="true">
      {BAR_KEYS.map((key, index) => (
        <span
          key={key}
          className="inline-block h-3 w-0.5 rounded-full bg-indigo-500"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}

// ─── AudioBlock ───────────────────────────────────────────────────────────────

/**
 * AudioBlock — embeds an external audio file by URL.
 *
 * WHY URL-only instead of upload?
 *   File uploads require server-side storage (S3, Cloudinary, etc.).
 *   URL embedding works for any publicly hosted MP3/OGG/WAV without any
 *   backend infrastructure. Common use-cases: podcast episodes, lecture
 *   recordings, background music hosted on a CDN, SoundCloud direct links.
 *
 * Visualizer:
 *   The five animated bars (LevelBars) respond to audio play/pause events on
 *   the <audio> element. They use CSS keyframe animations — no Web Audio API
 *   required — so they work even when the audio is served cross-origin without
 *   CORS headers.
 */
export function AudioBlock({ content, onChange, isEditing, enterEdit, exitEdit }: AudioBlockProps) {
  const { t } = useI18n();
  const [draftUrl, setDraftUrl] = useState(content.url);
  const [draftCaption, setDraftCaption] = useState(content.caption ?? '');
  const [isPlaying, setIsPlaying] = useState(false);

  const { url, caption } = content;

  // Sync draft state when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setDraftUrl(url);
      setDraftCaption(caption ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // ── Edit mode ────────────────────────────────────────────────────────────────

  if (isEditing) {
    const handleSave = () => {
      const trimmedUrl = draftUrl.trim();
      if (!trimmedUrl) return;
      onChange({ url: trimmedUrl, caption: draftCaption.trim() || undefined });
      exitEdit?.();
    };

    const handleCancel = () => {
      setDraftUrl(url);
      setDraftCaption(caption ?? '');
      exitEdit?.();
    };

    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('block.audio.label')}
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('audio.urlLabel')}</span>
            <input
              type="url"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder="https://example.com/audio.mp3"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('audio.captionLabel')}</span>
            <input
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder={t('audio.captionPlaceholder')}
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">{t('audio.urlHint')}</p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={handleCancel}
            >
              {t('delete.cancel')}
            </button>
            <button
              type="button"
              disabled={!draftUrl.trim()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              onClick={handleSave}
            >
              {t('block.apply')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
        <Music size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('audio.noAudio')}</p>
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500"
          onClick={enterEdit}
        >
          {t('audio.addUrl')}
        </button>
      </div>
    );
  }

  // ── Player ────────────────────────────────────────────────────────────────────

  return (
    <figure className="group/audio overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- external audio URLs may lack a transcript; caption shown below when provided */}
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
