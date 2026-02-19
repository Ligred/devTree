import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('avatar') ?? formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'Upload a file using the "avatar" or "file" field' },
      { status: 400 },
    );
  }

  const blob = file as Blob;
  if (!ALLOWED_TYPES.has(blob.type)) {
    return NextResponse.json(
      { error: 'Allowed types: JPEG, PNG, GIF, WebP' },
      { status: 400 },
    );
  }
  if (blob.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File must be under 2MB' },
      { status: 400 },
    );
  }

  const ext = EXT_MAP[blob.type] ?? '.jpg';
  const filename = `${token.sub}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  const filepath = path.join(dir, filename);

  try {
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await blob.arrayBuffer());
    await writeFile(filepath, buffer);
  } catch (err) {
    console.error('Avatar upload write failed:', err);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 },
    );
  }

  const url = `/uploads/avatars/${filename}`;
  await prisma.user.update({
    where: { id: token.sub },
    data: { image: url },
  });

  return NextResponse.json({ url });
}
