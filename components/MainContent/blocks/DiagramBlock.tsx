'use client';

/**
 * DiagramBlock — an Excalidraw-powered canvas for diagrams, shapes, and
 * freehand drawing. Replaces the old plain-canvas WhiteboardBlock with a
 * fully-featured editor.
 *
 * ─── WHY EXCALIDRAW? ──────────────────────────────────────────────────────────
 *
 * Excalidraw is the best choice for a visual, sketch-style diagramming solution:
 *   - Hand-drawn aesthetic: professional yet approachable look.
 *   - Rich features: shapes, arrows, text, freehand drawing, images.
 *   - Mermaid integration: Insert Mermaid diagrams via the UI or /mermaid command.
 *   - Infinite canvas: pan and zoom to explore large diagrams.
 *   - Built-in collaboration: designed for real-time collaboration.
 *   - Export options: PNG, SVG, clipboard support.
 *
 * ─── MERMAID SUPPORT ──────────────────────────────────────────────────────────
 *   Excalidraw has native Mermaid support! Insert via:
 *   - Menu: Click "+" button → "Mermaid diagram"
 *   - Command: Type "/mermaid" while editing text
 *   - Mermaid elements are editable and render inline
 *   NOTE: Excalidraw's Mermaid/insert dialogs render as portals to document.body.
 *   globals.css raises their z-index above the fullscreen overlay so they remain
 *   visible when the block is fullscreened.
 *
 * ─── PERSISTENCE ──────────────────────────────────────────────────────────────
 *   Diagram elements + appState → serialized to JSON, stored per-block in `code`.
 *   Library items → stored in localStorage (personal items) AND in the database
 *   (shared/imported libraries).  On mount, both sources are merged so libraries
 *   survive device changes and re-mounts.
 *
 * ─── LIBRARY SAVING ───────────────────────────────────────────────────────────
 *   Two-tier library storage:
 *     URL-SOURCED (/api/user/libraries POST): libraries imported from
 *       libraries.excalidraw.com.  Stored globally (deduped by URL) and linked
 *       to the user via UserLibrary.  Loaded on mount and merged via
 *       `updateLibrary({ merge: true })`.
 *     LOCAL (/api/user/libraries PATCH): items the user loaded from a local
 *       .excalidrawlib file or created in-canvas.  Stored per-user in
 *       `User.localLibraryItems`.  The `onLibraryChange` handler diffing against
 *       the set of URL-sourced item IDs fires off a debounced PATCH to keep
 *       these in sync cross-device.
 *
 * ─── DRAWING COORDINATE FIX ───────────────────────────────────────────────────
 *   Excalidraw caches `offsetTop`/`offsetLeft` in its AppState and uses these
 *   for every pointer-coordinate calculation.  They are updated by a
 *   ResizeObserver, meaning they go stale when the outer scroll container
 *   scrolls (canvas moves without resizing).
 *
 *   Root cause: the app uses a fixed-height flex layout so `document.body`
 *   never resizes when lazy content above the block shifts its viewport position.
 *   Excalidraw's own `onScroll` only fires for the nearest scroll container
 *   scroll, not for positional shifts from late-loading content.
 *
 *   Fix: `onPointerDownCapture` on the wrapper div calls `refresh()` before
 *   Excalidraw processes any pointer-down event, so offsetLeft/offsetTop are
 *   always fresh at the moment of each draw interaction.  Double-rAF on mount
 *   and window scroll capture listener are kept as safety nets.
 *
 * ─── ADD-LIBRARY FROM SITE ────────────────────────────────────────────────────
 *   libraries.excalidraw.com redirects back with `#addLibrary=URL&token=…`.
 *   Excalidraw's `parseLibraryTokensFromUrl()` detects this hash.  We then:
 *     1. Fetch the .excalidrawlib file
 *     2. Merge items into the active Excalidraw instance
 *     3. POST to /api/user/libraries to persist globally (deduped by URL)
 *     4. Strip the hash from the browser URL
 */

import '@excalidraw/excalidraw/index.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FullscreenBlockOverlay } from './FullscreenBlockOverlay';
import type { DiagramBlockContent } from '../types';

// ─── Backend library helpers ──────────────────────────────────────────────────

