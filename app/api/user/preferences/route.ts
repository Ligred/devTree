import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';

/** Shape of user preferences stored in DB (JSON). */
export type UserPreferences = {
  theme?: 'light' | 'dark' | 'system';
  locale?: 'en' | 'uk';
  tagsPerPageEnabled?: boolean;
  tagsPerBlockEnabled?: boolean;
};

function isPreferencesBody(
  body: unknown,
): body is Partial<Record<keyof UserPreferences, unknown>> {
  return typeof body === 'object' && body !== null;
}

/**
 * GET /api/user/preferences — return the current user's saved preferences.
 * Returns an empty object if none are set.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { preferences: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const prefs = (user.preferences as UserPreferences | null) ?? {};
  return NextResponse.json(prefs);
}

/**
 * PATCH /api/user/preferences — merge provided preferences into the user's stored preferences.
 * Only top-level keys present in the body are updated; others are left unchanged.
 */
export async function PATCH(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isPreferencesBody(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const updates: UserPreferences = {};
  if (body.theme === 'light' || body.theme === 'dark' || body.theme === 'system') {
    updates.theme = body.theme;
  }
  if (body.locale === 'en' || body.locale === 'uk') {
    updates.locale = body.locale;
  }
  if (typeof body.tagsPerPageEnabled === 'boolean') {
    updates.tagsPerPageEnabled = body.tagsPerPageEnabled;
  }
  if (typeof body.tagsPerBlockEnabled === 'boolean') {
    updates.tagsPerBlockEnabled = body.tagsPerBlockEnabled;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid preference fields' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { preferences: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const current = (user.preferences as UserPreferences | null) ?? {};
  const merged: UserPreferences = { ...current, ...updates };

  await prisma.user.update({
    where: { id: token.sub },
    data: { preferences: merged },
  });

  return NextResponse.json(merged);
}
