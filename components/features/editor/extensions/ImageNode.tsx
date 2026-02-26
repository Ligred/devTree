'use client';

/**
 * ImageNode — image with optional caption as a Tiptap node.
 *
 * Attrs: url (string), alt (string), caption (string), tags (string[])
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, type ReactNodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { Image as ImageIcon } from 'lucide-react';

import { BlockHeader } from '../BlockHeader';
import { BlockTagChips } from '../BlockTagChips';
import { useEditable } from '../EditableContext';
import { BLOCK_ATOM_SPEC, BLOCK_NODE_WRAPPER_CLASS, blockStopEvent } from './nodeUtils';

// ─── Node View ────────────────────────────────────────────────────────────────

function ImageNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const { url, alt, caption, tags } = node.attrs as {
    url: string;
    alt: string;
    caption: string;
    tags: string[];
  };
  const isEditable = useEditable();

  return (
    <NodeViewWrapper className={BLOCK_NODE_WRAPPER_CLASS}>
      <BlockHeader icon={<ImageIcon size={13} className="text-muted-foreground" />} title="Image" />

      {/* Tags */}
      <BlockTagChips
        tags={tags ?? []}
        isEditable={isEditable}
        onChange={(t) => updateAttributes({ tags: t })}
        showEmpty={isEditable}
      />

      <div className="p-4" onMouseDown={(e) => e.stopPropagation()}>
        {isEditable && (
          <input
            type="url"
            value={url ?? ''}
            placeholder="Image URL…"
            className="border-border bg-background text-foreground focus:ring-ring mb-3 w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-1"
            onChange={(e) => updateAttributes({ url: e.target.value })}
          />
        )}
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt ?? ''} className="max-h-96 w-full rounded-lg object-contain" />
        ) : (
          <div className="border-border flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground text-sm">Enter an image URL above</p>
          </div>
        )}
        {isEditable && (
          <input
            type="text"
            value={caption ?? ''}
            placeholder="Caption (optional)…"
            className="text-muted-foreground mt-2 w-full bg-transparent text-xs outline-none"
            onChange={(e) => updateAttributes({ caption: e.target.value })}
          />
        )}
        {!isEditable && caption && (
          <p className="text-muted-foreground mt-2 text-center text-xs">{caption}</p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const ImageNode = Node.create({
  name: 'imageNode',
  ...BLOCK_ATOM_SPEC,

  addAttributes() {
    return {
      url: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      tags: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="imageNode"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'imageNode' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      stopEvent: blockStopEvent,
    });
  },
});
