import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ folderId: string }> };

async function getOwnedFolder(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.ownerId !== userId) return null;
  return folder;
}

// ─── PUT /api/folders/[folderId] ──────────────────────────────────────────────
// Rename or reorder a folder. Body: { name?: string; order?: number }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { folderId } = await params;
  const folder = await getOwnedFolder(folderId, auth.userId);
  if (!folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  let body: { name?: unknown; order?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: { name?: string; order?: number } = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim();
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
    console.error('[PUT /api/folders/[folderId]]', err);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// ─── DELETE /api/folders/[folderId] ───────────────────────────────────────────
// Moves all pages in the folder to root (folderId = null), then deletes the folder.

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { folderId } = await params;
  const folder = await getOwnedFolder(folderId, auth.userId);
  if (!folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      // Move pages to root
      prisma.page.updateMany({
        where: { folderId },
        data: { folderId: null },
      }),
      // Detach child folders (set parentId to null — they become root-level folders)
      prisma.folder.updateMany({
        where: { parentId: folderId },
        data: { parentId: null },
      }),
      // Delete the folder
      prisma.folder.delete({ where: { id: folderId } }),
    ]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/folders/[folderId]]', err);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
