import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';

const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
} as const;

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_RULES.minLength) return 'Password must be at least 8 characters';
  if (!PASSWORD_RULES.uppercase.test(password)) return 'Password must include an uppercase letter';
  if (!PASSWORD_RULES.lowercase.test(password)) return 'Password must include a lowercase letter';
  if (!PASSWORD_RULES.number.test(password)) return 'Password must include a number';
  if (!PASSWORD_RULES.special.test(password)) return 'Password must include a special character (!@#$%^&* etc.)';
  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string; name?: string };
    const { email, password, name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      );
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 },
      );
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      );
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const hashed = await hashPassword(password);
    await prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashed,
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 },
    );
  }
}
