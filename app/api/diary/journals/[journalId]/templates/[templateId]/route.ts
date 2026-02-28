import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

function handleDiaryApiError(scope: string, error: unknown, fallbackMessage: string) {
  console.error(scope, error);

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  ) {
    return NextResponse.json(
      {
        error:
          'Diary database schema is not up to date. Run Prisma migration and try again.',
        code: 'DIARY_SCHEMA_OUTDATED',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

type DiaryTemplateDelegate = {
  findUnique: (args: unknown) => Promise<{ id: string; journalId: string; journal: { ownerId: string } } | null>;
  update: (args: unknown) => Promise<{ id: string; name: string; body: string; createdAt: Date; updatedAt: Date }>;
  delete: (args: unknown) => Promise<{ id: string }>;
};

const diaryTemplateDelegate = (prisma as unknown as { diaryTemplate: DiaryTemplateDelegate }).diaryTemplate;

type Params = { params: Promise<{ journalId: string; templateId: string }> };

async function getOwnedTemplate(templateId: string, userId: string) {
  const existing = await diaryTemplateDelegate.findUnique({
    where: { id: templateId },
    select: { id: true, journalId: true, journal: { select: { ownerId: true } } },
  });

  if (!existing || existing.journal.ownerId !== userId) return null;
  return existing;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { journalId, templateId } = await params;

  let body: { name?: unknown; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const templateBody = typeof body.body === 'string' ? body.body.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!templateBody) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: 'name is too long' }, { status: 400 });
  }
  if (templateBody.length > 8000) {
    return NextResponse.json({ error: 'body is too long' }, { status: 400 });
  }

  try {
    const existing = await getOwnedTemplate(templateId, auth.userId);
    if (!existing || existing.journalId !== journalId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updated = await diaryTemplateDelegate.update({
      where: { id: templateId },
      data: { name, body: templateBody },
      select: { id: true, name: true, body: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 });
    }

    return handleDiaryApiError(
      '[PATCH /api/diary/journals/[journalId]/templates/[templateId]]',
      error,
      'Failed to update template',
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { journalId, templateId } = await params;

  try {
    const existing = await getOwnedTemplate(templateId, auth.userId);
    if (!existing || existing.journalId !== journalId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await diaryTemplateDelegate.delete({ where: { id: templateId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDiaryApiError(
      '[DELETE /api/diary/journals/[journalId]/templates/[templateId]]',
      error,
      'Failed to delete template',
    );
  }
}
