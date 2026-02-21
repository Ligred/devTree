/**
 * Deep-link compatibility route for /pages/[pageId] URLs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PURPOSE:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This route exists to:
 * 1. Maintain backward compatibility with old /pages/[pageId] URL format
 * 2. Redirect legacy URLs to the new query param format (/?page=[pageId])
 * 3. Allow users to manually construct /pages/xyz URLs and have them work
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HOW IT WORKS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. USER NAVIGATES TO: /pages/abc123
 *    - Next.js matches this route due to [pageId] dynamic segment
 *    - This Server Component executes on the server
 *    - Reads pageId from route params: 'abc123'
 *
 * 2. SERVER-SIDE REDIRECT:
 *    - Calls redirect() with new URL: /?page=abc123
 *    - Sends 307 Temporary Redirect response to browser
 *    - Browser navigates to /?page=abc123
 *
 * 3. BROWSER ARRIVES AT ROOT:
 *    - app/page.tsx renders with Workspace
 *    - useSearchParams() reads ?page=abc123
 *    - Workspace loads page 'abc123'
 *    - User sees the correct page, URL is now correct format
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY REDIRECT INSTEAD OF RENDERING WORKSPACE HERE?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The key is WHERE Workspace lives:
 *
 * WRONG APPROACH (would cause page refresh issue):
 * ```
 * export default function PageByIdRoute({ params }) {
 *   return <Workspace initialRoutePageId={pageId} />;
 * }
 * ```
 * Problem: Workspace would unmount/remount on every /pages/x → /pages/y nav
 *
 * CORRECT APPROACH (what we do):
 * - Workspace lives at app/page.tsx (root route)
 * - This route just redirects to root with query param
 * - Workspace never unmounts because root route never changes
 * - Query param changes are handled by useSearchParams() reactively
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REDIRECT VS REWRITE:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * We use redirect() instead of Next.js rewrites because:
 * - Redirect updates browser URL (important for bookmarking)
 * - User sees correct canonical URL format
 * - Search engines follow redirects to canonical URL
 * - Clear migration path from old to new URL scheme
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEXT.JS PATTERNS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Dynamic Route Segments:
 *    - [pageId] folder name creates dynamic route parameter
 *    - Matches any URL: /pages/abc, /pages/123, /pages/my-page
 *    - Accessible via params.pageId
 *
 * 2. Server Component (no 'use client'):
 *    - Runs on server only, not sent to browser
 *    - Can use async/await for data fetching
 *    - params is a Promise in Next.js 15+
 *
 * 3. redirect() function:
 *    - Server-side navigation primitive from 'next/navigation'
 *    - Throws special error that Next.js catches
 *    - Results in HTTP 307 Temporary Redirect
 *    - Browser performs navigation
 *
 * 4. URL encoding:
 *    - encodeURIComponent() handles special characters
 *    - Example: pageId="my page" → ?page=my%20page
 *    - Ensures URL safety for spaces, unicode, etc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ pageId: string }>;
};

export default async function PageByIdRoute({ params }: Readonly<PageProps>) {
  // In Next.js 15+, params is a Promise - must await it
  const { pageId } = await params;
  
  // Redirect to root with page ID as query parameter
  // This ensures Workspace stays mounted at root route
  redirect(`/?page=${encodeURIComponent(pageId)}`);
}
