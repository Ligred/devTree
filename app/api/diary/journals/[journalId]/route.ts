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
        error: 'Diary database schema is not up to date. Run Prisma migration and try again.',
        code: 'DIARY_SCHEMA_OUTDATED',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

type DiaryJournalDelegate = {
  findUnique: (args: unknown) => Promise<{ id: string; ownerId: string; name: string } | null>;
  update: (
    args: unknown,
  ) => Promise<{ id: string; name: string; createdAt: Date; updatedAt: Date }>;
};

const diaryJournalDelegate = (prisma as unknown as { diaryJournal: DiaryJournalDelegate })
  .diaryJournal;

type Params = { params: Promise<{ journalId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { journalId } = await params;

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (name.length > 60) {
    return NextResponse.json({ error: 'name is too long' }, { status: 400 });
  }

  try {
    const existing = await diaryJournalDelegate.findUnique({
      where: { id: journalId },
      select: { id: true, ownerId: true, name: true },
    });

    if (!existing || existing.ownerId !== auth.userId) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
    }

    const updated = await diaryJournalDelegate.update({
      where: { id: journalId },
      data: { name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A journal with this name already exists', code: 'DUPLICATE_NAME' },
        { status: 409 },
      );
    }

    return handleDiaryApiError(
      '[PATCH /api/diary/journals/[journalId]]',
      error,
      'Failed to rename journal',
    );
  }
}
