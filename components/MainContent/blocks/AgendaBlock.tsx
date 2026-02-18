'use client';

import { useCallback, useId, useRef } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { AgendaBlockContent, AgendaItem } from '../types';

// ─── Sortable item ─────────────────────────────────────────────────────────

function AgendaRow({
  item,
  onToggle,
  onTextChange,
  onDelete,
  onEnter,
}: {
  item: AgendaItem;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onEnter: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/item flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50 ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 active:cursor-grabbing"
        aria-label="Drag item"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-600"
        aria-label={item.text || 'Checklist item'}
      />

      {/* Text */}
      <input
        type="text"
        className={`flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
        value={item.text}
        placeholder="To-do item…"
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
          if (e.key === 'Backspace' && item.text === '') {
            e.preventDefault();
            onDelete();
          }
        }}
      />

      {/* Delete */}
      <button
        type="button"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
        onClick={onDelete}
        aria-label="Remove item"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── AgendaBlock ─────────────────────────────────────────────────────────────

type AgendaBlockProps = Readonly<{
  content: AgendaBlockContent;
  onChange: (content: AgendaBlockContent) => void;
}>;

export function AgendaBlock({ content, onChange }: AgendaBlockProps) {
  const { title = '', items } = content;
  const dndId = useId();
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const newItem = useCallback(
    (): AgendaItem => ({
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      text: '',
      checked: false,
    }),
    [],
  );

  const updateItems = useCallback(
    (next: AgendaItem[]) => onChange({ ...content, items: next }),
    [content, onChange],
  );

  const toggleItem = useCallback(
    (id: string) =>
      updateItems(items.map((it: AgendaItem) => (it.id === id ? { ...it, checked: !it.checked } : it))),
    [items, updateItems],
  );

  const updateText = useCallback(
    (id: string, text: string) =>
      updateItems(items.map((it: AgendaItem) => (it.id === id ? { ...it, text } : it))),
    [items, updateItems],
  );

  const addItemAfter = useCallback(
    (afterId: string) => {
      const idx = items.findIndex((it: AgendaItem) => it.id === afterId);
      const next = [...items];
      next.splice(idx + 1, 0, newItem());
      updateItems(next);
    },
    [items, updateItems, newItem],
  );

  const removeItem = useCallback(
    (id: string) => {
      if (items.length === 1) return; // keep at least one row
      updateItems(items.filter((it: AgendaItem) => it.id !== id));
    },
    [items, updateItems],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((it: AgendaItem) => it.id === active.id);
      const newIndex = items.findIndex((it: AgendaItem) => it.id === over.id);
      updateItems(arrayMove(items, oldIndex, newIndex));
    },
    [items, updateItems],
  );

  const done = items.filter((it: AgendaItem) => it.checked).length;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Title + progress */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <input
          type="text"
          className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder-muted-foreground"
          value={title}
          placeholder="Checklist title…"
          onChange={(e) => onChange({ ...content, title: e.target.value })}
        />
        {items.length > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {done} / {items.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="h-0.5 w-full bg-border">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          <div className="px-2 py-2">
            {items.map((item) => (
              <AgendaRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id)}
                onTextChange={(text) => updateText(item.id, text)}
                onDelete={() => removeItem(item.id)}
                onEnter={() => addItemAfter(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item */}
      <button
        ref={addBtnRef}
        type="button"
        className="flex w-full items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={() => updateItems([...items, newItem()])}
      >
        <Plus size={12} />
        Add item
      </button>
    </div>
  );
}
