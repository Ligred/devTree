'use client';

/**
 * BlockEditor — the drag-and-drop block layout engine.
 *
 * This component is responsible for:
 *   1. Rendering a responsive grid of content blocks.
 *   2. Enabling drag-and-drop reordering via @dnd-kit.
 *   3. Supporting a two-column grid layout where blocks can be half or full width.
 *   4. Tracking which grid column each block occupies so controls flip sides.
 *   5. Providing an "Add block" picker at the end of the list.
 *
 * ─── DRAG AND DROP (@dnd-kit) ─────────────────────────────────────────────────
 *
 * WHY @dnd-kit instead of react-beautiful-dnd or HTML5 drag-and-drop?
 *   - @dnd-kit is actively maintained, has first-class accessibility support
 *     (keyboard navigation, screen reader announcements), and works on both
 *     mouse and touch without extra libraries.
 *   - react-beautiful-dnd is largely unmaintained.
 *   - Native HTML5 DnD API lacks touch support and has inconsistent browser
 *     behaviour (especially regarding drag images and drop targets).
 *
 * Key @dnd-kit concepts used here:
 *   DndContext       — top-level provider that wires sensors and collision detection.
 *   SortableContext  — provides sortable semantics to its children via useId.
 *   useSortable      — used in BlockWrapper to make each block a draggable item.
 *   PointerSensor    — handles mouse AND touch input (works on mobile).
 *   KeyboardSensor   — enables keyboard-driven reordering (Tab, Space, arrow keys).
 *   restrictToVerticalAxis — modifier that prevents horizontal drift while dragging.
 *   arrayMove        — utility to reorder an array given old/new indices.
 *
 * WHY activationConstraint: { distance: 5 }?
 *   Without this, any click on a draggable element starts a drag, making it
 *   impossible to click buttons inside blocks. The 5px threshold ensures the
 *   user must intentionally move the pointer before a drag starts.
 *
 * WHY useId() for the DndContext id?
 *   DndContext generates aria-describedby ids for accessibility. Without a
 *   stable id, the server-rendered id and the client-rendered id differ,
 *   causing a React hydration warning. useId() produces a deterministic,
 *   server-safe id.
 *
 * ─── GRID LAYOUT ──────────────────────────────────────────────────────────────
 *
 * The grid is defined as `grid-cols-2` (desktop). Each block has `colSpan: 1`
 * (half width) or `colSpan: 2` (full width, default). On mobile (`< sm`, 640 px)
 * the grid collapses to a single column — half-width blocks become full-width
 * and the left gutter (pl-12) is removed.
 *
 * `computeColumnMap` simulates CSS Grid placement to determine whether each
 * half-width block ends up in the left (column 0) or right (column 1) cell.
 * This information is passed to BlockWrapper so the controls (drag handle, add
 * button) are rendered on the outside edge of the block, avoiding overlap.
 *
 * ─── IMPROVEMENT IDEAS ────────────────────────────────────────────────────────
 *   - Add an undo/redo stack (e.g. useReducer with an action history array).
 *   - Support multi-select + bulk delete.
 *   - Allow drag-and-drop between different pages.
 *   - Add a 3-column layout option for very wide screens.
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useCallback, useId } from 'react';

import { BlockPicker } from './BlockPicker';
import { BlockWrapper } from './BlockWrapper';
import { AgendaBlock } from './blocks/AgendaBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { DiagramBlock } from './blocks/DiagramBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { LinkBlock } from './blocks/LinkBlock';
import { TableBlock } from './blocks/TableBlock';
import { TextBlock } from './blocks/TextBlock';
import {
  type Block,
  type BlockContent,
  type BlockType,
  isAgendaBlockContent,
  isCodeBlockContent,
  isDiagramBlockContent,
  isImageBlockContent,
  isLinkBlockContent,
  isTableBlockContent,
  isTextBlockContent,
} from './types';

/**
 * Create a new block of the given type with sensible defaults.
 *
 * WHY factory function instead of inline object literals?
 *   A factory centralises default values, making it easy to add new block types
 *   or change defaults without hunting through the component tree.
 *
 * WHY crypto.randomUUID() with a Date.now() fallback?
 *   randomUUID() is available in all modern browsers and Node.js 14.17+. The
 *   fallback covers older environments without breaking the app. In production
 *   you'd use a proper UUID library or server-assigned ids.
 *
 * WHY colSpan: 2 as default?
 *   Full-width blocks are less likely to cause confusion for first-time users.
 *   Half-width blocks are an opt-in layout enhancement for users who want a
 *   denser layout.
 */
