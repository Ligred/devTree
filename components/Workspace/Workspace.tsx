'use client';

/**
 * Workspace — the top-level application shell.
 *
 * Layout overview:
 * ┌─────────────┬──────────────────────────────────────────────────┐
 * │   Sidebar   │                 MainContent                      │
 * │  (w-64)     │  Header | Editor | Stats footer                 │
 * │             │                                                  │
 * └─────────────┴──────────────────────────────────────────────────┘
 *
 * On mobile (<768 px) the sidebar is hidden behind a full-screen overlay
 * drawer. A hamburger button in MainContent's header reveals it.
 *
 * STATE DESIGN
 *   All application state lives here (lifted state). Child components receive
 *   data as props and call callbacks to request changes. This makes the data
 *   flow predictable and keeps individual components pure / testable.
 *
 *   Alternatives considered:
 *   - React Context: useful when deeply nested components need the same data.
 *     Overkill for two levels of nesting.
 *   - Zustand/Redux: worth adding when the state grows beyond a single file
 *     (e.g. multi-user collaboration, undo history, persistence middleware).
 *
 * IMMUTABILITY
 *   All state updates use spread/map/filter to produce new arrays/objects.
 *   This ensures React can detect changes via referential equality (Object.is)
 *   and re-render only the affected subtree.
 *
 * IMPROVEMENT IDEAS:
 *   - Persist state to localStorage or a backend database.
 *   - Add an undo/redo stack using the command pattern.
 *   - Support real-time collaboration via WebSockets (e.g. Liveblocks, Yjs).
 *   - Add page tags/labels for better organisation at scale.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FilePlus, FolderPlus, Search, X } from 'lucide-react';

import { FileExplorer } from '@/components/FileExplorer/FileExplorer';
import { MainContent, type Page, type Block } from '@/components/MainContent';
import type { TreeDataItem } from '@/components/ui/tree-view';
import { useI18n } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/settingsStore';
import { cn } from '@/lib/utils';

import { buildTreeDataWithActions } from './buildTreeData';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { FolderRenameRow } from './FolderRenameRow';
import { samplePages } from './samplePages';
import type { TreeRoot } from './treeTypes';
import { ROOT_DROP_TARGET_ID, ROOT_ID } from './treeTypes';
import {
  addFileUnder,
  addFolderUnder,
  collectPageIdsInSubtree,
  countDescendants,
  findNodeInRoot,
  getAncestorPath,
  getParentId,
  moveNode,
  newPageId,
  removeNode,
  renameNode,
} from './treeUtils';

/**
 * Initial tree structure bootstrapped from sample pages.
 *
 * WHY build from samplePages?
 *   The tree and the page list must stay in sync (every tree leaf node must have
 *   a corresponding page in the `pages` array). Deriving the initial tree from
 *   samplePages ensures they always match without manual duplication.
 */
const initialTreeRoot: TreeRoot = {
  id: ROOT_ID,
  name: 'My learning',
  children: samplePages.map((p) => ({
    id: p.id,
    name: p.title,
    pageId: p.id,
  })),
};

/** Create a blank page with the given id and title. */
const emptyPage = (id: string, title: string): Page => ({
  id,
  title,
  blocks: [],
});

const I18N_CLEAR_TAG_FILTER = 'sidebar.clearTagFilter';

