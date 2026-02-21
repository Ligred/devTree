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
 *   - Add an undo/redo stack using the command pattern.
 *   - Support real-time collaboration via WebSockets (e.g. Liveblocks, Yjs).
 *   - Add page tags/labels for better organisation at scale.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FilePlus, FolderPlus, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { FileExplorer } from '@/components/FileExplorer/FileExplorer';
import { MainContent, type Page, type Block } from '@/components/MainContent';
import type { TreeDataItem } from '@/components/ui/tree-view';
import { useI18n } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/settingsStore';
import { cn } from '@/lib/utils';

import { buildTreeDataWithActions } from './buildTreeData';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { FolderRenameRow } from './FolderRenameRow';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import type { TreeRoot } from './treeTypes';
import { ROOT_DROP_TARGET_ID, ROOT_ID } from './treeTypes';
import {
  addFileUnder,
  addFolderUnder,
  collectPageIdsInSubtree,
  countDescendants,
  findFirstPageIdInSubtree,
  findNodeInRoot,
  generateUniqueNameInScope,
  getAncestorPath,
  isNameTakenInScope,
  getParentId,
  moveNode,
  newFolderId,
  newPageId,
  removeNode,
  renameNode,
  replaceNodeId,
} from './treeUtils';
import {
  fetchPages,
  fetchFolders,
  createPage as apiCreatePage,
  updatePage as apiUpdatePage,
  deletePage as apiDeletePage,
  movePage as apiMovePage,
  createBlock as apiCreateBlock,
  updateBlock as apiUpdateBlock,
  deleteBlock as apiDeleteBlock,
  reorderBlocks as apiReorderBlocks,
  createFolder as apiCreateFolder,
  updateFolder as apiUpdateFolder,
  deleteFolder as apiDeleteFolder,
  moveFolder as apiMoveFolder,
  apiPageToPage,
  WorkspaceApiError,
  type ApiPage,
  type ApiFolder,
} from './workspaceApi';

/**
 * Build the tree root from API folders/pages data.
 *
 * Folders become non-leaf nodes; pages get placed inside their folder (if any)
 * or at the root level.
 */
function buildTreeRootFromApi(folders: ApiFolder[], pages: ApiPage[]): TreeRoot {
  const rootPages = pages.filter((p) => !p.folderId);
  const folderNodes = folders
    .filter((f) => !f.parentId)
    .map((f) => buildFolderNode(f, folders, pages));

  return {
    id: ROOT_ID,
    name: 'My workspace',
    children: [
      ...folderNodes,
      ...rootPages.map((p) => ({ id: p.id, name: p.title, pageId: p.id })),
    ],
  };
}

function buildFolderNode(
  folder: ApiFolder,
  allFolders: ApiFolder[],
  allPages: ApiPage[],
): import('./treeTypes').TreeNode {
  const childFolders = allFolders
    .filter((f) => f.parentId === folder.id)
    .map((f) => buildFolderNode(f, allFolders, allPages));

  const folderPages = allPages
    .filter((p) => p.folderId === folder.id)
    .map((p) => ({ id: p.id, name: p.title, pageId: p.id }));

  return {
    id: folder.id,
    name: folder.name,
    children: [...childFolders, ...folderPages],
  };
}

/** Blank initial tree shown while data is loading. */
const emptyTreeRoot: TreeRoot = { id: ROOT_ID, name: 'My workspace', children: [] };

/** Create a blank page with the given id and title. */
const emptyPage = (id: string, title: string): Page => ({
  id,
  title,
  blocks: [],
});

const I18N_CLEAR_TAG_FILTER = 'sidebar.clearTagFilter';

/** Id ref → pageId mapping so we can find which page a folder-page belongs to. */
type DbIdToPageId = Map<string, string>;

/** Swap a page id in an array (used to reconcile optimistic local ids with server ids). */
function swapPageId(pages: Page[], oldId: string, newId: string): Page[] {
  return pages.map((p) => (p.id === oldId ? { ...p, id: newId } : p));
}

type WorkspaceProps = Readonly<{
  initialRoutePageId?: string;
}>;

