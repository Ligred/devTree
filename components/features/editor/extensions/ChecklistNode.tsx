'use client';

/**
 * ChecklistNode — interactive checklist / agenda as a Tiptap node.
 *
 * Attrs: title (string), items ({ id, text, checked }[]), tags (string[])
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, type ReactNodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { CheckSquare, GripVertical, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { BlockTagChips } from '../BlockTagChips';
import { useEditable } from '../EditableContext';
import { BLOCK_ATOM_SPEC, BLOCK_NODE_WRAPPER_CLASS, blockStopEvent } from './nodeUtils';

type CheckItem = { id: string; text: string; checked: boolean };

// ─── Node View ────────────────────────────────────────────────────────────────

function ChecklistNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const { title, items, tags } = node.attrs as {
    title: string;
    items: CheckItem[];
    tags: string[];
  };
  const isEditable = useEditable();
  const safeItems: CheckItem[] = Array.isArray(items) ? items : [];

  const total = safeItems.length;
  const done = safeItems.filter((i) => i.checked).length;

  const updateItems = (next: CheckItem[]) => updateAttributes({ items: next });

  const toggleItem = (id: string) =>
    updateItems(safeItems.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));

  const addItem = () =>
    updateItems([...safeItems, { id: crypto.randomUUID(), text: '', checked: false }]);

  const deleteItem = (id: string) => updateItems(safeItems.filter((i) => i.id !== id));

  const updateText = (id: string, text: string) =>
    updateItems(safeItems.map((i) => (i.id === id ? { ...i, text } : i)));

  return (
    <NodeViewWrapper className={BLOCK_NODE_WRAPPER_CLASS}>
      {/* Header */}
      <div className="border-border bg-muted/30 flex items-center gap-2 border-b px-3 py-1.5">
        <CheckSquare size={13} className="text-muted-foreground" />
        {isEditable ? (
          <input
            type="text"
            value={title ?? ''}
            placeholder="Checklist title…"
            className="text-foreground placeholder:text-muted-foreground/50 flex-1 bg-transparent text-sm font-medium outline-none"
            onChange={(e) => updateAttributes({ title: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-foreground flex-1 text-sm font-medium">{title || 'Checklist'}</span>
        )}
        {total > 0 && (
          <span className="text-muted-foreground text-xs">
            {done}/{total}
          </span>
        )}
      </div>

      {/* Tags */}
      <BlockTagChips
        tags={tags ?? []}
        isEditable={isEditable}
        onChange={(t) => updateAttributes({ tags: t })}
        showEmpty={isEditable}
      />

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-muted h-1 w-full">
          <div
            className="h-1 bg-indigo-500 transition-all"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      <div className="divide-border divide-y" onMouseDown={(e) => e.stopPropagation()}>
        {safeItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-3 py-2">
            {isEditable && (
              <GripVertical size={13} className="text-muted-foreground/40 shrink-0 cursor-grab" />
            )}
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
              className="h-4 w-4 shrink-0 rounded accent-indigo-600"
            />
            {isEditable ? (
              <input
                type="text"
                value={item.text}
                placeholder="Item…"
                className={cn(
                  'flex-1 bg-transparent text-sm outline-none',
                  item.checked ? 'text-muted-foreground line-through' : 'text-foreground',
                )}
                onChange={(e) => updateText(item.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                  if (e.key === 'Backspace' && item.text === '') {
                    e.preventDefault();
                    deleteItem(item.id);
                  }
                }}
              />
            ) : (
              <span
                className={cn(
                  'flex-1 text-sm',
                  item.checked ? 'text-muted-foreground line-through' : 'text-foreground',
                )}
              >
                {item.text}
              </span>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="text-muted-foreground/40 hover:text-destructive shrink-0"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add item footer */}
      {isEditable && (
        <div className="border-border border-t px-3 py-1.5">
          <button
            type="button"
            onClick={addItem}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Plus size={12} /> Add item
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const ChecklistNode = Node.create({
  name: 'checklistNode',
  ...BLOCK_ATOM_SPEC,

  addAttributes() {
    return {
      title: { default: '' },
      items: { default: [] },
      tags: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="checklistNode"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'checklistNode' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChecklistNodeView, {
      stopEvent: blockStopEvent,
    });
  },
});
