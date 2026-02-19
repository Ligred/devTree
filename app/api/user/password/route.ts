import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /\d/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function validateNewPassword(password: string): string | null {
  if (password.length < MIN_LENGTH) return 'At least 8 characters';
  if (!HAS_UPPERCASE.test(password)) return 'Add an uppercase letter';
  if (!HAS_LOWERCASE.test(password)) return 'Add a lowercase letter';
  if (!HAS_NUMBER.test(password)) return 'Add a number';
  if (!HAS_SPECIAL.test(password)) return 'Add a special character';
  return null;
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : undefined;
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : undefined;
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { password: true },
  });
  if (!user?.password) {
    return NextResponse.json(
      { error: 'Account uses OAuth; set a password in your provider' },
      { status: 400 },
    );
  }

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const err = validateNewPassword(newPassword);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: token.sub },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
