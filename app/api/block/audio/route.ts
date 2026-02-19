import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB per record
const ALLOWED_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-wav',
  'audio/flac',
]);
const EXT_MAP: Record<string, string> = {
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/x-wav': '.wav',
  'audio/flac': '.flac',
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

  const file = formData.get('audio') ?? formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'Upload a file using the "audio" or "file" field' },
      { status: 400 },
    );
  }

  const blob = file as Blob;
  const mime = blob.type.split(';')[0]?.trim();
  if (!mime || !ALLOWED_TYPES.has(mime)) {
    return NextResponse.json(
      { error: 'Allowed types: WebM, MP4/M4A, MP3, WAV, OGG, FLAC' },
      { status: 400 },
    );
  }
  if (blob.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Audio must be under 5MB' },
      { status: 400 },
    );
  }

  const ext = EXT_MAP[mime] ?? '.webm';
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'audio');
  const filepath = path.join(dir, filename);

  try {
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await blob.arrayBuffer());
    await writeFile(filepath, buffer);
  } catch (err) {
    console.error('Audio upload write failed:', err);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 },
    );
  }

  const url = `/uploads/audio/${filename}`;
  return NextResponse.json({ url });
}
