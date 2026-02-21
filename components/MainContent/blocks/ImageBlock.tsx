'use client';

import { useState } from 'react';
import { Image as ImageIcon, Pencil, Check, X } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import type { ImageBlockContent } from '../types';

type ImageBlockProps = Readonly<{
  content: ImageBlockContent;
  onChange: (content: ImageBlockContent) => void;
}>;

export function ImageBlock({ content, onChange }: ImageBlockProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(!content.url);
  const [draft, setDraft] = useState(content);
  const [broken, setBroken] = useState(false);

  const { url, alt, caption } = content;

  const save = () => {
    const next = {
      url: draft.url.trim(),
      alt: draft.alt?.trim(),
      caption: draft.caption?.trim(),
    };
    onChange(next);
    setBroken(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(content);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Image block
        </p>
        <div className="flex flex-col gap-2">
          <input
            type="url"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="https://example.com/image.png"
            value={draft.url}
            onChange={(e) => setDraft((d: ImageBlockContent) => ({ ...d, url: e.target.value }))}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <input
            type="text"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="Alt text (accessibility)"
            value={draft.alt ?? ''}
            onChange={(e) => setDraft((d: ImageBlockContent) => ({ ...d, alt: e.target.value }))}
          />
          <input
            type="text"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="Caption (optional)"
            value={draft.caption ?? ''}
            onChange={(e) => setDraft((d: ImageBlockContent) => ({ ...d, caption: e.target.value }))}
          />
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

  if (!url || broken) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
        <ImageIcon size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {broken ? 'Image could not be loaded' : 'No image URL set'}
        </p>
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-700 dark:bg-indigo-500"
          onClick={() => {
            setDraft(content);
            setEditing(true);
          }}
        >
          {broken ? 'Change URL' : 'Set image URL'}
        </button>
      </div>
    );
  }

  return (
    <figure className="group/img relative overflow-hidden rounded-xl border border-border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt ?? ''}
        className="w-full object-cover"
        onError={() => setBroken(true)}
      />
      {caption && (
        <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}

      {/* Edit overlay */}
      <button
        type="button"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-card group-hover/img:opacity-100"
        onClick={() => {
          setDraft(content);
          setEditing(true);
        }}
        aria-label="Edit image"
      >
        <Pencil size={13} />
      </button>
    </figure>
  );
}
