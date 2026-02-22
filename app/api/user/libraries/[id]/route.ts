/**
 * DELETE /api/user/libraries/[id]
 *
 * Unlinks a library from the authenticated user.  The global
 * `ExcalidrawLibrary` record is NOT deleted — other users may still be using it.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const { id: libraryId } = await params;

  try {
    await prisma.userLibrary.delete({
      where: { userId_libraryId: { userId, libraryId } },
    });
  } catch {
    // Record may not exist — treat as success (idempotent delete).
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
