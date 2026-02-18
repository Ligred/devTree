'use client';

/**
 * BlockWrapper — the outer shell for every content block.
 *
 * Responsibilities:
 *   1. Makes the block sortable via @dnd-kit's useSortable hook.
 *   2. Sets the correct CSS grid column span (half or full width).
 *   3. Renders editing controls that appear on hover (or always on mobile).
 *   4. Positions controls on the correct side (left or right) so they don't
 *      overlap the adjacent block in a two-column layout.
 *
 * ─── CONTROLS LAYOUT ──────────────────────────────────────────────────────────
 *
 * Two groups of controls:
 *
 *   Side controls (drag handle + "add block after" button):
 *     - Desktop: absolutely positioned left (-10) or right (-10) of the block,
 *       inside the `pl-12` gutter of the grid container.
 *     - Mobile: hidden (sm:hidden) — the gutter doesn't exist on small screens
 *       and touch users can tap the top-corner buttons instead.
 *
 *   Top-corner controls (width toggle + delete):
 *     - Desktop: opacity-0 by default, fade in on group-hover.
 *     - Mobile: always visible (opacity-100 sm:opacity-0) so touch users can
 *       reach them without needing a hover state that doesn't exist on touchscreens.
 *
 * WHY CSS opacity transitions over show/hide (display: none)?
 *   Opacity changes are GPU-composited and don't trigger layout reflow.
 *   They also allow smooth fade-in/out animations via `transition-opacity`.
 *
 * ─── USESORTABLE ──────────────────────────────────────────────────────────────
 *
 * `useSortable` returns:
 *   setNodeRef   — ref to attach to the DOM node (registers with DnD engine)
 *   transform    — CSS transform to apply during drag (moves the ghost element)
 *   transition   — CSS transition string for smooth drop animation
 *   isDragging   — true while this item is being dragged
 *   attributes   — ARIA attributes for accessibility
 *   listeners    — pointer/keyboard event handlers for the drag handle
 *
 * WHY apply transform/transition via `style` instead of className?
 *   The transform values are dynamic (different every animation frame during
 *   drag). Inline styles are more efficient than generating unique Tailwind
 *   classes for every possible transform value.
 *
 * ─── IMPROVEMENT IDEAS ────────────────────────────────────────────────────────
 *   - Add a long-press gesture on mobile to enter "reorder mode".
 *   - Show a "Block type" badge in the corner (e.g. "Code", "Table").
 *   - Add keyboard shortcut (e.g. Backspace on empty block → delete).
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Columns2, Maximize2 } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { BlockPicker } from './BlockPicker';
import type { Block, BlockType } from './types';

type BlockWrapperProps = Readonly<{
  block: Block;
  children: React.ReactNode;
  onDelete: () => void;
  onAddAfter: (type: BlockType) => void;
  onToggleColSpan: () => void;
  /**
   * Which side to render the drag/add controls on.
   *
   * WHY this prop instead of computing it here?
   *   Determining the correct side requires knowing the block's position in the
   *   grid — information that exists in BlockEditor (which tracks all blocks and
   *   simulates grid placement). Passing it as a prop keeps BlockWrapper pure
   *   and avoids duplicating the grid-simulation logic.
   *
   * Defaults to 'left' (the standard position for single-column or first blocks).
   */
  controlsSide?: 'left' | 'right';
}>;

