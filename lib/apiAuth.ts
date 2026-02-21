/**
 * apiAuth.ts — Shared authentication helper for API routes.
 *
 * Centralises the `getToken()` call so every route uses the same secret lookup
 * and returns a consistent error format.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export type AuthResult =
  | { userId: string; error?: never }
  | { userId?: never; error: NextResponse };

/**
 * Resolve the authenticated user from the request's JWT cookie.
 * Returns `{ userId }` on success or `{ error: NextResponse }` (401) on failure.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (auth.error) return auth.error;
 *   const { userId } = auth;
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { userId: token.sub };
}
