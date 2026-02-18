'use client';

/**
 * MainContent — the right-hand panel of the workspace.
 *
 * Responsibilities:
 *   1. Renders the top header bar with page breadcrumb, save button, export
 *      button, and user avatar menu.
 *   2. Renders the scrollable page area containing PageTitle + BlockEditor.
 *   3. Shows an empty-state illustration when no page is selected.
 *   4. Displays real-time page statistics (word count, reading time, block count)
 *      in a footer below the editor.
 *
 * WHY does MainContent own the header?
 *   The header needs access to the currently active page (for the title display)
 *   and to the save/export callbacks. Keeping it here avoids prop-drilling through
 *   the Workspace component, and the header visually belongs to the content area,
 *   not the sidebar.
 *
 * MOBILE LAYOUT
 *   On small screens (<768px) the sidebar is hidden behind a drawer. MainContent
 *   receives an `onMobileSidebarToggle` callback to show/hide it via a hamburger
 *   button that is only visible on mobile (hidden on md+).
 *
 * KEYBOARD SHORTCUTS
 *   Cmd/Ctrl+S → save the current page.
 *   Implemented here (not in Workspace) because the content area captures keyboard
 *   focus when the user is typing.
 *
 * IMPROVEMENT IDEAS:
 *   - Add a breadcrumb path (e.g. "Folder / Sub-folder / Page title") to show
 *     where the current page lives in the tree.
 *   - Add an undo/redo toolbar for block operations.
 *   - Animate the stats footer appearance with a CSS transition.
 */

import { useEffect, useMemo, useState } from 'react';
import { Download, Menu, Save } from 'lucide-react';

import { SettingsDialog } from '@/components/SettingsDialog/SettingsDialog';
import { UserMenu } from '@/components/UserMenu/UserMenu';
import { useI18n } from '@/lib/i18n';
import { computePageStats, downloadMarkdown } from '@/lib/pageUtils';

import { BlockEditor } from './BlockEditor';
import { PageTitle } from './PageTitle';
import type { Block, Page } from './types';

type MainContentProps = Readonly<{
  page: Page | null;
  onSave?: () => void;
  saved?: boolean;
  onTitleChange?: (title: string) => void;
  onBlocksChange?: (blocks: Block[]) => void;
  /** Called when the hamburger button is pressed on mobile. */
  onMobileSidebarToggle?: () => void;
}>;

export function MainContent({
  page,
  onSave,
  saved = false,
  onTitleChange,
  onBlocksChange,
  onMobileSidebarToggle,
}: MainContentProps) {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  /**
   * Keyboard shortcut: Cmd/Ctrl+S saves the page.
   *
   * WHY useEffect + window.addEventListener instead of onKeyDown on a div?
   *   onKeyDown only fires when the element (or a descendant) has focus. The editor
   *   contains Monaco and Tiptap which manage focus internally — we can't reliably
   *   set tabIndex on a wrapper. Listening on window captures the shortcut no
   *   matter which sub-component is focused.
   *
   * WHY capture: false?
   *   We want the shortcut to fire in the bubble phase (default), after child
   *   components have had a chance to handle the event first.
   *
   * IMPROVEMENT: Build a full keyboard-shortcut registry (e.g. using tinykeys)
   * and display a shortcuts cheat-sheet in the Settings dialog.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd (Mac) or Ctrl (Win/Linux) + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault(); // prevent browser "Save page" dialog
        onSave?.();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  /**
   * Compute reading statistics whenever the active page's blocks change.
   *
   * WHY useMemo?
   *   computePageStats iterates over all blocks (potentially many). Memoising
   *   it prevents re-computation on every render that isn't caused by block
   *   changes (e.g. a button hover state updating).
   */
  const stats = useMemo(
    () => (page ? computePageStats(page) : null),
    [page],
  );

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      {/* ───── Top header bar ───── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {/**
           * Hamburger button — visible only on mobile (hidden on md+).
           *
           * WHY md:hidden?
           *   On desktop the sidebar is always visible so no toggle is needed.
           *   The button adds noise to the desktop layout, so we hide it with
           *   Tailwind's responsive `md:hidden` utility.
           */}
          {onMobileSidebarToggle && (
            <button
              type="button"
              aria-label={t('sidebar.show')}
              className="mr-1 rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
              onClick={onMobileSidebarToggle}
            >
              <Menu size={20} />
            </button>
          )}

          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {page?.title ?? t('main.selectPage')}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/**
           * Export to Markdown — only shown when a page is open.
           *
           * WHY only when page exists?
           *   There's nothing to export without content. Hiding the button
           *   avoids showing a disabled state which could confuse users.
           */}
          {page && (
            <button
              type="button"
              title={t('main.exportMarkdown')}
              aria-label={t('main.exportMarkdown')}
              className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
              onClick={() => downloadMarkdown(page)}
            >
              <Download size={14} />
              <span className="hidden md:inline">{t('main.exportMarkdown')}</span>
            </button>
          )}

          <button
            type="button"
            aria-label={t('main.savePage')}
            className="inline-flex min-w-22 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            onClick={onSave}
            disabled={saved}
          >
            <Save size={16} aria-hidden />
            {saved ? t('main.saved') : t('main.save')}
          </button>

          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </header>

      {/* ───── Scrollable content area ───── */}
      <div className="flex-1 overflow-y-auto p-3 text-foreground sm:p-6 md:p-8">
        <div className="mx-auto w-full max-w-4xl">
          {page ? (
            <div className="flex flex-col gap-6">
              <PageTitle
                page={page}
                readOnly={!onTitleChange}
                onTitleChange={onTitleChange}
              />

              <BlockEditor
                blocks={page.blocks}
                onChange={onBlocksChange ?? (() => {})}
              />

              {/**
               * Page statistics footer.
               *
               * WHY show stats?
               *   For a learning project, knowing how long content will take to
               *   read helps users plan study sessions. Showing block count gives
               *   a quick sense of how dense the page is.
               *
               * WHY only when blocks.length > 0?
               *   Stats like "0 words · 1 min read" on a new page look odd and
               *   add no value. The footer appears once the user starts writing.
               */}
              {stats && stats.blockCount > 0 && (
                <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>
                    {t('main.wordCount', { count: stats.wordCount })}
                  </span>
                  <span>·</span>
                  <span>
                    {t('main.readingTime', { min: stats.readingTimeMin })}
                  </span>
                  <span>·</span>
                  <span>
                    {t('main.blockCount', { count: stats.blockCount })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Empty state — no page selected */
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {t('main.emptyHint')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('main.emptyHint2')}
              </p>
            </div>
          )}
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}
