import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ pageId: string }> };

// ─── PUT /api/pages/[pageId]/move ─────────────────────────────────────────────
// Body: { folderId?: string | null; order?: number }
// Moves a page to a different folder and/or position.

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { pageId } = await params;

  // Verify ownership
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page || page.ownerId !== auth.userId) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  let body: { folderId?: unknown; order?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: { folderId?: string | null; order?: number } = {};

  // folderId: null means move to root; a string means move to that folder
  if ('folderId' in body) {
    if (body.folderId === null) {
      updates.folderId = null;
    } else if (typeof body.folderId === 'string' && body.folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: body.folderId } });
      if (!folder || folder.ownerId !== auth.userId) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      updates.folderId = body.folderId;
    }
  }

  if (typeof body.order === 'number' && Number.isInteger(body.order)) {
    updates.order = body.order;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.page.update({
      where: { id: pageId },
      data: updates,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/pages/[pageId]/move]', err);
    return NextResponse.json({ error: 'Failed to move page' }, { status: 500 });
  }
}