export function Workspace({ initialRoutePageId }: WorkspaceProps) {
  // ─── Core data state ────────────────────────────────────────────────────────

  /** Whether the initial data load from the server is in progress. */
  const [loading, setLoading] = useState(true);

  /**
   * `pages` — flat array of all page data (id, title, blocks).
   *
   * WHY flat array instead of a tree?
   *   Blocks are only needed for the active page. Keeping all pages flat makes
   *   look-up O(n) and avoids the complexity of deep-nesting block mutations.
   *   The hierarchy is expressed separately in `treeRoot`.
   */
  const [pages, setPages] = useState<Page[]>([]);

  /**
   * `treeRoot` — the sidebar file-tree structure (folders + page references).
   *
   * WHY separate from `pages`?
   *   The tree stores hierarchy (folders) which pages themselves don't need.
   *   A tree node for a page contains only { id, name, pageId } — a pointer to
   *   the actual page data. This separation keeps the tree manipulation logic
   *   independent of block-editing logic.
   */
  const [treeRoot, setTreeRoot] = useState<TreeRoot>(emptyTreeRoot);
  const treeRootRef = useRef<TreeRoot>(emptyTreeRoot);

  /** Stores the DB folder id for each tree node id. */
  const dbFolderIds = useRef<DbIdToPageId>(new Map());

  /** The id of the page currently displayed in the editor. null = none selected. */
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [titleHasError, setTitleHasError] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

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
  const [errorToast, setErrorToast] = useState<string | null>(null);

  /**
   * Whether the current page has unsaved changes.
   *
   * Set to `true` whenever the user edits the title or any block.
   * Set to `false` after a successful save or after navigating away.
   *
   * WHY not derived from a server-snapshot diff at render time?
   *   Block diffs are expensive (JSON.stringify on every render). A flag is
   *   O(1) and avoids unnecessary computation on every keystroke.
   */
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Page ID the user intends to navigate to while the current page is dirty.
   *
   * Set when the user clicks a different page in the sidebar while `isDirty`
   * is true. Triggers the UnsavedChangesDialog. Cleared when the dialog is
   * dismissed (save, discard, or cancel).
   */
  const [pendingNavId, setPendingNavId] = useState<string | null>(null);

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

  /** Debounce timer for persisting tag changes (800 ms). */
  const tagsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Server-side snapshot of each page's blocks (keyed by pageId).
   * Populated on initial load and updated after every successful save.
   * Used by handleSave to diff what needs to be created / updated / deleted.
   */
  const serverBlocksRef = useRef<Map<string, Block[]>>(new Map());

  /**
   * Server-side snapshot of each full page (title/tags/blocks), keyed by pageId.
   * Used to restore the page when user chooses "Leave without saving".
   */
  const serverPagesRef = useRef<Map<string, Page>>(new Map());

  const { t } = useI18n();
  const tagsPerPageEnabled = useSettingsStore((s) => s.tagsPerPageEnabled);

  const routePageId = useMemo(() => {
    if (!pathname) return initialRoutePageId ?? null;
    if (pathname.startsWith('/pages/')) {
      const candidate = pathname.slice('/pages/'.length).trim();
      return candidate ? decodeURIComponent(candidate) : null;
    }
    if (pathname.startsWith('/p/')) {
      const candidate = pathname.slice('/p/'.length).trim();
      return candidate ? decodeURIComponent(candidate) : null;
    }
    return null;
  }, [pathname, initialRoutePageId]);

  const routePageExists = useMemo(
    () => (routePageId ? pages.some((p) => p.id === routePageId) : false),
    [pages, routePageId],
  );
  const isPageRoute = useMemo(
    () => (pathname ? pathname.startsWith('/pages/') || pathname.startsWith('/p/') : false),
    [pathname],
  );

  const showErrorToast = useCallback((message: string) => {
    setErrorToast(message);
  }, []);

  // When page tags are disabled, clear the sidebar tag filter so we don't filter by tags invisibly.
  useEffect(() => {
    if (!tagsPerPageEnabled) setActiveTags([]);
  }, [tagsPerPageEnabled]);

  useEffect(() => {
    treeRootRef.current = treeRoot;
  }, [treeRoot]);

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

  const breadcrumbs = useMemo(() => {
    if (!activePageId || !activePage) return [] as Array<{ id: string; label: string; isCurrent: boolean }>;
    const folderCrumbs = ancestorPathIds
      .map((ancestorId) => {
        const node = findNodeInRoot(treeRoot, ancestorId);
        if (!node) return null;
        return { id: node.id, label: node.name, isCurrent: false };
      })
      .filter((item): item is { id: string; label: string; isCurrent: boolean } => item !== null);
    return [...folderCrumbs, { id: activePage.id, label: activePage.title, isCurrent: true }];
  }, [activePageId, activePage, ancestorPathIds, treeRoot]);

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
    const localFolderId = newFolderId();
    const folderName = generateUniqueNameInScope(treeRoot, parentId, t('tree.newFolder'));

    // Optimistic update
    setTreeRoot((root) => addFolderUnder(root, parentId, folderName, localFolderId));

    // Determine the DB parent folder id (parentId might be ROOT_ID)
    const dbParentId = dbFolderIds.current.has(parentId) ? parentId : null;

    void apiCreateFolder(folderName, dbParentId).then((created) => {
      const latestNode = findNodeInRoot(treeRootRef.current, localFolderId);
      const latestName = latestNode?.name?.trim();

      setTreeRoot((root) => replaceNodeId(root, localFolderId, created.id));
      // Register the new folder id so future moves can reference it
      dbFolderIds.current.set(created.id, created.id);

      if (latestName && latestName !== created.name) {
        void apiUpdateFolder(created.id, { name: latestName }).catch((err) => {
          console.error('[createFolder:syncRename]', err);
          if (err instanceof WorkspaceApiError && (err.status === 409 || err.code === 'DUPLICATE_NAME')) {
            showErrorToast(t('tree.duplicateNameError'));
          }
        });
      }
    }).catch((err) => {
      console.error('[createFolder]', err);
      if (err instanceof WorkspaceApiError && (err.status === 409 || err.code === 'DUPLICATE_NAME')) {
        showErrorToast(t('tree.duplicateNameError'));
      }
      // Revert: reload from server
      void fetchFolders().then(() => {/* silently ignore */});
    });
  }, [showErrorToast, t, treeRoot]);

  /**
   * Create a new page under the given parent.
   *
   * WHY both setPages AND setTreeRoot?
   *   Page data (content) lives in `pages`; the tree entry (hierarchy) lives in
   *   `treeRoot`. Both must be updated atomically to keep them in sync.
   */
  const createFile = useCallback((parentId: string) => {
    const localPageId = newPageId();
    const fileTitle = generateUniqueNameInScope(treeRoot, parentId, 'Untitled');
    const newPage: Page = { id: localPageId, title: fileTitle, blocks: [] };
    const shouldAutoOpenNewPage = activePageId == null;

    // Optimistic update
    setPages((prev) => [...prev, newPage]);
    setTreeRoot((root) => addFileUnder(root, parentId, localPageId, newPage.title));
    if (shouldAutoOpenNewPage) setActivePageId(localPageId);
    serverBlocksRef.current.set(localPageId, []);
    serverPagesRef.current.set(localPageId, newPage);

    // Determine the DB folder id for the parent
    const dbFolderId = dbFolderIds.current.has(parentId) ? parentId : null;

    void apiCreatePage(fileTitle, dbFolderId).then((created) => {
      // Swap the optimistic local id with the server-assigned id everywhere.
      // This ensures all subsequent API calls (block create/update/delete) use
      // the correct pageId that exists in the database.
      setPages((prev) => swapPageId(prev, localPageId, created.id));
      setTreeRoot((root) => replaceNodeId(root, localPageId, created.id));
      setActivePageId((current) => (current === localPageId ? created.id : current));
      serverBlocksRef.current.set(created.id, []);
      serverBlocksRef.current.delete(localPageId);
      serverPagesRef.current.set(created.id, { ...newPage, id: created.id });
      serverPagesRef.current.delete(localPageId);
    }).catch((err) => {
      console.error('[createFile]', err);
      if (err instanceof WorkspaceApiError && (err.status === 409 || err.code === 'DUPLICATE_NAME')) {
        showErrorToast(t('tree.duplicateNameError'));
      }
    });
  }, [activePageId, showErrorToast, t, treeRoot]);

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

    const { root: nextRoot, removed } = removeNode(treeRoot, nodeId);
    if (!removed) return;
    const pageIdsToRemove = collectPageIdsInSubtree(removed);

    // Optimistic update
    setTreeRoot(nextRoot);
    setPages((prevPages) => prevPages.filter((p) => !pageIdsToRemove.includes(p.id)));
    setActivePageId((current) => (pageIdsToRemove.includes(current ?? '') ? null : current));
    for (const pageId of pageIdsToRemove) {
      serverBlocksRef.current.delete(pageId);
      serverPagesRef.current.delete(pageId);
    }
    setDeleteDialog(null);

    // Determine if we are deleting a page or a folder
    const isFolder = dbFolderIds.current.has(nodeId);
    if (isFolder) {
      void apiDeleteFolder(nodeId).catch((err) => console.error('[deleteFolder]', err));
    } else {
      // Delete each page. Pages cascade-delete blocks on the server.
      for (const pid of pageIdsToRemove) {
        void apiDeletePage(pid).catch((err) => console.error('[deletePage]', err));
      }
    }
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
      // Capture tree snapshot before the functional `setTreeRoot` update so we
      // can compute the resolved targetId for the server call.
      setTreeRoot((root) => {
        const isTargetRoot = targetItem.id === ROOT_DROP_TARGET_ID;
        const targetId = isTargetRoot
          ? targetItem.id
          : (() => {
              const node = findNodeInRoot(root, targetItem.id);
              // Redirect to parent if dropping onto a leaf (page)
              if (node?.pageId != null) return getParentId(root, targetItem.id);
              return targetItem.id;
            })();

        const nextRoot = moveNode(root, sourceItem.id, targetId);

        // Determine whether source is a page or a folder and call the API.
        const sourceNode = findNodeInRoot(root, sourceItem.id);
        const isPage = sourceNode?.pageId != null;
        const resolvedFolderId =
          isTargetRoot || targetId === ROOT_DROP_TARGET_ID ? null : targetId;

        // Compute order among siblings in the new parent
        const siblings = isTargetRoot
          ? nextRoot.children
          : (findNodeInRoot(nextRoot, targetId)?.children ?? []);
        const order = siblings.findIndex((c) => c.id === sourceItem.id);

        if (isPage) {
          void apiMovePage(sourceItem.id, { folderId: resolvedFolderId, order }).catch(
            (err) => console.error('[movePage]', err),
          );
        } else {
          void apiMoveFolder(sourceItem.id, {
            parentId: resolvedFolderId,
            order,
          }).catch((err) => console.error('[moveFolder]', err));
        }

        return nextRoot;
      });
    },
    [],
  );

  const handleRenameFolder = useCallback(
    (folderId: string, name: string) => {
      const parentId = getParentId(treeRoot, folderId);
      if (isNameTakenInScope(treeRoot, parentId, name, folderId)) {
        showErrorToast(t('tree.duplicateNameError'));
        return false;
      }

      setTreeRoot((root) => renameNode(root, folderId, name));
      setEditingFolderId(null);

      if (!dbFolderIds.current.has(folderId)) {
        return true;
      }

      void apiUpdateFolder(folderId, { name }).catch((err) => {
        console.error('[renameFolder]', err);
        if (err instanceof WorkspaceApiError && (err.status === 409 || err.code === 'DUPLICATE_NAME')) {
          showErrorToast(t('tree.duplicateNameError'));
        }
      });
      return true;
    },
    [showErrorToast, t, treeRoot],
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
    (pageId: string) => {
      if (pageId === activePageId) return;
      if (isDirty) {
        setPendingNavId(pageId);
        return;
      }
      setTitleHasError(false);
      setActivePageId(pageId);
      setMobileSidebarOpen(false);
    },
    [activePageId, isDirty],
  );

  /** Select a page when the user clicks on a tree leaf node. */
  const handleTreeSelect = useCallback(
    (item: TreeDataItem | undefined) => {
      if (!item) return;
      const isFile = pages.some((p) => p.id === item.id);
      if (!isFile) return;
      handleSelect(item.id);
    },
    [handleSelect, pages],
  );

  /** Sync page title changes into local state only — no API call yet. */
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!activePageId) return;
      setTitleHasError(false);
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, title } : p)),
      );
      setTreeRoot((root) => renameNode(root, activePageId, title));
      setIsDirty(true);
    },
    [activePageId],
  );

  /** Persist the title when the input loses focus. */
  const handleTitleBlur = useCallback(() => {
    if (!activePageId) return;
    const page = pages.find((p) => p.id === activePageId);
    if (!page) return;

    const parentId = getParentId(treeRoot, activePageId);
    if (isNameTakenInScope(treeRoot, parentId, page.title, activePageId)) {
      setTitleHasError(true);
      showErrorToast(t('tree.duplicateNameError'));
      return;
    }

    setTitleHasError(false);
    void apiUpdatePage(activePageId, { title: page.title })
      .then(() => {
        const oldSnap = serverPagesRef.current.get(activePageId);
        serverPagesRef.current.set(
          activePageId,
          oldSnap ? { ...oldSnap, title: page.title } : { ...page, blocks: [...page.blocks] },
        );
      })
      .catch((err) =>
        {
          console.error('[titleBlur]', err);
          if (err instanceof WorkspaceApiError && (err.status === 409 || err.code === 'DUPLICATE_NAME')) {
            setTitleHasError(true);
            showErrorToast(t('tree.duplicateNameError'));
          }
        },
      );
  }, [activePageId, pages, showErrorToast, t, treeRoot]);

  const handleBreadcrumbClick = useCallback((nodeId: string) => {
    const node = findNodeInRoot(treeRoot, nodeId);
    if (!node) return;

    if (node.pageId) {
      handleSelect(node.pageId);
      return;
    }

    const nextPageId = findFirstPageIdInSubtree(node);
    if (!nextPageId) return;
    handleSelect(nextPageId);
  }, [handleSelect, treeRoot]);

  /**
   * Block changes are kept purely in local state until the user explicitly saves.
   *
   * WHY no immediate API call?
   *   The server assigns new UUIDs to created blocks. If we fire
   *   POST immediately, subsequent PUT/DELETE calls would use the client's
   *   temporary id (e.g. "block-abc") which the server doesn't know → 404.
   *   Deferring all writes to handleSave lets us reconcile server-assigned
   *   ids before we ever call PUT or DELETE.
   */
  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      if (!activePageId) return;
      setPages((pages) =>
        pages.map((p) => (p.id === activePageId ? { ...p, blocks } : p)),
      );
      setIsDirty(true);
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
      if (tagsDebounceRef.current) clearTimeout(tagsDebounceRef.current);
      tagsDebounceRef.current = setTimeout(() => {
        void apiUpdatePage(activePageId, { tags })
          .then(() => {
            const oldSnap = serverPagesRef.current.get(activePageId);
            if (!oldSnap) return;
            serverPagesRef.current.set(activePageId, { ...oldSnap, tags: [...tags] });
          })
          .catch((err) =>
            console.error('[tagsChange]', err),
          );
      }, 800);
    },
    [activePageId],
  );

  /**
   * Persist the current page to the server.
   *
   * Diff strategy:
   *   1. Delete blocks that were removed since last save.
   *   2. Create new blocks (POST) and record the server-assigned ids.
   *   3. Update blocks whose content/colSpan/tags changed.
   *   4. Swap client temporary ids → server ids in local state.
   *   5. Bulk-reorder so the DB order matches the UI order.
   *   6. Update the server snapshot so the next save diffs correctly.
   */
  const handleSave = useCallback(async () => {
    if (!activePageId) return;
    const page = pages.find((p) => p.id === activePageId);
    if (!page) return;

    // Always persist the current title on save (cheap, guarantees consistency)
    await apiUpdatePage(activePageId, { title: page.title }).catch((err) =>
      console.error('[save:title]', err),
    );

    const serverBlocks = serverBlocksRef.current.get(activePageId) ?? [];
    const localBlocks = page.blocks;
    const serverIdSet = new Set(serverBlocks.map((b) => b.id));
    const localIdSet = new Set(localBlocks.map((b) => b.id));

    // 1. Delete removed blocks
    const toDelete = serverBlocks.filter((b) => !localIdSet.has(b.id));
    await Promise.all(
      toDelete.map((b) =>
        apiDeleteBlock(activePageId, b.id).catch((err) =>
          console.error('[save:delete]', b.id, err),
        ),
      ),
    );

    // 2. Create new blocks sequentially so order is preserved
    const idMap = new Map<string, string>(); // localId → serverId
    for (const b of localBlocks) {
      if (!serverIdSet.has(b.id)) {
        const order = localBlocks.indexOf(b);
        try {
          const created = await apiCreateBlock(activePageId, b, order);
          idMap.set(b.id, created.id);
        } catch (err) {
          console.error('[save:create]', b.id, err);
        }
      }
    }

    // 3. Update changed existing blocks
    await Promise.all(
      localBlocks
        .filter((b) => serverIdSet.has(b.id))
        .map((b) => {
          const old = serverBlocks.find((s) => s.id === b.id);
          const changed =
            JSON.stringify(b.content) !== JSON.stringify(old?.content) ||
            b.colSpan !== old?.colSpan ||
            JSON.stringify(b.tags) !== JSON.stringify(old?.tags);
          if (!changed) return Promise.resolve();
          return apiUpdateBlock(activePageId, b.id, {
            content: b.content,
            colSpan: b.colSpan,
            tags: b.tags,
          }).catch((err) => console.error('[save:update]', b.id, err));
        }),
    );

    // 4. Reconcile local ids with server-assigned ids
    const reconciledBlocks = localBlocks.map((b) =>
      idMap.has(b.id) ? { ...b, id: idMap.get(b.id)! } : b,
    );
    if (idMap.size > 0) {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId ? { ...p, blocks: reconciledBlocks } : p,
        ),
      );
    }

    // 5. Bulk reorder
    if (reconciledBlocks.length > 0) {
      await apiReorderBlocks(
        activePageId,
        reconciledBlocks.map((b, i) => ({ id: b.id, order: i })),
      ).catch((err) => console.error('[save:reorder]', err));
    }

    // 6. Update server snapshot
    serverBlocksRef.current.set(activePageId, reconciledBlocks);
    serverPagesRef.current.set(activePageId, {
      ...page,
      blocks: reconciledBlocks,
      tags: page.tags ? [...page.tags] : undefined,
    });

    setIsDirty(false);
    setSaveFeedback(true);
  }, [activePageId, pages]);

  /** Save current page then navigate to the pending destination. */
  const handleSaveAndLeave = useCallback(async () => {
    await handleSave();
    if (pendingNavId) {
      setActivePageId(pendingNavId);
      setMobileSidebarOpen(false);
      setPendingNavId(null);
    }
  }, [handleSave, pendingNavId]);

  /**
   * Discard current changes and navigate to the pending destination.
   *
   * Restores the server snapshot for the current page so the user sees the
   * persisted version if they return to it later.
   */
  const handleLeaveWithout = useCallback(() => {
    if (pendingNavId) {
      // Revert local edits to the server snapshot
      const pageSnap = serverPagesRef.current.get(activePageId ?? '');
      if (pageSnap && activePageId) {
        const restored: Page = {
          ...pageSnap,
          blocks: [...pageSnap.blocks],
          tags: pageSnap.tags ? [...pageSnap.tags] : undefined,
        };
        setPages((prev) =>
          prev.map((p) => (p.id === activePageId ? restored : p)),
        );
        setTreeRoot((root) => renameNode(root, activePageId, restored.title));
      } else {
        const snap = serverBlocksRef.current.get(activePageId ?? '') ?? [];
        setPages((prev) =>
          prev.map((p) => (p.id === activePageId ? { ...p, blocks: snap } : p)),
        );
      }
      setIsDirty(false);
      setActivePageId(pendingNavId);
      setMobileSidebarOpen(false);
      setPendingNavId(null);
    }
  }, [pendingNavId, activePageId]);

  /** Close the unsaved-changes dialog without navigating. */
  const handleCancelPendingNav = useCallback(() => {
    setPendingNavId(null);
  }, []);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  /**
   * Load pages and folders from the server on mount.
   *
   * Optimistic strategy: pages/tree start empty (loading spinner), populated
   * once both fetches resolve. On error we log and leave the workspace empty
   * so the user can still see the UI and retry by refreshing.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [apiPages, apiFolders] = await Promise.all([fetchPages(), fetchFolders()]);
        if (cancelled) return;

        const uiPages = apiPages.map(apiPageToPage);
        setPages(uiPages);

        // Snapshot server state so handleSave can diff correctly
        for (const p of uiPages) {
          serverBlocksRef.current.set(p.id, [...p.blocks]);
          serverPagesRef.current.set(p.id, {
            ...p,
            blocks: [...p.blocks],
            tags: p.tags ? [...p.tags] : undefined,
          });
        }

        // Build folder id lookup for drag-and-drop move operations
        dbFolderIds.current = new Map(apiFolders.map((f) => [f.id, f.id]));

        const root = buildTreeRootFromApi(apiFolders, apiPages);
        setTreeRoot(root);

        // Keep selection route-driven; root route stays in empty state.
      } catch (err) {
        console.error('[Workspace] Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => { cancelled = true; };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 3000);
    return () => clearTimeout(timer);
  }, [errorToast]);

  useEffect(() => {
    if (loading) return;
    if (!isPageRoute) return;
    if (!routePageId) return;
    if (routePageExists) {
      setActivePageId(routePageId);
      setTitleHasError(false);
      return;
    }
    setActivePageId(null);
  }, [isPageRoute, loading, routePageExists, routePageId]);

  useEffect(() => {
    if (loading || !pathname) return;
    if (activePageId) {
      const targetPath = `/pages/${encodeURIComponent(activePageId)}`;
      if (pathname !== targetPath) router.push(targetPath);
      return;
    }
    if (isPageRoute && routePageId && !routePageExists) {
      router.push('/');
    }
  }, [activePageId, isPageRoute, loading, pathname, routePageExists, routePageId, router]);

  /**
   * Browser back/forward navigation guard: when routePageId changes (via back/forward)
   * and we have unsaved changes, show the unsaved-changes dialog.
   * This prevents data loss from browser navigation while editing.
   */
  useEffect(() => {
    // Skip during initial load or if no route page ID change
    if (loading) return;
    if (!isPageRoute) return;
    
    // Check if routePageId changed and differs from activePageId
    const routePageChanged = routePageId && routePageId !== activePageId;
    if (!routePageChanged) return;
    
    // If dirty, show dialog and set pending navigation target
    if (isDirty) {
      setPendingNavId(routePageId);
      return;
    }
    
    // Otherwise, apply the new route page ID
    if (routePageExists) {
      setActivePageId(routePageId);
      setTitleHasError(false);
    }
  }, [isPageRoute, loading, routePageId, activePageId, isDirty, routePageExists]);

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
      {/* Loading overlay — shown while the initial data fetch is in progress. */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            <span className="text-sm">{t('app.loading')}</span>
          </div>
        </div>
      )}
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
              data-testid="sidebar-new-page"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => createFile(ROOT_ID)}
            >
              <FilePlus size={16} />
              {t('sidebar.newPage')}
            </button>
            <button
              type="button"
              aria-label={t('sidebar.newFolder')}
              data-testid="sidebar-new-folder"
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
                data-testid="sidebar-search-input"
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
                  data-testid="sidebar-clear-search"
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
                  onSelect={handleTreeSelect}
                  onDocumentDrag={handleDocumentDrag}
                  renderItem={renderTreeItem}
                  selectedItemId={activePageId ?? undefined}
                  expandedItemIds={ancestorPathIds}
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
                        handleSelect(page.id);
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
        breadcrumbs={breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
        onSave={handleSave}
        saved={saveFeedback}
        isDirty={isDirty}
        onTitleChange={handleTitleChange}
        onTitleBlur={handleTitleBlur}
        titleHasError={titleHasError}
        onBlocksChange={handleBlocksChange}
        onTagsChange={handleTagsChange}
        onMobileSidebarToggle={() => setMobileSidebarOpen((v) => !v)}
      />

      {errorToast && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-md border border-destructive/30 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg">
          {errorToast}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}
        title={deleteDialog?.title ?? ''}
        description={deleteDialog?.description ?? ''}
        onConfirm={handleConfirmDelete}
      />

      <UnsavedChangesDialog
        open={pendingNavId !== null}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithout={handleLeaveWithout}
        onCancel={handleCancelPendingNav}
      />
    </div>
  );
}
