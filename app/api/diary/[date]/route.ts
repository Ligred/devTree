import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const INVALID_DATE_ERROR = 'Invalid date. Use YYYY-MM-DD.';

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

type DiaryEntryDelegate = {
  findUnique: (args: unknown) => Promise<{
    id: string;
    entryDate: Date;
    content: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    weatherTempC: number | null;
    weatherCode: number | null;
    weatherLabel: string | null;
    locationName: string | null;
    locationShort: string | null;
    locationLat: number | null;
    locationLon: number | null;
  } | null>;
  create: (args: unknown) => Promise<{
    id: string;
    entryDate: Date;
    content: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    weatherTempC: number | null;
    weatherCode: number | null;
    weatherLabel: string | null;
    locationName: string | null;
    locationShort: string | null;
    locationLat: number | null;
    locationLon: number | null;
  }>;
  update: (args: unknown) => Promise<{
    id: string;
    entryDate: Date;
    content: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    weatherTempC: number | null;
    weatherCode: number | null;
    weatherLabel: string | null;
    locationName: string | null;
    locationShort: string | null;
    locationLat: number | null;
    locationLon: number | null;
  }>;
  delete: (args: unknown) => Promise<unknown>;
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

type Params = { params: Promise<{ date: string }> };

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

function normalizeContent(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null {
  if (value === undefined) return null;
  if (value === null) return Prisma.DbNull;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Prisma.InputJsonValue;
  }
  return null;
}

type WeatherInput = {
  tempC?: unknown;
  weatherCode?: unknown;
  weatherLabel?: unknown;
  locationName?: unknown;
  locationShort?: unknown;
  locationLat?: unknown;
  locationLon?: unknown;
};

function normalizeWeather(value: unknown): {
  weatherTempC: number | null;
  weatherCode: number | null;
  weatherLabel: string | null;
  locationName: string | null;
  locationShort: string | null;
  locationLat: number | null;
  locationLon: number | null;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as WeatherInput;

  const tempC = typeof input.tempC === 'number' ? input.tempC : null;
  const weatherCode = typeof input.weatherCode === 'number' ? input.weatherCode : null;
  const weatherLabel = typeof input.weatherLabel === 'string' ? input.weatherLabel.trim() : '';
  const locationName = typeof input.locationName === 'string' ? input.locationName.trim() : '';
  const locationShort = typeof input.locationShort === 'string' ? input.locationShort.trim() : '';
  const locationLat = typeof input.locationLat === 'number' ? input.locationLat : null;
  const locationLon = typeof input.locationLon === 'number' ? input.locationLon : null;

  if (
    tempC === null &&
    weatherCode === null &&
    !weatherLabel &&
    !locationName &&
    !locationShort &&
    locationLat === null &&
    locationLon === null
  ) {
    return null;
  }

  return {
    weatherTempC: tempC,
    weatherCode,
    weatherLabel: weatherLabel || null,
    locationName: locationName || null,
    locationShort: locationShort || null,
    locationLat,
    locationLon,
  };
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

  if (!journal || journal.ownerId !== userId) {
    return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
  }

  return journal.id;
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { date } = await params;
  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    return NextResponse.json({ error: INVALID_DATE_ERROR }, { status: 400 });
  }

  try {
    const journalId = await resolveJournalId(req, auth.userId);
    if (journalId instanceof NextResponse) return journalId;

    const entry = await delegates.diaryEntry.findUnique({
      where: {
        ownerId_journalId_entryDate: {
          ownerId: auth.userId,
          journalId,
          entryDate: parsedDate,
        },
      },
      select: {
        id: true,
        entryDate: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        weatherTempC: true,
        weatherCode: true,
        weatherLabel: true,
        locationName: true,
        locationShort: true,
        locationLat: true,
        locationLon: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        {
          entryDate: formatDateOnly(parsedDate),
          content: { type: 'doc', content: [] },
          createdAt: null,
          updatedAt: null,
          exists: false,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      id: entry.id,
      entryDate: formatDateOnly(entry.entryDate),
      content: entry.content,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      weather: {
        tempC: entry.weatherTempC,
        weatherCode: entry.weatherCode,
        weatherLabel: entry.weatherLabel,
        locationName: entry.locationName,
        locationShort: entry.locationShort,
        locationLat: entry.locationLat,
        locationLon: entry.locationLon,
      },
      exists: true,
    });
  } catch (error) {
    return handleDiaryApiError('[GET /api/diary/[date]]', error, 'Failed to load diary entry');
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { date } = await params;
  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    return NextResponse.json({ error: INVALID_DATE_ERROR }, { status: 400 });
  }

  let body: { content?: unknown; weather?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const normalizedContent = normalizeContent(body.content);
  if (normalizedContent === null) {
    return NextResponse.json({ error: 'content must be an object or null' }, { status: 400 });
  }

  const normalizedWeather = normalizeWeather(body.weather);

  try {
    const journalId = await resolveJournalId(req, auth.userId);
    if (journalId instanceof NextResponse) return journalId;

    const existing = await delegates.diaryEntry.findUnique({
      where: {
        ownerId_journalId_entryDate: {
          ownerId: auth.userId,
          journalId,
          entryDate: parsedDate,
        },
      },
      select: { id: true },
    });

    const entry = existing
      ? await delegates.diaryEntry.update({
          where: { id: existing.id },
          data: { content: normalizedContent },
          select: {
            id: true,
            entryDate: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            weatherTempC: true,
            weatherCode: true,
            weatherLabel: true,
            locationName: true,
            locationShort: true,
            locationLat: true,
            locationLon: true,
          },
        })
      : await delegates.diaryEntry.create({
          data: {
            ownerId: auth.userId,
            journalId,
            entryDate: parsedDate,
            content: normalizedContent,
            weatherTempC: normalizedWeather?.weatherTempC ?? null,
            weatherCode: normalizedWeather?.weatherCode ?? null,
            weatherLabel: normalizedWeather?.weatherLabel ?? null,
            locationName: normalizedWeather?.locationName ?? null,
            locationShort: normalizedWeather?.locationShort ?? null,
            locationLat: normalizedWeather?.locationLat ?? null,
            locationLon: normalizedWeather?.locationLon ?? null,
          },
          select: {
            id: true,
            entryDate: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            weatherTempC: true,
            weatherCode: true,
            weatherLabel: true,
            locationName: true,
            locationShort: true,
            locationLat: true,
            locationLon: true,
          },
        });

    return NextResponse.json({
      id: entry.id,
      entryDate: formatDateOnly(entry.entryDate),
      content: entry.content,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      weather: {
        tempC: entry.weatherTempC,
        weatherCode: entry.weatherCode,
        weatherLabel: entry.weatherLabel,
        locationName: entry.locationName,
        locationShort: entry.locationShort,
        locationLat: entry.locationLat,
        locationLon: entry.locationLon,
      },
    });
  } catch (error) {
    return handleDiaryApiError('[PUT /api/diary/[date]]', error, 'Failed to save diary entry');
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { date } = await params;
  const parsedDate = parseDateOnly(date);
  if (!parsedDate) {
    return NextResponse.json({ error: INVALID_DATE_ERROR }, { status: 400 });
  }

  try {
    const journalId = await resolveJournalId(req, auth.userId);
    if (journalId instanceof NextResponse) return journalId;

    await delegates.diaryEntry.delete({
      where: {
        ownerId_journalId_entryDate: {
          ownerId: auth.userId,
          journalId,
          entryDate: parsedDate,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
