'use client';

/**
 * FolderRenameRow — the custom row renderer for every item in the file tree.
 *
 * This component is passed as `renderItem` to `FileExplorer`/`TreeView` so
 * each tree row can show:
 *   - The correct icon (FileCode for pages, Folder for folders)
 *   - An inline rename input for folders (double-click to activate)
 *   - Hover action buttons (create file, create folder, delete)
 *
 * ─── WHY A SEPARATE RENDERITEM? ───────────────────────────────────────────────
 *
 * The base `TreeView` component is generic — it knows nothing about folders,
 * pages, or rename editing. By passing `renderItem` we customise the row
 * content while keeping `TreeView` reusable for other contexts.
 *
 * ─── RENAME UX ────────────────────────────────────────────────────────────────
 *
 * Folders only: double-click the name to enter edit mode. An <input> replaces
 * the name span. On blur or Enter the new name is committed; Escape cancels.
 * Files (leaves) are renamed by their page title inside the main editor.
 *
 * ─── HOVER ACTIONS ────────────────────────────────────────────────────────────
 *
 * Actions are passed in via `item.actions` from `buildTreeData.tsx`.
 * They are shown when `group-hover` is active on the ancestor tree row.
 * Using `ml-auto hidden group-hover:flex` (no absolute positioning) keeps
 * the layout in normal flow — no `position: relative` wrapper needed, and
 * the actions won't overflow outside the row.
 *
 * ─── LAYOUT INTEGRATION ───────────────────────────────────────────────────────
 *
 * This component renders only the CONTENT part of the row. The outer row
 * element (with flex, padding, hover highlight) is provided by `TreeLeaf` or
 * `TreeNode` in tree-view.tsx. This component fills the remaining flex space
 * with `flex-1 min-w-0`.
 *
 * IMPROVEMENT: Add an "emoji picker" popover triggered by clicking the icon to
 * let users assign custom page icons.
 */
import React, { useEffect, useRef, useState } from 'react';

import { FileCode, Folder } from 'lucide-react';

import type { TreeDataItem } from '@/components/shared/ui/tree-view';
import { TruncatedText } from '@/components/shared/ui/TruncatedText';

type FolderRenameRowParams = Readonly<{
  item: TreeDataItem;
  isLeaf: boolean;
  isSelected: boolean;
  onRenameFolder: (id: string, name: string) => boolean;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
}>;

export function FolderRenameRow({
  item,
  isLeaf,
  isSelected: _isSelected,
  onRenameFolder,
  editingFolderId,
  setEditingFolderId,
}: FolderRenameRowParams) {
  const [editName, setEditName] = useState(item.name);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = !isLeaf && editingFolderId === item.id;

  // Auto-focus + select-all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== item.name) {
      const success = onRenameFolder(item.id, trimmed);
      if (!success) {
        setHasError(true);
        return;
      }
    }
    setHasError(false);
    setEditingFolderId(null);
  };

  const startEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setEditName(item.name); // Sync to current name at the moment editing begins
    setHasError(false);
    setEditingFolderId(item.id);
  };

  const Icon = isLeaf ? FileCode : Folder;

  // ── Name content varies by mode ─────────────────────────────────────────────
  let nameContent: React.ReactNode;

  if (isLeaf) {
    // Files can't be renamed inline — the page title is the canonical name
    nameContent = <TruncatedText className="min-w-0 flex-1 text-sm">{item.name}</TruncatedText>;
  } else if (isEditing) {
    nameContent = (
      <input
        ref={inputRef}
        type="text"
        aria-invalid={hasError}
        className={
          hasError
            ? 'border-destructive bg-background focus:ring-destructive/20 min-w-0 flex-1 rounded border px-1 py-0.5 text-sm focus:ring-1 focus:outline-none'
            : 'border-primary/30 bg-background focus:ring-primary min-w-0 flex-1 rounded border px-1 py-0.5 text-sm focus:ring-1 focus:outline-none'
        }
        value={editName}
        onChange={(e) => {
          setEditName(e.target.value);
          if (hasError) setHasError(false);
        }}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCommit();
          if (e.key === 'Escape') {
            setEditName(item.name);
            setEditingFolderId(null);
            // Don't blur() here — it would fire onBlur → handleCommit
            // before the state update takes effect. The input unmounts
            // naturally when the parent sets editingFolderId to null.
          }
        }}
        // Prevent the tree row from also handling this click (would toggle expand)
        onClick={(e) => e.stopPropagation()}
      />
    );
  } else {
    nameContent = (
      <TruncatedText className="min-w-0 flex-1 text-sm" onDoubleClick={startEdit}>
        {item.name}
      </TruncatedText>
    );
  }

  return (
    /**
     * `flex-1 min-w-0` — fills the remaining row space after the chevron/spacer
     * that TreeNode/TreeLeaf renders. `min-w-0` allows text to be truncated
     * (without it, a flex child won't shrink below its content width).
     *
     * WHY NOT `w-full`?
     *   `width: 100%` in a flex context means "as wide as the parent", which
     *   combined with a sibling chevron element causes the total row width to
     *   exceed the container. `flex-1 min-w-0` is the correct way to say
     *   "fill whatever space is left".
     */
    <div className="flex min-w-0 flex-1 items-center">
      <Icon className="text-muted-foreground mr-2 h-4 w-4 shrink-0" aria-hidden />

      {nameContent}

      {/**
       * Action buttons (create file, create folder, delete).
       *
       * `ml-auto` pushes the actions to the far right of the row.
       * `hidden group-hover:flex` shows them only when the tree row
       * (`group` ancestor) is hovered — no absolute positioning needed,
       * which means the actions stay in normal flow and never clip outside
       * the row boundary.
       *
       * WHY `pl-1`? Gives a small visual gap between the name and the icons
       * so they don't feel cramped when the name is at max length.
       */}
      {item.actions && (
        // `flex opacity-0` keeps the action icons in layout flow so showing
        // them on hover doesn't shift the folder name left.
        <span className="ml-auto flex shrink-0 pl-1 opacity-0 transition-opacity group-hover:opacity-100">
          {item.actions}
        </span>
      )}
    </div>
  );
}
