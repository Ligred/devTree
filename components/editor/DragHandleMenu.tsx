'use client';

/**
 * DragHandleMenu
 *
 * Intercepts click events on the GlobalDragHandle's .drag-handle element
 * and shows a context menu with block-level actions:
 *   • Insert block above / below
 *   • Duplicate block
 *   • Delete block
 *
 * Implementation notes:
 *   - Menu is rendered via createPortal on document.body so it is never
 *     clipped by overflow:hidden ancestors.
 *   - Position is viewport-clamped so the menu never goes off-screen.
 *   - onPointerDown (not mousedown) is used on buttons to avoid blur races.
 *   - The menu element itself is NOT inside any aria-hidden subtree.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

const MENU_WIDTH = 180;
const MENU_HEIGHT_ESTIMATE = 152; // rough height for viewport clamping

type MenuState = {
  x: number;
  y: number;
  nodePos: number;
} | null;

type Props = {
  editor: Editor;
};

export function DragHandleMenu({ editor }: Props) {
  const [menu, setMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /**
   * Keep a ref that's ALWAYS in sync with the latest `menu` state.
   * Updating it inline during render (not in useEffect) means the click
   * handler can read the current value synchronously — no stale-closure risk.
   */
  const menuStateRef = useRef<MenuState>(null);
  menuStateRef.current = menu; // inline update every render

  // ── Clamp position inside the viewport ───────────────────────────────────
  const clampPosition = useCallback((x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.min(Math.max(x, 8), vw - MENU_WIDTH - 8),
      y: Math.min(Math.max(y, 8), vh - MENU_HEIGHT_ESTIMATE - 8),
    };
  }, []);

  // ── Click listener on .drag-handle ────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.drag-handle')) return;
      e.preventDefault();
      e.stopPropagation();

      // Toggle: if the menu is already open, close it
      if (menuStateRef.current !== null) {
        setMenu(null);
        return;
      }

      // Find the ProseMirror node position at the drag handle location.
      const dragHandle = target.closest('.drag-handle') as HTMLElement;
      const rect = dragHandle.getBoundingClientRect();
      // Probe slightly to the RIGHT of the drag handle, at its vertical centre.
      // offset 50 accounts for the editor's left padding so posAtCoords lands
      // inside the actual content area.
      const probeX = rect.right + 50;
      const probeY = rect.top + rect.height / 2;

      const pmPos = editor.view.posAtCoords({ left: probeX, top: probeY });
      if (pmPos == null) return;

      const $pos = editor.state.doc.resolve(pmPos.pos);
      const nodePos = $pos.depth > 0 ? $pos.before(1) : pmPos.pos;

      const { x, y } = clampPosition(rect.right + 8, rect.top);
      setMenu({ x, y, nodePos });
    };

    // Capture phase on document ensures we catch it even if inner handlers
    // call stopPropagation.
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [editor, clampPosition]);

  // ── Close on outside pointer-down or Escape ───────────────────────────────
  useEffect(() => {
    if (!menu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // Let the click-handler toggle if the user clicks the drag handle again.
      if (target.closest?.('.drag-handle')) return;
      // Don't close when clicking inside the menu itself.
      if (menuRef.current?.contains(target)) return;
      setMenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    // Use capture so we see it before any React handler calls stopPropagation.
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [menu]);

  // ── Block-level commands ───────────────────────────────────────────────────

  const withNode = useCallback(
    (fn: (pos: number) => void) => {
      if (!menu) return;
      const pos = menu.nodePos;
      setMenu(null);
      fn(pos);
      // Defer focus so the editor regains it after the portal unmounts
      requestAnimationFrame(() => editor.view.focus());
    },
    [menu, editor],
  );

  const handleInsertAbove = useCallback(() =>
    withNode((pos) => {
      editor.chain().insertContentAt(pos, { type: 'paragraph' }).run();
    }),
  [withNode, editor]);

  const handleInsertBelow = useCallback(() =>
    withNode((pos) => {
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;
      editor.chain().insertContentAt(pos + node.nodeSize, { type: 'paragraph' }).run();
    }),
  [withNode, editor]);

  const handleDuplicate = useCallback(() =>
    withNode((pos) => {
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;
      editor.chain().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
    }),
  [withNode, editor]);

  const handleDelete = useCallback(() =>
    withNode((pos) => {
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;
      editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
    }),
  [withNode, editor]);

  if (!menu) return null;

  return createPortal(
    // Rendered directly on document.body — outside any aria-hidden subtree —
    // so screen-reader focus is never trapped by ancestor dialogs/overlays.
    <div
      ref={menuRef}
      role="menu"
      aria-label="Block actions"
      className="fixed z-[9999] min-w-45 rounded-lg border border-border bg-popover p-1 shadow-xl"
      style={{ left: menu.x, top: menu.y }}
      // Stop the pointerdown from bubbling to the document close-listener
      onPointerDown={(e) => e.stopPropagation()}
    >
      <MenuItem icon={<ArrowUp size={13} />}   label="Insert above" onClick={handleInsertAbove} />
      <MenuItem icon={<ArrowDown size={13} />} label="Insert below" onClick={handleInsertBelow} />
      <MenuItem icon={<Copy size={13} />}      label="Duplicate"    onClick={handleDuplicate} />
      <div className="my-1 border-t border-border" />
      <MenuItem icon={<Trash2 size={13} />}    label="Delete block" onClick={handleDelete} danger />
    </div>,
    document.body,
  );
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}>) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
      }`}
      // onPointerDown fires before the document pointerdown close-listener,
      // e.preventDefault() prevents stealing focus from the editor,
      // e.stopPropagation() prevents the doc listener from closing the menu.
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
      {label}
    </button>
  );
}
