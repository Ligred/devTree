'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Workspace } from '@/components/Workspace';

/**
 * Notebook page — the main workspace for notes, code, diagrams, and more.
 *
 * Uses query parameters (?page=xyz) for SPA-style navigation so the Workspace
 * component stays mounted across page switches.  URL updates (browser history,
 * shareable links) happen via router.push('/notebook?page=abc') inside
 * Workspace without causing a page remount.
 *
 * Route: /notebook
 * Default route: yes (root / redirects here)
 */
export default function NotebookPage() {
  const searchParams = useSearchParams();

  // Extract and memoize the page ID to prevent unnecessary Workspace re-renders
  const pageId = useMemo(() => {
    const p = searchParams.get('page');
    return p ?? undefined; // undefined → no page selected (shows empty state)
  }, [searchParams]);

  return <Workspace initialRoutePageId={pageId} />;
}
