'use client';

/**
 * AudioNode — audio player block as a Tiptap node.
 *
 * Attrs: url (string), caption (string), tags (string[])
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, type ReactNodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { Volume2 } from 'lucide-react';

import { BlockHeader } from '../BlockHeader';
import { BlockTagChips } from '../BlockTagChips';
import { useEditable } from '../EditableContext';
import { BLOCK_ATOM_SPEC, BLOCK_NODE_WRAPPER_CLASS, blockStopEvent } from './nodeUtils';

// ─── Node View ────────────────────────────────────────────────────────────────

function AudioNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const { url, caption, tags } = node.attrs as { url: string; caption: string; tags: string[] };
  const isEditable = useEditable();

  return (
    <NodeViewWrapper className={BLOCK_NODE_WRAPPER_CLASS}>
      <BlockHeader icon={<Volume2 size={13} className="text-muted-foreground" />} title="Audio" />

      {/* Tags */}
      <BlockTagChips
        tags={tags ?? []}
        isEditable={isEditable}
        onChange={(t) => updateAttributes({ tags: t })}
        showEmpty={isEditable}
      />

      <div className="p-4" onMouseDown={(e) => e.stopPropagation()}>
        {/* URL input (edit mode) */}
        {isEditable && (
          <input
            type="url"
            value={url ?? ''}
            placeholder="Audio URL (mp3, ogg, etc.)…"
            className="border-border bg-background text-foreground focus:ring-ring mb-3 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-1"
            onChange={(e) => updateAttributes({ url: e.target.value })}
          />
        )}

        {/* Player */}
        {url ? (
          <audio controls className="w-full" src={url} />
        ) : (
          <div className="border-border flex h-16 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground text-sm">Enter an audio URL above</p>
          </div>
        )}

        {/* Caption */}
        {isEditable && (
          <input
            type="text"
            value={caption ?? ''}
            placeholder="Caption (optional)…"
            className="text-muted-foreground placeholder:text-muted-foreground/50 mt-2 w-full bg-transparent text-xs outline-none"
            onChange={(e) => updateAttributes({ caption: e.target.value })}
          />
        )}
        {!isEditable && caption && <p className="text-muted-foreground mt-2 text-xs">{caption}</p>}
      </div>
    </NodeViewWrapper>
  );
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const AudioNode = Node.create({
  name: 'audioNode',
  ...BLOCK_ATOM_SPEC,

  addAttributes() {
    return {
      url: { default: '' },
      caption: { default: '' },
      tags: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audioNode"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'audioNode' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView, {
      stopEvent: blockStopEvent,
    });
  },
});
