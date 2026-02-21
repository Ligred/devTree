import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ pageId: string }> };

/** Verify that a page exists and belongs to the given user. */
async function getOwnedPage(pageId: string, userId: string) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page || page.ownerId !== userId) return null;
  return page;
}

// ─── POST /api/pages/[pageId]/blocks ──────────────────────────────────────────
// Creates a new block on the page.
// Body: { type: string; content: unknown; colSpan?: 1|2; order?: number; tags?: string[] }

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { pageId } = await params;
  const page = await getOwnedPage(pageId, auth.userId);
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  let body: {
    type?: unknown;
    content?: unknown;
    colSpan?: unknown;
    order?: unknown;
    tags?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.type !== 'string' || !body.type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }
  if (body.content === undefined) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const colSpan =
    body.colSpan === 1 || body.colSpan === 2 ? body.colSpan : 2;

  // Place at the end if order not specified
  let order: number;
  if (typeof body.order === 'number' && Number.isInteger(body.order)) {
    order = body.order;
  } else {
    const maxOrder = await prisma.block.aggregate({
      where: { pageId },
      _max: { order: true },
    });
    order = (maxOrder._max.order ?? -1) + 1;
  }

  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean)
    : [];

  try {
    const block = await prisma.block.create({
      data: {
        pageId,
        type: body.type as string,
        content: body.content as object,
        colSpan,
        order,
        tags,
      },
    });
    return NextResponse.json(block, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pages/[pageId]/blocks]', err);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }
}

// ─── PUT /api/pages/[pageId]/blocks ───────────────────────────────────────────
// Bulk-reorder blocks. Body: Array<{ id: string; order: number }>

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { pageId } = await params;
  const page = await getOwnedPage(pageId, auth.userId);
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Body must be an array of { id, order } objects' },
      { status: 400 },
    );
  }

  const updates = body.filter(
    (item): item is { id: string; order: number } =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as { id?: unknown }).id === 'string' &&
      typeof (item as { order?: unknown }).order === 'number',
  );

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid reorder entries' }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      updates.map(({ id, order }) =>
        prisma.block.updateMany({
          where: { id, pageId },
          data: { order },
        }),
      ),
    );
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[PUT /api/pages/[pageId]/blocks]', err);
    return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 });
  }
}
