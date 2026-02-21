'use client';

import { useState } from 'react';
import { ExternalLink, Pencil, Check, X } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import type { LinkBlockContent } from '../types';

type LinkBlockProps = Readonly<{
  content: LinkBlockContent;
  onChange: (content: LinkBlockContent) => void;
}>;

export function LinkBlock({ content, onChange }: LinkBlockProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(!content.url);
  const [draft, setDraft] = useState(content);

  const { url, label } = content;
  const displayText = label?.trim() || url;
  const safeUrl = url?.trim() ? url : '#';

  const save = () => {
    onChange({ url: draft.url.trim(), label: draft.label?.trim() });
    setEditing(false);
  };

  const cancel = () => {
    setDraft(content);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Link block
        </p>
        <div className="flex flex-col gap-2">
          <input
            type="url"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="https://example.com"
            value={draft.url}
            onChange={(e) => setDraft((d: LinkBlockContent) => ({ ...d, url: e.target.value }))}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
          />
          <input
            type="text"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder="Display label (optional)"
            value={draft.label ?? ''}
            onChange={(e) => setDraft((d: LinkBlockContent) => ({ ...d, label: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
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

  return (
    <div className="group/link relative rounded-lg border border-border bg-card p-4 text-card-foreground">
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-indigo-600 hover:underline dark:text-indigo-400"
        aria-label={label ? `${label} (external link)` : 'External link'}
      >
        <ExternalLink size={16} className="shrink-0" aria-hidden />
        <span className="break-all font-medium">{displayText}</span>
      </a>
      {label && url && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{url}</p>
      )}

      {/* Edit button */}
      <button
        type="button"
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover/link:opacity-100"
        onClick={() => {
          setDraft(content);
          setEditing(true);
        }}
        aria-label="Edit link"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}
