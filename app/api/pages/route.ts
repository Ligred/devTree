import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// ─── GET /api/pages ─────────────────────────────────────────────────────────
// Returns all pages (with blocks) owned by the authenticated user, sorted by order.

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    const pages = await prisma.page.findMany({
      where: { ownerId: userId },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(pages);
  } catch (err) {
    console.error('[GET /api/pages]', err);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

// ─── POST /api/pages ─────────────────────────────────────────────────────────
// Creates a new page. Body: { title: string; folderId?: string }

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth;

  let body: { title?: unknown; folderId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const folderId =
    typeof body.folderId === 'string' && body.folderId ? body.folderId : null;

  // Verify the folder belongs to this user (if provided)
  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (folder?.ownerId !== userId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
  }

  // Place at the end by finding the current max order
  const maxOrder = await prisma.page.aggregate({
    where: { ownerId: userId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  try {
    const page = await prisma.page.create({
      data: {
        title,
        ownerId: userId,
        folderId,
        order,
      },
      include: { blocks: true },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pages]', err);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