function createBlock(type: BlockType): Block {
  const id = `block-${crypto.randomUUID?.() ?? Date.now()}`;
  switch (type) {
    case 'text':
      return { id, type, content: '<p></p>', colSpan: 2 };
    case 'code':
      return { id, type, content: { code: '', language: 'javascript' }, colSpan: 2 };
    case 'link':
      return { id, type, content: { url: '', label: '' }, colSpan: 2 };
    case 'table':
      return {
        id,
        type,
        content: { headers: ['Column 1', 'Column 2'], rows: [['', '']] },
        colSpan: 2,
      };
    case 'agenda':
      return {
        id,
        type,
        content: {
          title: '',
          items: [
            {
              id: crypto.randomUUID?.() ?? Date.now().toString(),
              text: '',
              checked: false,
            },
          ],
        },
        colSpan: 2,
      };
    case 'image':
      return { id, type, content: { url: '', alt: '', caption: '' }, colSpan: 2 };
    case 'diagram':
      return { id, type, content: { code: '' }, colSpan: 2 };
  }
}

type BlockEditorProps = Readonly<{
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}>;

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  /**
   * Stable DnD context id to avoid SSR/client hydration mismatch.
   *
   * @dnd-kit uses this id to generate ARIA describedby ids for drag handles.
   * React's useId() produces the same id on server and client, preventing the
   * "aria-describedby mismatch" warning that appears with Math.random() ids.
   */
  const dndId = useId();

  /**
   * Configure input sensors.
   *
   * PointerSensor handles mouse, touch, and stylus — a single sensor covers
   * all pointer input. activationConstraint prevents accidental drag starts
   * when the user is just clicking a button inside the block.
   *
   * KeyboardSensor enables accessibility: users can reorder blocks without
   * a pointing device. sortableKeyboardCoordinates provides default arrow-key
   * behaviour that moves the active item between sortable positions.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Reorder blocks after a successful drag.
   *
   * WHY useCallback?
   *   handleDragEnd captures `blocks` and `onChange`. Without memoisation,
   *   DndContext gets a new callback reference on every render, which can
   *   cause subtle bugs with the internal drag state.
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    },
    [blocks, onChange],
  );

  /** Update a single block's content by id (immutable map). */
  const updateBlock = useCallback(
    (id: string, content: BlockContent) => {
      onChange(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
    },
    [blocks, onChange],
  );

  /** Remove a block by id from the list. */
  const deleteBlock = useCallback(
    (id: string) => {
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange],
  );

  /**
   * Insert a new block immediately after the given block.
   *
   * WHY splice instead of [...blocks.slice(0, i+1), newBlock, ...blocks.slice(i+1)]?
   *   splice mutates a copy (next) which is slightly faster for large arrays and
   *   avoids creating two temporary arrays.
   */
  const addBlockAfter = useCallback(
    (afterId: string, type: BlockType) => {
      const index = blocks.findIndex((b) => b.id === afterId);
      const next = [...blocks];
      next.splice(index + 1, 0, createBlock(type));
      onChange(next);
    },
    [blocks, onChange],
  );

  /** Toggle a block between half-width (colSpan: 1) and full-width (colSpan: 2). */
  const toggleColSpan = useCallback(
    (id: string) => {
      onChange(
        blocks.map((b) =>
          b.id === id ? { ...b, colSpan: b.colSpan === 1 ? 2 : (1 as const) } : b,
        ),
      );
    },
    [blocks, onChange],
  );

  /**
   * Determine which grid column each block occupies.
   *
   * Used to position block controls (drag handle, add button) on the outer edge,
   * preventing them from overlapping the adjacent block.
   */
  const columnMap = computeColumnMap(blocks);

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {/**
         * Responsive grid:
         *   Mobile  (< 640 px): 1 column, no gutter (pl-0)
         *   Desktop (≥ 640 px): 2 columns, left gutter (pl-12) for side controls
         *
         * WHY pl-12 on desktop?
         *   Block controls (drag handle, "add" button) are absolutely positioned
         *   at -left-10. The pl-12 gutter prevents them from being clipped by
         *   the grid container's edge.
         *
         * WHY not pl-12 on mobile?
         *   On mobile the side controls are hidden (see BlockWrapper). No gutter
         *   is needed, and removing it maximises the available screen width.
         */}
        <div className="grid grid-cols-1 gap-3 pl-0 sm:grid-cols-2 sm:gap-4 sm:pl-12">
          {blocks.map((block) => (
            <BlockWrapper
              key={block.id}
              block={block}
              controlsSide={columnMap[block.id] === 1 ? 'right' : 'left'}
              onDelete={() => deleteBlock(block.id)}
              onAddAfter={(type) => addBlockAfter(block.id, type)}
              onToggleColSpan={() => toggleColSpan(block.id)}
            >
              <BlockContent
                block={block}
                onChange={(content) => updateBlock(block.id, content)}
              />
            </BlockWrapper>
          ))}
        </div>
      </SortableContext>

      {/* "Add block" picker anchored after the last block */}
      <div className="mt-4 pl-0 sm:pl-12">
        <BlockPicker onSelect={(type) => onChange([...blocks, createBlock(type)])} />
      </div>
    </DndContext>
  );
}