export function BlockWrapper({
  block,
  children,
  onDelete,
  onAddAfter,
  onToggleColSpan,
  controlsSide = 'left',
}: BlockWrapperProps) {
  /**
   * useSortable registers this block with the parent DndContext.
   *
   * The `id` must match the id used in SortableContext's `items` array.
   * During drag: transform positions this element as the "ghost".
   * After drop: transition animates the element back or to its new position.
   */
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  /**
   * Apply DnD transform and transition as inline styles.
   *
   * CSS.Transform.toString converts the DnD kit's internal Transform object
   * (x, y, scaleX, scaleY) into a CSS transform string like
   * "translate3d(0px, -80px, 0) scaleX(1) scaleY(1)".
   */
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { t } = useI18n();
  const isHalf = block.colSpan === 1;
  const isRight = controlsSide === 'right';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // `group/block` creates a scoped Tailwind group so `group-hover/block:`
        // selectors only activate when THIS wrapper is hovered, not any ancestor.
        'group/block relative',
        // Mobile: always full-width (col-span-full = 1/-1, spans all columns).
        //   `col-span-1` or `col-span-2` on a 1-column grid can create implicit
        //   extra columns, breaking the layout. col-span-full is always safe.
        // Desktop (sm+): apply the actual half/full span.
        isHalf ? 'col-span-full sm:col-span-1' : 'col-span-full sm:col-span-2',
        // Raise z-index and dim the block while it's being dragged
        isDragging && 'z-50 opacity-50',
      )}
    >
      {/**
       * Side controls: drag handle + "add block after" picker.
       *
       * `hidden sm:flex` — invisible on mobile (< 640 px) where:
       *   a) There is no gutter (the grid is single-column with pl-0).
       *   b) Touch devices don't support hover, so the controls would
       *      never appear anyway.
       *
       * The `-left-10` / `-right-10` positioning places the controls
       * inside the pl-12 gutter of the parent grid, just outside the block.
       */}
      <div
        className={cn(
          'absolute top-0 hidden h-full flex-col items-center gap-1 pt-1 opacity-0 transition-opacity group-hover/block:opacity-100 sm:flex',
          isRight ? '-right-10' : '-left-10',
        )}
      >
        {/**
         * Drag handle button.
         *
         * WHY spread {...attributes} and {...listeners} on the handle instead
         * of the wrapper div?
         *   Spreading on the wrapper would make the entire block a drag target,
         *   preventing normal click/type interactions inside the block. Isolating
         *   DnD to the handle gives users a clear affordance for dragging.
         *
         * `cursor-grab` / `active:cursor-grabbing` gives visual feedback that
         * this is the drag initiator.
         */}
        <button
          type="button"
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
          aria-label={t('block.dragToReorder')}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>

        {/* "Add block below" — opens the BlockPicker in compact mode */}
        <BlockPicker onSelect={onAddAfter} compact />
      </div>

      {/**
       * Top-corner controls: width toggle + delete.
       *
       * MOBILE POSITIONING (< sm, 640 px)
       *   Always inside the block at the top-right corner (`top-1 right-1`).
       *   No translation — controls stay within block bounds so they never
       *   overlap the block above or below in the single-column stack.
       *   Always visible (`opacity-100`) because touch devices don't support hover.
       *
       *   We intentionally ignore `isRight` on mobile because:
       *   - All blocks are full-width (single column), so "left column" vs
       *     "right column" is meaningless.
       *   - Placing some controls on the left and some on the right (based on
       *     desktop column assignment) looks inconsistent on mobile.
       *
       * DESKTOP POSITIONING (sm+)
       *   Positioned at the block's top edge, half outside (`-translate-y-1/2`),
       *   giving a clean "badge" appearance that doesn't steal content space.
       *   isRight=false → `right-0 translate-x-1`  (top-right, badge outside)
       *   isRight=true  → `left-0 -translate-x-1`  (top-left, badge outside)
       *   Hidden until hover (`sm:opacity-0 sm:group-hover/block:opacity-100`).
       */}
      <div
        className={cn(
          'absolute z-10 flex items-center gap-1',
          // Mobile: inside block, always at top-right, always visible
          'top-1 right-1 opacity-100',
          // Desktop: at block edge, position depends on column, hover-only
          'sm:top-0 sm:right-auto sm:-translate-y-1/2',
          'sm:opacity-0 sm:transition-opacity sm:group-hover/block:opacity-100',
          isRight ? 'sm:left-0 sm:-translate-x-1' : 'sm:right-0 sm:translate-x-1',
        )}
      >
        {/**
         * Width toggle button.
         *
         * Columns2 icon → currently full-width, click to make half-width.
         * Maximize2 icon → currently half-width, click to expand to full-width.
         *
         * On mobile this button is always visible but only has a visible effect
         * on desktop (single-column grids treat half and full width identically).
         */}
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
          aria-label={isHalf ? t('block.expandToFull') : t('block.shrinkToHalf')}
          title={isHalf ? t('block.fullWidth') : t('block.halfWidth')}
          onClick={onToggleColSpan}
        >
          {isHalf ? <Maximize2 size={11} /> : <Columns2 size={11} />}
        </button>

        {/* Delete button — red hover state reinforces the destructive action */}
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label={t('block.deleteBlock')}
          onClick={onDelete}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/**
       * Block content.
       *
       * On mobile the corner controls sit at `top-1 right-1` inside the block.
       * Most block components have their own internal padding (toolbar, header
       * bar, etc.) that provides enough clearance. If a future block type has
       * no internal top padding, add `pt-8 sm:pt-0` here to push content below
       * the floating controls.
       */}
      {children}
    </div>
  );
}
