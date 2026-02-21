import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ pageId: string; blockId: string }> };

/** Verify that a block exists, belongs to the page, and the page belongs to the user. */
async function getOwnedBlock(blockId: string, pageId: string, userId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: { page: true },
  });
  if (!block) return null;
  if (block.pageId !== pageId) return null;
  if (block.page.ownerId !== userId) return null;
  return block;
}

// ─── PUT /api/pages/[pageId]/blocks/[blockId] ─────────────────────────────────
// Updates content and/or colSpan and/or tags for a single block.
// Body: { content?: unknown; colSpan?: 1|2; tags?: string[] }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { pageId, blockId } = await params;
  const block = await getOwnedBlock(blockId, pageId, auth.userId);
  if (!block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  }

  let body: { content?: unknown; colSpan?: unknown; tags?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: { content?: object; colSpan?: number; tags?: string[] } = {};

  if (body.content !== undefined) {
    updates.content = body.content as object;
  }
  if (body.colSpan === 1 || body.colSpan === 2) {
    updates.colSpan = body.colSpan;
  }
  if (Array.isArray(body.tags)) {
    updates.tags = (body.tags as unknown[])
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.block.update({
      where: { id: blockId },
      data: updates,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/pages/[pageId]/blocks/[blockId]]', err);
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
  }
}

// ─── DELETE /api/pages/[pageId]/blocks/[blockId] ──────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { pageId, blockId } = await params;
  const block = await getOwnedBlock(blockId, pageId, auth.userId);
  if (!block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  }

  try {
    await prisma.block.delete({ where: { id: blockId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/pages/[pageId]/blocks/[blockId]]', err);
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
  }
}
