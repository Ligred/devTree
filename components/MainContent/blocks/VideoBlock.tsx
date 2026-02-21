'use client';

import { useMemo, useState } from 'react';
import { Check, ExternalLink, PlaySquare, X } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import type { VideoBlockContent } from '../types';

type VideoBlockProps = Readonly<{
  content: VideoBlockContent;
  onChange: (content: VideoBlockContent) => void;
}>;

type VideoProvider = 'youtube' | 'unknown';

type ParsedVideoUrl = {
  provider: VideoProvider;
  embedUrl: string | null;
};

export function parseVideoUrl(rawUrl: string): ParsedVideoUrl {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { provider: 'unknown', embedUrl: null };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { provider: 'unknown', embedUrl: null };
  }

  const host = parsed.hostname.toLowerCase();

  const isYoutubeHost =
    host === 'youtu.be' ||
    host.endsWith('.youtu.be') ||
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube-nocookie.com');

  if (!isYoutubeHost) {
    return { provider: 'unknown', embedUrl: null };
  }

  let videoId = '';

  if (host.includes('youtu.be')) {
    videoId = parsed.pathname.replace(/^\//, '').split('/')[0] ?? '';
  } else {
    const fromVParam = parsed.searchParams.get('v')?.trim() ?? '';
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const fromEmbedPath = pathParts[0] === 'embed' ? (pathParts[1] ?? '') : '';
    const fromShortsPath = pathParts[0] === 'shorts' ? (pathParts[1] ?? '') : '';
    videoId = fromVParam || fromEmbedPath || fromShortsPath;
  }

  if (!videoId) {
    return { provider: 'youtube', embedUrl: null };
  }

  const safeVideoId = videoId.replaceAll(/[^a-zA-Z0-9_-]/g, '');
  if (!safeVideoId) {
    return { provider: 'youtube', embedUrl: null };
  }

  const embed = new URL(`https://www.youtube.com/embed/${safeVideoId}`);
  const start = parsed.searchParams.get('t') ?? parsed.searchParams.get('start');
  if (start) embed.searchParams.set('start', start.replaceAll(/\D/g, ''));

  return { provider: 'youtube', embedUrl: embed.toString() };
}

export function VideoBlock({ content, onChange }: VideoBlockProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(!content.url);
  const [draftUrl, setDraftUrl] = useState(content.url);

  const parsed = useMemo(() => parseVideoUrl(content.url), [content.url]);

  const save = () => {
    onChange({ url: draftUrl.trim() });
    setEditing(false);
  };

  const cancel = () => {
    setDraftUrl(content.url);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Video block
        </p>
        <div className="flex flex-col gap-2">
          <input
            type="url"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
          />
          <p className="text-xs text-muted-foreground">
            YouTube links are embedded in the page. Other providers are saved as links.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            {content.url && (
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                onClick={cancel}
              >
                <X size={12} /> Cancel
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              onClick={save}
            >
              <Check size={12} /> {t('block.apply')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!content.url) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
        <PlaySquare size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No video URL set</p>
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500"
          onClick={() => {
            setDraftUrl(content.url);
            setEditing(true);
          }}
        >
          Set video URL
        </button>
      </div>
    );
  }

  if (parsed.provider === 'youtube' && parsed.embedUrl) {
    return (
      <figure className="group/video relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="aspect-video w-full bg-black">
          <iframe
            src={parsed.embedUrl}
            title="Embedded YouTube video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            data-testid="video-block-iframe"
          />
        </div>
        <figcaption className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-muted-foreground">
          <span className="truncate">YouTube</span>
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 hover:underline"
          >
            Open source
            <ExternalLink size={12} aria-hidden />
          </a>
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <PlaySquare size={16} aria-hidden />
        Saved video URL
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        This provider may block embedding or require authentication. Open it in a new tab.
      </p>
      <a
        href={content.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        <span className="break-all">{content.url}</span>
        <ExternalLink size={14} aria-hidden />
      </a>
      <div className="mt-3">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          onClick={() => {
            setDraftUrl(content.url);
            setEditing(true);
          }}
          aria-label="Edit video"
        >
          Edit video URL
        </button>
      </div>
    </div>
  );
}
