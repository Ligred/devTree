import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function handleDiaryApiError(scope: string, error: unknown) {
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

  return NextResponse.json({ error: 'Failed to load diary entries' }, { status: 500 });
}

type DiaryEntryDelegate = {
  findMany: (args: unknown) => Promise<
    Array<{
      id: string;
      entryDate: Date;
      createdAt: Date;
      updatedAt: Date;
      content: unknown;
      weatherTempC: number | null;
      weatherCode: number | null;
      weatherLabel: string | null;
      locationName: string | null;
      locationShort: string | null;
      locationLat: number | null;
      locationLon: number | null;
    }>
  >;
};

type DiaryJournalDelegate = {
  findFirst: (args: unknown) => Promise<{ id: string; name: string } | null>;
  findUnique: (args: unknown) => Promise<{ id: string; name: string; ownerId: string } | null>;
  create: (args: unknown) => Promise<{ id: string; name: string }>;
};

const delegates = prisma as unknown as {
  diaryEntry: DiaryEntryDelegate;
  diaryJournal: DiaryJournalDelegate;
};

function parseDateOnly(value: string): Date | null {
  if (!DATE_RX.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function hasRenderableContent(content: unknown): boolean {
  if (content == null) return false;
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) return content.length > 0;
  if (typeof content === 'object') return Object.keys(content as Record<string, unknown>).length > 0;
  return true;
}

function extractPreview(content: unknown): { previewText: string; previewImage: string | null } {
  if (!content || typeof content !== 'object') return { previewText: '', previewImage: null };

  const textChunks: string[] = [];
  let previewImage: string | null = null;

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: unknown; text?: unknown; attrs?: unknown; content?: unknown };

    if (typeof n.text === 'string' && n.text.trim()) {
      textChunks.push(n.text.trim());
    }

    if (!previewImage && n.type === 'image' && n.attrs && typeof n.attrs === 'object') {
      const src = (n.attrs as { src?: unknown }).src;
      if (typeof src === 'string' && src.trim()) {
        previewImage = src.trim();
      }
    }

    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  };

  walk(content);

  const previewText = textChunks.join(' ').split(/\s+/).join(' ').trim().slice(0, 180);
  return { previewText, previewImage };
}

async function ensureMainJournal(userId: string): Promise<{ id: string; name: string }> {
  const existing = await delegates.diaryJournal.findFirst({
    where: { ownerId: userId, name: 'main' },
    select: { id: true, name: true },
  });

  if (existing) return existing;

  return delegates.diaryJournal.create({
    data: { ownerId: userId, name: 'main' },
    select: { id: true, name: true },
  });
}

async function resolveJournalId(req: NextRequest, userId: string): Promise<string | NextResponse> {
  const requestedJournalId = req.nextUrl.searchParams.get('journalId');

  if (!requestedJournalId) {
    const main = await ensureMainJournal(userId);
    return main.id;
  }

  const journal = await delegates.diaryJournal.findUnique({
    where: { id: requestedJournalId },
    select: { id: true, ownerId: true, name: true },
  });

  if (journal?.ownerId !== userId) {
    return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
  }

  return journal.id;
}

// GET /api/diary?journalId=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const fromRaw = req.nextUrl.searchParams.get('from');
  const toRaw = req.nextUrl.searchParams.get('to');

  const from = fromRaw ? parseDateOnly(fromRaw) : null;
  const to = toRaw ? parseDateOnly(toRaw) : null;

  if ((fromRaw && !from) || (toRaw && !to)) {
    return NextResponse.json(
      { error: 'Invalid date range. Use YYYY-MM-DD format.' },
      { status: 400 },
    );
  }

  if (from && to && from > to) {
    return NextResponse.json({ error: 'from must be less than or equal to to' }, { status: 400 });
  }

  try {
    const journalId = await resolveJournalId(req, auth.userId);
    if (journalId instanceof NextResponse) return journalId;

    const entries = await delegates.diaryEntry.findMany({
      where: {
        ownerId: auth.userId,
        journalId,
        ...(from || to
          ? {
              entryDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { entryDate: 'desc' },
      select: {
        id: true,
        entryDate: true,
        createdAt: true,
        updatedAt: true,
        content: true,
        weatherTempC: true,
        weatherCode: true,
        weatherLabel: true,
        locationName: true,
        locationShort: true,
        locationLat: true,
        locationLon: true,
      },
    });

    return NextResponse.json(
      entries.map((entry) => {
        const preview = extractPreview(entry.content);

        return {
          id: entry.id,
          entryDate: formatDateOnly(entry.entryDate),
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          hasContent: hasRenderableContent(entry.content),
          previewText: preview.previewText,
          previewImage: preview.previewImage,
          weatherTempC: entry.weatherTempC,
          weatherCode: entry.weatherCode,
          weatherLabel: entry.weatherLabel,
          locationName: entry.locationName,
          locationShort: entry.locationShort,
          locationLat: entry.locationLat,
          locationLon: entry.locationLon,
          journalId,
        };
      }),
    );
  } catch (error) {
    return handleDiaryApiError('[GET /api/diary]', error);
  }
}