/**
 * Fetch all library items for the authenticated user from the backend.
 * Returns:
 *   - `allItems`: flat array of all items (URL-sourced + local) for initial load.
 *   - `urlItemIds`: Set of item IDs that came from URL-sourced libraries, used
 *     by `onLibraryChange` to distinguish "local" items that need to be PATCHed.
 *
 * Falls back gracefully so mount is never blocked.
 */
async function fetchBackendLibraryItems(): Promise<{
  allItems: any[];
  urlItemIds: Set<string>;
}> {
  try {
    const res = await fetch('/api/user/libraries');
    if (!res.ok) return { allItems: [], urlItemIds: new Set() };
    const data = (await res.json()) as {
      libraries: Array<{ items: any[] }>;
      localItems: any[];
    };
    const urlItems = data.libraries.flatMap((lib) => lib.items);
    const localItems: any[] = Array.isArray(data.localItems) ? data.localItems : [];
    const urlItemIds = new Set<string>(
      urlItems.map((item: any) => item?.id).filter(Boolean),
    );
    return { allItems: [...urlItems, ...localItems], urlItemIds };
  } catch {
    return { allItems: [], urlItemIds: new Set() };
  }
}

/**
 * Persist an imported library (from a URL) to the backend.
 * Silently ignores errors — the library is already merged locally.
 */
async function saveLibraryToBackend(
  sourceUrl: string,
  items: any[],
  name?: string,
): Promise<void> {
  try {
    await fetch('/api/user/libraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl, items, name }),
    });
  } catch (err) {
    console.warn('Failed to save library to backend:', err);
  }
}

/**
 * Persist the user's local library items (file-loaded or in-canvas created)
 * to the backend via PATCH.  Replaces the entire stored set with `items`.
 * Silently ignores errors — the items remain in Excalidraw's own localStorage.
 */
