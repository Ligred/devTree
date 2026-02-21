import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ folderId: string }> };
type ParentResult =
  | { value: string | null }
  | { skip: true }
  | { errorResponse: NextResponse };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate and resolve the `parentId` field from the request body.
 *
 * Returns:
 *   `{ value }` — resolved parent id (string) or null (move to root)
 *   `{ skip: true }` — field absent or invalid type; caller should ignore it
 *   `{ errorResponse }` — circular reference or unknown parent; caller returns it
 */
async function resolveParentId(
  raw: unknown,
  folderId: string,
  userId: string,
): Promise<ParentResult> {
  if (raw === null) return { value: null };
  if (typeof raw !== 'string' || !raw) return { skip: true };
  if (raw === folderId) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Cannot move a folder into itself' },
        { status: 400 },
      ),
    };
  }
  const parent = await prisma.folder.findUnique({ where: { id: raw } });
  if (parent?.ownerId !== userId) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Parent folder not found' },
        { status: 404 },
      ),
    };
  }
  return { value: raw };
}

// ─── PUT /api/folders/[folderId]/move ─────────────────────────────────────────
// Body: { parentId?: string | null; order?: number }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const { folderId } = await params;
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (folder?.ownerId !== userId) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  let body: { parentId?: unknown; order?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: { parentId?: string | null; order?: number } = {};

  if ('parentId' in body) {
    const result = await resolveParentId(body.parentId, folderId, userId);
    if ('errorResponse' in result) return result.errorResponse;
    if (!('skip' in result)) updates.parentId = result.value;
  }

  if (typeof body.order === 'number' && Number.isInteger(body.order)) {
    updates.order = body.order;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.folder.update({ where: { id: folderId }, data: updates });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/folders/[folderId]/move]', err);
    return NextResponse.json({ error: 'Failed to move folder' }, { status: 500 });
  }
}
