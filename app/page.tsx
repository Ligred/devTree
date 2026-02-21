'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Workspace } from '@/components/Workspace';

/**
 * Root application page - the foundation of our SPA architecture.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THIS ARCHITECTURE PROVIDES TRUE SPA BEHAVIOR:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * In Next.js App Router:
 * - Routes are defined by folder structure (app/something/page.tsx)
 * - Each route change normally triggers a new page.tsx render
 * - This causes components to unmount/remount → loading states, lost state
 *
 * OUR SOLUTION:
 * - Keep Workspace mounted permanently at the ROOT route ('/')
 * - Use QUERY PARAMETERS (?page=xyz) instead of path segments (/pages/xyz)
 * - Query param changes don't trigger route changes in Next.js
 * - Result: URL updates without unmounting = true SPA behavior
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HOW URL FLOW WORKS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. USER CLICKS PAGE IN SIDEBAR:
 *    - Workspace calls router.push('/?page=abc123', {scroll: false})
 *    - Next.js router updates URL to /?page=abc123
 *    - Since route path stays '/', this component doesn't remount
 *    - useSearchParams() detects change and triggers re-render with new pageId
 *    - Workspace receives new pageId prop and updates internal state
 *    - Only the MainContent area re-renders, no full-page refresh
 *
 * 2. USER BOOKMARKS/SHARES URL:
 *    - URL like /?page=abc123 can be shared
 *    - On page load, useSearchParams() reads 'page' query param
 *    - Workspace receives pageId and loads that page on mount
 *
 * 3. USER NAVIGATES VIA DEEP-LINK (/pages/abc123):
 *    - See app/pages/[pageId]/page.tsx - it redirects to /?page=abc123
 *    - This maintains backward compatibility with old URL format
 *
 * 4. BROWSER BACK/FORWARD:
 *    - Next.js router automatically handles history API
 *    - Back button changes query param: /?page=def456 → /?page=abc123
 *    - useSearchParams() detects change, Workspace updates state
 *    - No page refresh, seamless navigation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY NEXT.JS PATTERNS USED:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. 'use client' directive:
 *    - Marks this as a Client Component
 *    - Required for useSearchParams() hook
 *    - Allows interactive state management
 *
 * 2. useSearchParams() hook:
 *    - Returns reactive URLSearchParams object
 *    - Re-renders component when query params change
 *    - Read-only access to URL query string
 *
 * 3. useMemo() for pageId:
 *    - Extracts 'page' query param value
 *    - Memoized to prevent unnecessary Workspace prop changes
 *    - Returns undefined when no page is selected (shows empty state)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PERFORMANCE BENEFITS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - No server round-trips for page navigation
 * - No React tree unmount/remount overhead
 * - No loading states between pages
 * - Sidebar tree state preserved (expanded folders stay expanded)
 * - Editor state preserved (cursor position, scroll, etc.)
 * - Instant page switching (typically <16ms)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
export default function DevTreeApp() {
  // Read the 'page' query parameter from URL
  // Example: /?page=abc123 → returns 'abc123'
  const searchParams = useSearchParams();
  
  // Extract and memoize the page ID
  // Memoization ensures Workspace only re-renders when pageId actually changes
  const pageId = useMemo(() => {
    const p = searchParams.get('page');
    return p || undefined; // undefined = no page selected (show empty state)
  }, [searchParams]);

  // Render Workspace once and keep it mounted permanently
  // The pageId prop changes reactively as query params change
  return <Workspace initialRoutePageId={pageId} />;
}
