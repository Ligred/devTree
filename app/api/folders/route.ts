import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// ─── GET /api/folders ─────────────────────────────────────────────────────────
// Returns all folders (with page stubs) owned by the authenticated user.

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const folders = await prisma.folder.findMany({
      where: { ownerId: userId },
      include: {
        pages: {
          select: { id: true, title: true, order: true, tags: true, folderId: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(folders);
  } catch (err) {
    console.error('[GET /api/folders]', err);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// ─── POST /api/folders ────────────────────────────────────────────────────────
// Creates a new folder. Body: { name: string; parentId?: string }

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth;

  let body: { name?: unknown; parentId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const parentId =
    typeof body.parentId === 'string' && body.parentId ? body.parentId : null;

  // Verify parent belongs to this user
  if (parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: parentId } });
    if (parent?.ownerId !== userId) {
      return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
    }
  }

  const maxOrder = await prisma.folder.aggregate({
    where: { ownerId: userId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  try {
    const folder = await prisma.folder.create({
      data: { name, ownerId: userId, parentId, order },
      include: { pages: { select: { id: true, title: true, order: true, tags: true, folderId: true } } },
    });
    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    console.error('[POST /api/folders]', err);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