/**
 * Returns a map of blockId → grid column index (0 = left, 1 = right).
 *
 * WHY simulate CSS Grid instead of reading DOM layout?
 *   DOM measurements (getBoundingClientRect) run after paint and would require
 *   an extra render cycle. Since the grid algorithm is deterministic (half-width
 *   blocks alternate columns; full-width blocks reset to column 0), we can
 *   compute it synchronously in JavaScript at render time.
 *
 * Algorithm:
 *   - Track `col` as the "current column cursor" (0 = left, 1 = right).
 *   - Full-width block (colSpan 2): always left (col 0), reset cursor to 0.
 *   - Half-width block (colSpan 1): place at current col, then flip cursor.
 *
 * Example for [half, half, full, half]:
 *   [0, 1, 0, 0]  (fourth block starts a new row after the full-width block)
 */
function computeColumnMap(blocks: Block[]): Record<string, 0 | 1> {
  const map: Record<string, 0 | 1> = {};
  let col: 0 | 1 = 0;

  for (const block of blocks) {
    if (block.colSpan === 1) {
      map[block.id] = col;
      // Alternate: left → right → left → …
      col = col === 0 ? 1 : 0;
    } else {
      // Full-width block always starts in the left column
      map[block.id] = 0;
      // Reset cursor so the next block starts at left
      col = 0;
    }
  }

  return map;
}

/**
 * Renders the correct block component for a given block type and content.
 *
 * WHY a separate component instead of a switch in BlockEditor's JSX?
 *   Extracting it keeps the BlockEditor render function readable and makes
 *   it easy to add new block types in one place.
 *
 * WHY type guards (isTextBlockContent, etc.)?
 *   `block.content` is typed as the union `BlockContent`. Without narrowing,
 *   TypeScript can't know which concrete type it is — and the wrong component
 *   receiving the wrong content shape would cause a runtime error. Type guards
 *   narrow the union *and* satisfy the TypeScript compiler in one step.
 *
 * IMPROVEMENT: Replace the if-chain with a type-indexed registry:
 *   const BLOCK_REGISTRY: Record<BlockType, Component> = { text: TextBlock, ... }
 *   This would make adding a new block type a single-line change.
 */
function BlockContent({
  block,
  onChange,
}: Readonly<{
  block: Block;
  onChange: (content: BlockContent) => void;
}>) {
  const { type, content } = block;

  if (type === 'text' && isTextBlockContent(content, type)) {
    return <TextBlock content={content} onChange={onChange} />;
  }
  if (type === 'code' && isCodeBlockContent(content, type)) {
    return <CodeBlock content={content} onChange={onChange} />;
  }
  if (type === 'link' && isLinkBlockContent(content, type)) {
    return <LinkBlock content={content} onChange={onChange} />;
  }
  if (type === 'table' && isTableBlockContent(content, type)) {
    return <TableBlock content={content} onChange={onChange} />;
  }
  if (type === 'agenda' && isAgendaBlockContent(content, type)) {
    return <AgendaBlock content={content} onChange={onChange} />;
  }
  if (type === 'image' && isImageBlockContent(content, type)) {
    return <ImageBlock content={content} onChange={onChange} />;
  }
  if (type === 'diagram' && isDiagramBlockContent(content, type)) {
    return <DiagramBlock content={content} onChange={onChange} />;
  }

  // Warn in development if an unknown block type slips through.
  // In production this would silently render nothing, which is safe.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[BlockEditor] Unknown block type: "${type}"`);
  }
  return null;
}