export function Workspace() {
  // ─── Core data state ────────────────────────────────────────────────────────

  /**
   * `pages` — flat array of all page data (id, title, blocks).
   *
   * WHY flat array instead of a tree?
   *   Blocks are only needed for the active page. Keeping all pages flat makes
   *   look-up O(n) and avoids the complexity of deep-nesting block mutations.
   *   The hierarchy is expressed separately in `treeRoot`.
   */
  const [pages, setPages] = useState<Page[]>(samplePages);

  /**
   * `treeRoot` — the sidebar file-tree structure (folders + page references).
   *
   * WHY separate from `pages`?
   *   The tree stores hierarchy (folders) which pages themselves don't need.
   *   A tree node for a page contains only { id, name, pageId } — a pointer to
   *   the actual page data. This separation keeps the tree manipulation logic
   *   independent of block-editing logic.
   */
  const [treeRoot, setTreeRoot] = useState<TreeRoot>(initialTreeRoot);

  /** The id of the page currently displayed in the editor. null = none selected. */
  const [activePageId, setActivePageId] = useState<string | null>(
    samplePages[0]?.id ?? null,
  );

  // ─── UI state ────────────────────────────────────────────────────────────────

  /** Which folder (by id) is currently in rename-edit mode. */
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  /** Pending delete confirmation (null = dialog closed). */
  const [deleteDialog, setDeleteDialog] = useState<{
    nodeId: string;
    title: string;
    description: string;
  } | null>(null);

  /** Whether the desktop sidebar is collapsed to a thin icon strip. */
  const [leftPanelHidden, setLeftPanelHidden] = useState(false);

  /**
   * Whether the mobile sidebar overlay is open.
   *
   * This is independent from `leftPanelHidden` because:
   *   - On desktop, `leftPanelHidden` controls a static collapse.
   *   - On mobile, `mobileSidebarOpen` controls a full-screen overlay drawer.
   *   A desktop-collapsed sidebar should not automatically open on mobile.
   */
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /** "Saved" feedback: true for 2 seconds after the user saves. */
  const [saveFeedback, setSaveFeedback] = useState(false);

  /** Search query for filtering pages in the sidebar. */
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Active tag filters — pages must include ALL selected tags (AND logic).
   *
   * WHY a string[] (multi-tag) instead of a single string?
   *   AND-logic multi-tag filtering lets users drill down precisely:
   *   selecting "react" + "hooks" shows only pages tagged with both.
   *   Toggling a tag on/off (if already selected it is removed) makes it
   *   easy to explore combinations without a separate "clear" flow per tag.
   *
   *   OR-logic (any tag) would show too many results and reduce usefulness.
   */
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { t } = useI18n();
  const tagsPerPageEnabled = useSettingsStore((s) => s.tagsPerPageEnabled);

  // When page tags are disabled, clear the sidebar tag filter so we don't filter by tags invisibly.
  useEffect(() => {
    if (!tagsPerPageEnabled) setActiveTags([]);
  }, [tagsPerPageEnabled]);

  // ─── Derived values ──────────────────────────────────────────────────────────

  /**
   * The full Page object for the currently selected page.
   *
   * WHY useMemo?
   *   `pages` can contain dozens of entries. Memoising the find prevents
   *   re-running the array scan on every render unrelated to pages or activePageId.
   */
  const activePage = useMemo(
    () => (activePageId ? pages.find((p) => p.id === activePageId) ?? null : null),
    [pages, activePageId],
  );

  /**
   * Ids of all ancestor nodes of the active page (used to auto-expand folders).
   *
   * WHY useMemo?
   *   Path traversal is O(depth × nodes). Memoising avoids redundant traversal
   *   on renders not triggered by tree/page changes.
   */
  const ancestorPathIds = useMemo(
    () => (activePageId ? getAncestorPath(treeRoot, activePageId) : []),
    [treeRoot, activePageId],
  );

  /**
   * Pages filtered by the current search query.
   *
   * WHY search both title and block content?
   *   Users may not remember the exact page title but remember a keyword from
   *   the content. Searching block content makes the search more useful.
   *
   * WHY null instead of empty array when no query?
   *   null signals "no filter active" so we can render the full tree. An empty
   *   array would incorrectly show "no results" for an empty search.
   *
   * IMPROVEMENT: Debounce the query to avoid re-filtering on every keystroke.
   * Use a library like `fuse.js` for fuzzy / ranked search results.
   */
  /**
   * All unique tags across all pages, sorted alphabetically.
   *
   * Shown as a tag cloud in the sidebar so users can click to filter.
   * Computed from the live `pages` array so new tags appear immediately.
   */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const page of pages) {
      for (const tag of page.tags ?? []) tagSet.add(tag);
    }
    return [...tagSet].sort((a, b) => a.localeCompare(b));
  }, [pages]);

  /**
   * Toggle a tag in the active filter set.
   *
   * WHY useCallback?
   *   This function is passed to JSX onClick handlers inside a .map() loop.
   *   Without memoisation every render would create new function instances,
   *   causing unnecessary re-renders of all tag buttons.
   *
   *   Extracting it also flattens the nesting depth inside the JSX, which
   *   satisfies SonarQube's "no functions nested more than 4 levels" rule.
   */
  const toggleTag = useCallback(
    (tag: string) =>
      setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    [],
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasTagFilter = activeTags.length > 0;

    // No active filters → show the full tree unchanged
    if (!hasQuery && !hasTagFilter) return null;

    return pages.filter((page) => {
      // AND-logic tag filter: page must carry every selected tag
      if (hasTagFilter) {
        const pageTags = page.tags ?? [];
        if (!activeTags.every((t) => pageTags.includes(t))) return false;
      }

      // Text filter: title or any block's content must contain the query
      if (hasQuery) {
        if (page.title.toLowerCase().includes(q)) return true;
        return page.blocks.some((block) => {
          if (typeof block.content === 'string') {
            // Strip HTML tags before matching. The regex is bounded by `>` so
            // it cannot backtrack super-linearly.
            // eslint-disable-next-line sonarjs/slow-regex -- bounded by `>`, safe for this input size
            return block.content.replaceAll(/<[^>]+>/g, '').toLowerCase().includes(q);
          }
          return JSON.stringify(block.content).toLowerCase().includes(q);
        });
      }

      return true; // tag filter(s) matched, no text filter required
    });
  }, [pages, searchQuery, activeTags]);

  // ─── Callbacks ───────────────────────────────────────────────────────────────
  // IMPORTANT: createFile, createFolder, handleDeleteNode must be defined
  // BEFORE the treeData useMemo that references them. JavaScript `const`
  // declarations are NOT hoisted — accessing them before their declaration
  // throws a "Cannot access before initialization" ReferenceError.

  /**
   * Create a new folder under the given parent.
   *
   * WHY useCallback?
   *   This function is referenced in the memoised `treeData` computation.
   *   Without useCallback a new function reference is created on every render,
   *   invalidating the treeData memo every time.
   */
  const createFolder = useCallback((parentId: string) => {
    setTreeRoot((root) => addFolderUnder(root, parentId, 'New folder'));
  }, []);

  /**
   * Create a new page under the given parent and immediately select it.
   *
   * WHY both setPages AND setTreeRoot?
   *   Page data (content) lives in `pages`; the tree entry (hierarchy) lives in
   *   `treeRoot`. Both must be updated atomically to keep them in sync.
   */
  const createFile = useCallback((parentId: string) => {
    const pageId = newPageId();
    const newPage = emptyPage(pageId, 'Untitled');
    setPages((prev) => [...prev, newPage]);
    setTreeRoot((root) => addFileUnder(root, parentId, pageId, newPage.title));
    setActivePageId(pageId);
  }, []);

  /**
   * Open the delete-confirmation dialog for a node.
   *
   * WHY a dialog instead of direct deletion?
   *   Deleting a folder removes all its descendants. A confirmation step
   *   prevents accidental data loss — one of the most important UX patterns
   *   for destructive actions.
   */
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const node = findNodeInRoot(treeRoot, nodeId);
      if (!node) return;

      const isFile = node.pageId != null;
      const count = countDescendants(node);

      const title = isFile ? t('delete.pageTitle') : t('delete.folderTitle');
      let description: string;
      if (isFile) {
        description = t('delete.pageDescription', { name: node.name });
      } else if (count > 1) {
        description = t('delete.folderDescription', { name: node.name, count: count - 1 });
      } else {
        description = t('delete.folderDescriptionOnly', { name: node.name });
      }

      setDeleteDialog({ nodeId, title, description });
    },
    [treeRoot, t],
  );

  /**
   * TreeDataItem array built from the tree root with action callbacks injected.
   *
   * WHY buildTreeDataWithActions?
   *   TreeDataItem (from the UI component) needs context-menu action callbacks
   *   (create, delete, rename). We generate those here where the state setters
   *   are available, then pass the resulting static tree to the pure FileExplorer.
   */
  const treeData: TreeDataItem[] = useMemo(
    () =>
      buildTreeDataWithActions({
        root: treeRoot,
        onCreateFile: createFile,
        onCreateFolder: createFolder,
        onDelete: handleDeleteNode,
        selectedPageId: activePageId,
        ancestorPathIds,
        t,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [treeRoot, activePageId, ancestorPathIds, t],
  );

  /**
   * Confirm deletion: remove the node from the tree and the associated pages.
   *
   * WHY collect page ids from the subtree before removing?
   *   A deleted folder may contain many nested pages. We must remove all of them
   *   from the `pages` array. `collectPageIdsInSubtree` traverses the removed
   *   node recursively to find all page ids.
   */
  const handleConfirmDelete = useCallback(() => {
    if (!deleteDialog) return;
    const { nodeId } = deleteDialog;

    // Compute outside the setter to avoid deeply nested callbacks (sonarjs)
    const { root: nextRoot, removed } = removeNode(treeRoot, nodeId);
    if (!removed) return;
    const pageIdsToRemove = collectPageIdsInSubtree(removed);

    setTreeRoot(nextRoot);
    setPages((prevPages) => prevPages.filter((p) => !pageIdsToRemove.includes(p.id)));
    setActivePageId((current) => (pageIdsToRemove.includes(current ?? '') ? null : current));
    setDeleteDialog(null);
  }, [deleteDialog, treeRoot]);

  /**
   * Handle a drag-and-drop of one tree node onto another.
   *
   * WHY drop onto a file → move to file's parent (sibling)?
   *   Without this rule, dropping a folder onto a page node would make the
   *   folder a child of a leaf — which is semantically wrong (pages can't
   *   contain folders). We redirect to the file's parent folder instead.
   */
  const handleDocumentDrag = useCallback(
    (sourceItem: TreeDataItem, targetItem: TreeDataItem) => {
      setTreeRoot((root) => {
        const targetId =
          targetItem.id === ROOT_DROP_TARGET_ID
            ? targetItem.id
            : (() => {
                const node = findNodeInRoot(root, targetItem.id);
                // Redirect to parent if dropping onto a leaf (page)
                if (node?.pageId != null) return getParentId(root, targetItem.id);
                return targetItem.id;
              })();
        return moveNode(root, sourceItem.id, targetId);
      });
    },
    [],
  );

  const handleRenameFolder = useCallback(
    (folderId: string, name: string) => {
      setTreeRoot((root) => renameNode(root, folderId, name));
      setEditingFolderId(null);
    },
    [],
  );

  /**
   * Render a custom row component for each tree item.
   *
   * WHY useCallback?
   *   `renderTreeItem` is passed to FileExplorer which uses it as a render prop.
   *   Without memoisation, FileExplorer would re-render all tree rows on every
   *   Workspace render, even if only the active page changed.
   */
  const renderTreeItem = useCallback(
    (params: {
      item: TreeDataItem;
      isLeaf: boolean;
      isSelected: boolean;
      hasChildren: boolean;
    }) => (
      <FolderRenameRow
        item={params.item}
        isLeaf={params.isLeaf}
        isSelected={params.isSelected}
        onRenameFolder={handleRenameFolder}
        editingFolderId={editingFolderId}
        setEditingFolderId={setEditingFolderId}
      />
    ),
    [editingFolderId, handleRenameFolder],
  );

  /** Select a page when the user clicks on a tree leaf node. */
  const handleSelect = useCallback(
    (item: TreeDataItem | undefined) => {
      if (!item) return;
      const isFile = pages.some((p) => p.id === item.id);
      if (isFile) {
        setActivePageId(item.id);
        // Close mobile sidebar after selection for better UX
        setMobileSidebarOpen(false);
      }
    },
    [pages],
  );

  /** Sync page title changes into both the pages array and the tree node name. */
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!activePageId) return;
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, title } : p)),
      );
      setTreeRoot((root) => renameNode(root, activePageId, title));
    },
    [activePageId],
  );

  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      if (!activePageId) return;
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, blocks } : p)),
      );
    },
    [activePageId],
  );

  /** Update the tags for the active page. */
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      if (!activePageId) return;
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, tags } : p)),
      );
    },
    [activePageId],
  );

  /** Show "Saved!" feedback for 2 seconds then reset. */
  const handleSave = useCallback(() => {
    setSaveFeedback(true);
  }, []);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  /**
   * Reset the save feedback after a short delay.
   *
   * WHY useEffect instead of setTimeout in handleSave?
   *   useEffect ties the timeout lifecycle to the `saveFeedback` state value.
   *   If handleSave fires twice quickly the timeout is cleaned up and restarted,
   *   preventing the feedback from being stuck in "Saved!" indefinitely.
   */
  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(false), 2000);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  /**
   * Keyboard shortcut: Cmd/Ctrl+K focuses the search input.
   *
   * WHY on the Workspace level (not MainContent)?
   *   The search input lives in the sidebar, which is rendered by Workspace.
   *   The shortcut needs access to `searchInputRef` which is defined here.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        // On mobile, open the sidebar first so the input is visible
        setMobileSidebarOpen(true);
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    /**
     * Root container uses `h-screen` + `overflow-hidden` to create a
     * full-viewport fixed layout where only the inner scrollable areas
     * (sidebar tree, page content) overflow and scroll independently.
     */
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      {/**
       * Mobile backdrop — dims the page content when the sidebar drawer is open.
       *
       * WHY a separate backdrop div instead of CSS ::before?
       *   React renders this element only when needed (no wasted paint).
       *   It handles click-to-close without requiring an event listener on the
       *   sidebar itself.
       *
       * WHY md:hidden?
       *   On desktop the sidebar is a static element — no overlay is needed.
       */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─────────────────────────────────────────────────────────── */}

      {leftPanelHidden ? (
        /**
         * Collapsed sidebar — thin strip with a single expand button.
         * Only rendered on desktop (hidden on mobile).
         */
        <div className="hidden w-10 shrink-0 flex-col items-center border-r border-border bg-card py-3 md:flex">
          <button
            type="button"
            aria-label={t('sidebar.show')}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setLeftPanelHidden(false)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      ) : (
        /**
         * Full sidebar.
         *
         * Desktop layout:
         *   `md:relative md:z-auto md:translate-x-0` — normal flow element,
         *   always visible, not animated.
         *
         * Mobile layout:
         *   `fixed inset-y-0 left-0 z-50` — positioned over the page content.
         *   `transition-transform duration-200` — slides in/out.
         *   `mobileSidebarOpen ? translate-x-0 : -translate-x-full` — controls
         *   visibility via CSS transform (GPU-accelerated, no layout reflow).
         *
         * WHY translate instead of display:none?
         *   The sidebar stays in the DOM; the tree, search state, and scroll
         *   position are preserved when the drawer is toggled.
         */
        <aside
          className={cn(
            'flex w-64 shrink-0 flex-col border-r border-border bg-card shadow-sm',
            'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
            'md:relative md:z-auto',
            // Mobile: translate based on state. Desktop (md+): always visible
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'md:translate-x-0',
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h1 className="text-xl font-semibold tracking-tight text-primary">
              {t('app.title')}
            </h1>
            <button
              type="button"
              aria-label={t('sidebar.hide')}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setLeftPanelHidden(true)}
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* New page / folder buttons */}
          <div className="flex gap-2 border-b border-border px-3 py-3">
            <button
              type="button"
              aria-label={t('sidebar.newPage')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => createFile(ROOT_ID)}
            >
              <FilePlus size={16} />
              {t('sidebar.newPage')}
            </button>
            <button
              type="button"
              aria-label={t('sidebar.newFolder')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => createFolder(ROOT_ID)}
            >
              <FolderPlus size={16} />
              {t('sidebar.newFolder')}
            </button>
          </div>

          {/**
           * Search input.
           *
           * WHY in the sidebar?
           *   Search scopes to pages in the tree — it naturally belongs next to
           *   the tree it's filtering.
           *
           * WHY Cmd+K shortcut?
           *   Cmd+K is the de-facto standard for "open search" in developer tools
           *   (VS Code, Linear, Raycast, etc.). Users expect it without reading docs.
           */}
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
              <Search size={14} className="shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sidebar.search')}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/**
           * Tag cloud — shows all unique tags as clickable chips.
           *
           * WHY in the sidebar?
           *   Tags are a navigation tool, just like the file tree. Placing them
           *   in the sidebar keeps all navigation in one place.
           *
           * Clicking a chip toggles it in `activeTags`; AND logic requires all
           * (toggle behaviour). The active tag is highlighted with indigo.
           *
           * Hidden when there are no tags yet (freshly created workspace).
           */}
          {/**
           * Tag cloud — every unique tag across all pages.
           *
           * Active tags (highlighted indigo) can be toggled off by clicking again.
           * Inactive tags can be toggled on. Multiple tags can be active at once;
           * the filter uses AND logic (page must have all selected tags).
           *
           * "Clear all" button appears only when at least one tag is active.
           */}
          {tagsPerPageEnabled && allTags.length > 0 && (
            <div className="border-b border-border px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {activeTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTags([])}
                    className="flex items-center gap-1 rounded-full border border-indigo-300 px-2 py-0.5 text-xs text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                    title={t(I18N_CLEAR_TAG_FILTER)}
                  >
                    <X size={9} />
                    {t(I18N_CLEAR_TAG_FILTER)}
                  </button>
                )}
                {allTags.map((tag) => {
                  const isActive = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-indigo-400 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300',
                      )}
                      title={isActive ? t(I18N_CLEAR_TAG_FILTER) : t('sidebar.filterByTag')}
                      aria-pressed={isActive}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tree / search results */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {searchResults === null ? (
              /* Normal tree view — no active search filter */
              <>
                <p className="px-3 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('sidebar.pages')}
                </p>
                <FileExplorer
                  data={treeData}
                  onSelect={handleSelect}
                  onDocumentDrag={handleDocumentDrag}
                  renderItem={renderTreeItem}
                  rootDropLabel={t('tree.dropToRoot')}
                />
              </>
            ) : (
              /**
               * Search results — flat list of matching pages.
               *
               * WHY a flat list instead of the tree during search?
               *   Search results span across folders. Showing the tree with
               *   non-matching nodes hidden (and empty folders) is confusing.
               *   A flat list with page names is simpler and faster to scan.
               */
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {searchResults.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">
                    {t('sidebar.noResults', { query: searchQuery })}
                  </p>
                ) : (
                  searchResults.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      className={cn(
                        'flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition-colors',
                        page.id === activePageId
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-accent/50',
                      )}
                      onClick={() => {
                        setActivePageId(page.id);
                        setMobileSidebarOpen(false);
                        setSearchQuery('');
                        setActiveTags([]);
                      }}
                    >
                      <span className="truncate font-medium">{page.title}</span>
                      {(page.tags ?? []).length > 0 && (
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {(page.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ─── Main content area ───────────────────────────────────────────────── */}
      <MainContent
        page={activePage}
        onSave={handleSave}
        saved={saveFeedback}
        onTitleChange={handleTitleChange}
        onBlocksChange={handleBlocksChange}
        onTagsChange={handleTagsChange}
        onMobileSidebarToggle={() => setMobileSidebarOpen((v) => !v)}
      />

      <DeleteConfirmDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}
        title={deleteDialog?.title ?? ''}
        description={deleteDialog?.description ?? ''}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