async function saveLocalLibraryToBackend(items: any[]): Promise<void> {
  try {
    await fetch('/api/user/libraries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  } catch (err) {
    console.warn('Failed to save local library items to backend:', err);
  }
}

// ─── Excalidraw library file parser ──────────────────────────────────────────

interface ExcalidrawLibFile {
  type?: string;
  version?: number;
  libraryItems?: any[]; // v2
  library?: any[];      // v1
}

/**
 * Parse a fetched .excalidrawlib JSON body into a flat array of library items.
 */
function parseLibraryFile(data: ExcalidrawLibFile): any[] {
  if (Array.isArray(data.libraryItems)) return data.libraryItems;
  if (Array.isArray(data.library)) return data.library;
  return [];
}

// ─── Locale mapping ───────────────────────────────────────────────────────────

/**
 * Map the app's locale code to Excalidraw's langCode.
 * Excalidraw uses IETF language tags (e.g. 'en', 'uk-UA').
 * Full list: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/i18n.ts
 */
function toExcalidrawLang(locale: string): string {
  const map: Record<string, string> = {
    en: 'en',
    uk: 'uk-UA',
  };
  return map[locale] ?? 'en';
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

const ExcalidrawComponent = dynamic(
  async () => {
    const module = await import('@excalidraw/excalidraw');
    return { default: module.Excalidraw };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
        Loading canvas…
      </div>
    ),
  }
);

// ─── Component ────────────────────────────────────────────────────────────────

type DiagramBlockProps = Readonly<{
  content: DiagramBlockContent;
  onChange: (content: DiagramBlockContent) => void;
  /**
   * View mode: shows the diagram in read-only mode.
   * Edit mode: full editing interface with all tools.
   */
  isEditing?: boolean;
}>;

// Extract DiagramContent as a separate component
function DiagramContent({
  fullscreen,
  isEditing,
  content,
  onChange,
  onFullscreenToggle,
  t,
  theme,
  locale,
  isAuthenticated,
}: Readonly<{
  fullscreen: boolean;
  isEditing: boolean;
  content: DiagramBlockContent;
  onChange: (content: DiagramBlockContent) => void;
  onFullscreenToggle: () => void;
  t: (key: string) => string;
  theme: 'light' | 'dark';
  locale: string;
  /** When true, library changes are also persisted to /api/user/libraries. */
  isAuthenticated: boolean;
}>) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveLocalItemsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * IDs of library items that came from URL-sourced libraries (loaded via GET
   * /api/user/libraries).  Used by `onLibraryChange` to identify which items
   * are "local" (file-loaded or in-canvas created) so only those are PATCH-ed
   * to the backend — URL-sourced items are already persisted via POST.
   */
  const urlItemIdsRef = useRef<Set<string>>(new Set());
  // Excalidraw imperative API — stored in BOTH state (so effects that depend on
  // `excalidrawAPI` re-run when it becomes available) and a ref (so the
  // pointer-down capture handler has zero-overhead synchronous access without
  // needing to be re-created).  `handleExcalidrawAPI` below keeps them in sync
  // in one place, removing the need for a separate sync `useEffect`.
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  /**
   * Capture the current page URL once on mount so the library browser redirects
   * back to the same page (including the ?page=xxx query param) instead of the
   * root URL. This must be stable — it must NOT change on re-renders.
   */
  const libraryReturnUrl = useRef(
    globalThis.window === undefined ? '' : globalThis.window.location.href
  );

  /**
   * Parse the stored JSON once at mount. `useMemo` with an empty dependency
   * array prevents re-parsing (and therefore re-mounting Excalidraw) every time
   * the parent re-renders. The parsed state is only used as *initial* data;
   * subsequent changes are handled by Excalidraw's own internal state.
   *
   * Library items: Excalidraw persists its own library to its native
   * `excalidraw-library` localStorage key.  We intentionally do NOT pass our
   * own `libraryItems` here — doing so would create a second copy that merges
   * with Excalidraw's own, causing React duplicate-key warnings in the library
   * panel.  Backend libraries are merged after mount via updateLibrary().
   */
  const initialData = useMemo(() => {
    let base: { elements: any[]; appState: Record<string, unknown> } = {
      elements: [],
      appState: {},
    };
    if (content.code) {
      try {
        base = JSON.parse(content.code);
      } catch {
        // keep defaults
      }
    }
    return base;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // ── Coordinate refresh ──────────────────────────────────────────────────────
  //
  // Excalidraw caches `offsetTop`/`offsetLeft` in its AppState and uses them
  // for every pointer-coordinate calculation.  These values are correct at
  // mount time but become stale whenever the outer scroll container scrolls
  // (the canvas moves in the viewport without resizing, so Excalidraw's
  // internal ResizeObserver never fires).
  //
  // Root cause: the app uses a fixed-height flex layout so `document.body`
  // never resizes when lazy-loaded content above the block shifts the canvas
  // downward.  Excalidraw's own `onScroll` listener detects external-container
  // scrolls but NOT positional shifts from late-loading content above the block.
  //
  // Primary fix: `onPointerDownCapture` on the wrapper div (see JSX below)
  // calls `refresh()` in the DOM capture phase — before Excalidraw processes
  // the event — so `offsetLeft`/`offsetTop` are always fresh at the moment of
  // every draw or click interaction.
  //
  // Safety nets: double-rAF after mount + window scroll listener.

  /** Ref gives the pointer-down capture handler zero-overhead synchronous
   *  access to the API without rebuilding the callback on each render. */
  const excalidrawAPIRef = useRef<any>(null);

  /** Callback passed to Excalidraw’s `excalidrawAPI` prop.
   *  Updates both the ref (synchronous, zero re-render cost) and the state
   *  (triggers dependent effects) in one place. */
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
    setExcalidrawAPI(api);
  }, []);

  /** Called in the capture phase before Excalidraw sees any pointer-down.
   *  Ensures offsetLeft/offsetTop are always up-to-date before drawing. */
  const handlePointerDownCapture = useCallback(() => {
    excalidrawAPIRef.current?.refresh();
  }, []);

  useEffect(() => {
    if (!excalidrawAPI || fullscreen) return;

    const refresh = () => excalidrawAPI.refresh();

    // Double-rAF: fire refresh once the browser has completed the initial
    // layout+paint pass for the lazy-loaded Excalidraw canvas.
    let outerRafId: ReturnType<typeof requestAnimationFrame>;
    let innerRafId: ReturnType<typeof requestAnimationFrame>;
    outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(refresh);
    });

    // Re-measure on any scroll in the document (scroll doesn't bubble but
    // does propagate in the capture phase, so this catches any scroll element).
    globalThis.window?.addEventListener('scroll', refresh, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
      globalThis.window?.removeEventListener('scroll', refresh, { capture: true });
    };
  }, [excalidrawAPI, fullscreen]);

  // ── Import library from #addLibrary= URL hash ───────────────────────────
  //
  // When the user clicks "Add to Excalidraw" on libraries.excalidraw.com:
  //   1. The browser navigates to: {libraryReturnUrl}#addLibrary=URL&token=TOKEN
  //   2. parseLibraryTokensFromUrl() detects this hash.
  //   3. We fetch the .excalidrawlib file, parse the items, and merge them into
  //      the live Excalidraw instance via updateLibrary().
  //   4. The library is also POSTed to /api/user/libraries for cross-device sync.
  //   5. The hash is stripped from the browser URL so it won't re-import on refresh.

  useEffect(() => {
    if (!excalidrawAPI) return;

    const importLibraryFromHash = async () => {
      let parseLibraryTokensFromUrl: (() => { libraryUrl: string; idToken: string | null } | null) | undefined;
      try {
        const mod = await import('@excalidraw/excalidraw');
        parseLibraryTokensFromUrl = (mod as any).parseLibraryTokensFromUrl;
      } catch {
        return;
      }
      if (typeof parseLibraryTokensFromUrl !== 'function') return;

      const tokens = parseLibraryTokensFromUrl();
      if (!tokens) return;

      const { libraryUrl } = tokens;

      try {
        const res = await fetch(libraryUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fileData = (await res.json()) as ExcalidrawLibFile;
        const items = parseLibraryFile(fileData);

        if (items.length === 0) return;

        // Merge into the live Excalidraw instance
        await excalidrawAPI.updateLibrary({
          libraryItems: items,
          merge: true,
          openLibraryMenu: true,
          defaultStatus: 'published',
        });

        // Persist to backend (authenticated users only)
        if (isAuthenticated) {
          const name =
            (fileData as any)?.name ??
            libraryUrl.split('/').pop()?.replace('.excalidrawlib', '') ??
            '';
          await saveLibraryToBackend(libraryUrl, items, name);
        }

        // Clear the hash so a page refresh doesn't re-import.
        globalThis.window?.history.replaceState(
          null,
          '',
          globalThis.window.location.pathname + globalThis.window.location.search,
        );
      } catch (err) {
        console.warn('Failed to import Excalidraw library from URL:', err);
      }
    };

    importLibraryFromHash();

    const handleHashChange = () => { void importLibraryFromHash(); };
    globalThis.window?.addEventListener('hashchange', handleHashChange);
    return () => globalThis.window?.removeEventListener('hashchange', handleHashChange);
  }, [excalidrawAPI, isAuthenticated]);

  // ── Load backend libraries on mount ─────────────────────────────────────
  //
  // Once Excalidraw is ready and the user is authenticated, fetch all their
  // linked libraries from the backend and merge them into the live instance.
  // Excalidraw’s internal merge deduplicates items by ID, so re-importing a
  // library that was already imported on this device has no visible effect.

  useEffect(() => {
    if (!excalidrawAPI || !isAuthenticated) return;

    const loadBackendLibraries = async () => {
      const { allItems, urlItemIds } = await fetchBackendLibraryItems();
      urlItemIdsRef.current = urlItemIds;

      if (allItems.length === 0) return;

      await excalidrawAPI.updateLibrary({
        libraryItems: allItems,
        merge: true,
      });
    };

    void loadBackendLibraries();
  }, [excalidrawAPI, isAuthenticated]);

  // ── Persist local library changes to backend ──────────────────────────────
  //
  // `onLibraryChange` fires whenever the user modifies the Excalidraw library
  // (adds items from a local .excalidrawlib file, creates new items in-canvas,
  // or deletes items). Items NOT in urlItemIdsRef are "local" — PATCH to DB.

  const handleLibraryChange = useCallback(
    (items: readonly any[]) => {
      if (!isAuthenticated) return;
      if (saveLocalItemsTimeoutRef.current) clearTimeout(saveLocalItemsTimeoutRef.current);
      saveLocalItemsTimeoutRef.current = setTimeout(() => {
        // Only PATCH items that are NOT from URL-sourced libraries.
        const localItems = Array.from(items).filter(
          (item: any) =>
            typeof item?.id === 'string' && !urlItemIdsRef.current.has(item.id),
        );
        void saveLocalLibraryToBackend(localItems);
      }, 1500);
    },
    [isAuthenticated],
  );

  // ── Diagram change handler ─────────────────────────────────────────────────

  const handleChange = useCallback(
    (elements: readonly any[], state: any) => {
      if (!isEditing) return;

      // Debounce saves to avoid too many updates
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          const data = {
            elements: Array.from(elements),
            appState: {
              viewBackgroundColor: state.viewBackgroundColor,
              currentItemStrokeColor: state.currentItemStrokeColor,
              currentItemBackgroundColor: state.currentItemBackgroundColor,
              currentItemFillStyle: state.currentItemFillStyle,
              currentItemStrokeWidth: state.currentItemStrokeWidth,
              currentItemRoughness: state.currentItemRoughness,
              currentItemOpacity: state.currentItemOpacity,
              gridSize: state.gridSize,
            },
          };
          onChange({ code: JSON.stringify(data) });
        } catch (err) {
          console.warn('Failed to save diagram state:', err);
        }
      }, 500);
    },
    [onChange, isEditing]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (saveLocalItemsTimeoutRef.current) clearTimeout(saveLocalItemsTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        'relative bg-card overflow-hidden',
        fullscreen ? 'h-screen w-screen' : 'rounded-xl border border-border h-125'
      )}
      onPointerDownCapture={handlePointerDownCapture}
    >
      {/* Excalidraw editor */}
      <div className="h-full w-full">
        <ExcalidrawComponent
          excalidrawAPI={handleExcalidrawAPI}
          initialData={initialData}
          onChange={handleChange}
          onLibraryChange={handleLibraryChange}
          theme={theme}
          viewModeEnabled={!isEditing}
          zenModeEnabled={false}
          gridModeEnabled={false}
          langCode={toExcalidrawLang(locale)}
          libraryReturnUrl={libraryReturnUrl.current}
          /**
           * renderTopRightUI injects the fullscreen toggle button into
           * Excalidraw's own top-right toolbar area so it looks native.
           * Only rendered in edit mode where the toolbar is visible.
           */
          renderTopRightUI={
            isEditing
              ? () => (
                  <button
                    type="button"
                    onClick={onFullscreenToggle}
                    title={fullscreen ? t('ui.exitFullscreen') : t('ui.fullscreen')}
                    className="rounded-md bg-background/90 p-2 text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                )
              : undefined
          }
        />
      </div>

      {/* Fullscreen button overlay in view mode — Excalidraw's toolbar is hidden
          in viewModeEnabled=true so renderTopRightUI never mounts. We render the
          button ourselves, positioned at the top-right corner of the canvas. */}
      {!isEditing && (
        <button
          type="button"
          onClick={onFullscreenToggle}
          title={fullscreen ? t('ui.exitFullscreen') : t('ui.fullscreen')}
          className="absolute right-3 top-3 z-10 rounded-md bg-background/90 p-2 text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-foreground"
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}
    </div>
  );
}

export function DiagramBlock({ content, onChange, isEditing = false }: DiagramBlockProps) {
  const { t, locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const { status } = useSession();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const isAuthenticated = status === 'authenticated';

  // If fullscreen, render using FullscreenBlockOverlay
  if (isFullscreen) {
    return (
      <FullscreenBlockOverlay
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={t('block.diagram.label') || 'Canvas'}
      >
        <DiagramContent
          fullscreen
          isEditing={isEditing}
          content={content}
          onChange={onChange}
          onFullscreenToggle={() => setIsFullscreen(false)}
          t={t}
          theme={theme}
          locale={locale}
          isAuthenticated={isAuthenticated}
        />
      </FullscreenBlockOverlay>
    );
  }

  // Normal diagram block (non-fullscreen)
  return (
    <DiagramContent
      fullscreen={false}
      isEditing={isEditing}
      content={content}
      onChange={onChange}
      onFullscreenToggle={() => setIsFullscreen(true)}
      t={t}
      theme={theme}
      locale={locale}
      isAuthenticated={isAuthenticated}
    />
  );
}

