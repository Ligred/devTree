'use client';

/**
 * buildTreeData.tsx — converts the internal TreeRoot model into the
 * TreeDataItem[] format expected by the FileExplorer / tree-view UI component.
 *
 * ─── WHY A SEPARATE FILE? ─────────────────────────────────────────────────────
 *
 * This file is the "adapter layer" between the app's domain model (TreeRoot /
 * TreeNode) and the UI component's data format (TreeDataItem). Keeping it
 * separate from treeUtils.ts keeps the pure tree manipulation logic free from
 * UI concerns (JSX, icon imports, event handlers).
 *
 * ─── WHAT IT DOES ─────────────────────────────────────────────────────────────
 *
 * For each TreeNode it creates a TreeDataItem that includes:
 *   - The node's id and name.
 *   - Its children (recursively converted, folders only).
 *   - A JSX `actions` element — the icon buttons shown on hover (create file,
 *     create folder, delete) with keyboard accessibility.
 *   - A `className` for visual highlighting of the selected page and its
 *     ancestor folders.
 *   - `draggable: true` / `droppable: true` flags so the tree enables DnD.
 *
 * ─── KEYBOARD ACCESSIBILITY ───────────────────────────────────────────────────
 *
 * The action buttons use `role="button"` with an `onKeyDown` handler that
 * activates on Enter/Space — the standard pattern for custom interactive
 * elements that are not `<button>` elements. Why not use `<button>`?
 *   The tree-view component renders action slots as arbitrary JSX; using spans
 *   avoids nested `<button>` elements (which is invalid HTML if the tree row
 *   itself is a button) and gives full style control without browser defaults.
 *
 * IMPROVEMENT: Replace the span+role="button" pattern with actual `<button>`
 * elements and restructure the tree row to avoid nesting interactive elements.
 *
 * ─── VISUAL HIGHLIGHTING ──────────────────────────────────────────────────────
 *
 * Three visual states:
 *   Selected file     → `bg-accent text-accent-foreground` (full highlight)
 *   Ancestor folder   → `bg-muted/50 text-foreground`      (subtle highlight)
 *   Normal            → no className (inherits default tree styles)
 *
 * `ancestorPathIds` is precomputed in Workspace via `getAncestorPath()` so
 * this function doesn't need to traverse the tree — it just checks the id array.
 */

import React from 'react';
import { FilePlus, FolderPlus, Trash2 } from 'lucide-react';

import type { TreeDataItem } from '@/components/ui/tree-view';

import type { TreeRoot, TreeNode } from './treeTypes';

const nameCollator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
});

function isFolderNode(node: TreeNode): boolean {
  return Array.isArray(node.children) && node.pageId == null;
}

function compareTreeNodes(a: TreeNode, b: TreeNode): number {
  const aIsFolder = isFolderNode(a);
  const bIsFolder = isFolderNode(b);

  if (aIsFolder && !bIsFolder) return -1;
  if (!aIsFolder && bIsFolder) return 1;
  return nameCollator.compare(a.name, b.name);
}

/** Signature of the i18n translation function, passed in to avoid a context dependency. */
type TFunction = (key: string, params?: Record<string, string | number>) => string;

type BuildTreeDataParams = {
  root: TreeRoot;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  selectedPageId: string | null;
  ancestorPathIds: string[];
  t: TFunction;
};

/**
 * Recursively convert a single TreeNode into a TreeDataItem.
 *
 * WHY recursive instead of iterative?
 *   The tree has an unknown depth. Recursion is the natural algorithm for
 *   tree traversal — each call processes one node and recurses into children.
 *   For typical note-taking trees (< 100 nodes, < 5 levels deep) the call
 *   stack overhead is negligible.
 *
 * IMPROVEMENT: For very deep trees (> 50 levels), convert to an explicit stack
 * to avoid stack overflow. In practice, users won't create that many levels.
 */
function nodeToTreeDataItem(
  node: TreeNode,
  onCreateFile: (parentId: string) => void,
  onCreateFolder: (parentId: string) => void,
  onDelete: (nodeId: string) => void,
  selectedPageId: string | null,
  ancestorPathIds: string[],
  t: TFunction,
): TreeDataItem {
  // A node is a folder if it has a children array but no pageId.
  // A file (page) has a pageId but no children array.
  const isFolder = isFolderNode(node);

  const children = isFolder
    ? [...node.children!].sort(compareTreeNodes).map((n) =>
        nodeToTreeDataItem(n, onCreateFile, onCreateFolder, onDelete, selectedPageId, ancestorPathIds, t),
      )
    : undefined;

  // Determine which visual highlight class (if any) to apply
  const isSelectedFile = selectedPageId !== null && node.id === selectedPageId;
  const isAncestorOfSelected = ancestorPathIds.includes(node.id);
  let rowClassName: string | undefined;
  if (isSelectedFile) {
    rowClassName = 'bg-accent text-accent-foreground';
  } else if (isAncestorOfSelected) {
    rowClassName = 'bg-muted/50 text-foreground';
  }

  /**
   * Activate an action when the user presses Enter or Space on a keyboard-
   * focused action button. This implements the ARIA button keyboard contract.
   *
   * `e.stopPropagation()` prevents the tree row's own click handler from also
   * firing (which would try to select the node as a page).
   */
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  };

  /** Delete icon button — shown for both files and folders. */
  const deleteButton = (
    <span
      role="button"
      tabIndex={0}
      aria-label={t('tree.delete')}
      className="cursor-pointer rounded p-1 hover:bg-destructive/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
      onClick={(e) => {
        e.stopPropagation();
        onDelete(node.id);
      }}
      onKeyDown={(e) => handleKeyDown(e, () => onDelete(node.id))}
    >
      <Trash2 size={14} />
    </span>
  );

  /**
   * Action buttons rendered to the right of each tree row on hover.
   *
   * Folders get two extra actions: "New file" and "New folder" (to create
   * children). Files only get "Delete".
   */
  const actions = (
    <div className="flex items-center gap-0.5">
      {isFolder && (
        <>
          <span
            role="button"
            tabIndex={0}
            aria-label={t('tree.newFile')}
            className="cursor-pointer rounded p-1 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFile(node.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, () => onCreateFile(node.id))}
          >
            <FilePlus size={14} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label={t('tree.newFolder')}
            className="cursor-pointer rounded p-1 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder(node.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, () => onCreateFolder(node.id))}
          >
            <FolderPlus size={14} />
          </span>
        </>
      )}
      {deleteButton}
    </div>
  );

  return {
    id: node.id,
    name: node.name,
    ...(children ? { children } : {}),
    actions,
    draggable: true,
    droppable: true,
    ...(rowClassName ? { className: rowClassName } : {}),
  };
}

/**
 * Convert the entire tree root into a `TreeDataItem[]` ready for FileExplorer.
 *
 * Only the root's direct children are mapped — the root itself is not a visible
 * tree item (there's no "My learning" node in the sidebar; we start from its
 * children).
 */
export function buildTreeDataWithActions({
  root,
  onCreateFile,
  onCreateFolder,
  onDelete,
  selectedPageId,
  ancestorPathIds,
  t,
}: BuildTreeDataParams): TreeDataItem[] {
  return [...root.children].sort(compareTreeNodes).map((node) =>
    nodeToTreeDataItem(node, onCreateFile, onCreateFolder, onDelete, selectedPageId, ancestorPathIds, t),
  );
}
