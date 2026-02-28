import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { Prisma } from '@prisma/client';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

const DEFAULT_TEMPLATE_NAME = 'Daily Reflection';
const DEFAULT_TEMPLATE_BODY =
  '## Daily Reflection\n\n### How was my day?\n\n### What did I learn?\n\n### What should I focus on next?';

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
  findMany: (
    args: unknown,
  ) => Promise<Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }>>;
  findFirst: (args: unknown) => Promise<{ id: string; name: string } | null>;
  create: (
    args: unknown,
  ) => Promise<{ id: string; name: string; createdAt: Date; updatedAt: Date }>;
};

type DiaryTemplateDelegate = {
  create: (args: unknown) => Promise<{ id: string }>;
};

const delegates = prisma as unknown as {
  diaryJournal: DiaryJournalDelegate;
  diaryTemplate: DiaryTemplateDelegate;
};

const diaryJournalDelegate = delegates.diaryJournal;

async function createDefaultTemplate(journalId: string): Promise<void> {
  await delegates.diaryTemplate.create({
    data: {
      journalId,
      name: DEFAULT_TEMPLATE_NAME,
      body: DEFAULT_TEMPLATE_BODY,
    },
    select: { id: true },
  });
}

async function ensureMainJournal(userId: string): Promise<{ id: string; name: string }> {
  const existing = await diaryJournalDelegate.findFirst({
    where: { ownerId: userId, name: 'main' },
    select: { id: true, name: true },
  });

  if (existing) return existing;

  const created = await diaryJournalDelegate.create({
    data: { ownerId: userId, name: 'main' },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  await createDefaultTemplate(created.id);

  return created;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    await ensureMainJournal(auth.userId);

    const journals = await diaryJournalDelegate.findMany({
      where: { ownerId: auth.userId },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(journals);
  } catch (error) {
    return handleDiaryApiError('[GET /api/diary/journals]', error, 'Failed to load journals');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

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
    const journal = await diaryJournalDelegate.create({
      data: { ownerId: auth.userId, name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    await createDefaultTemplate(journal.id);

    return NextResponse.json(journal, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A journal with this name already exists' },
        { status: 409 },
      );
    }

    return handleDiaryApiError('[POST /api/diary/journals]', error, 'Failed to create journal');
  }
}
