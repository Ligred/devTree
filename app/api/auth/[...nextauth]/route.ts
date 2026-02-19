import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';

// Auth.js v5: JWT sessions (stateless, good for Vercel serverless + Neon).
// PrismaAdapter creates/updates User + Account for OAuth; Credentials for email/password.
const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).trim().toLowerCase() },
        });
        if (!user?.password) return null;
        const ok = await verifyPassword(
          credentials.password as string,
          user.password,
        );
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    // Merge fresh name/image from DB so profile updates show without re-login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NextAuth callback types
    async session({ session, token }: { session: any; token: any }) {
      if (session?.user && token?.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { name: true, image: true },
        });
        if (dbUser) {
          session.user.name = dbUser.name ?? session.user.name;
          session.user.image = dbUser.image ?? session.user.image;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
};

const { handlers, auth } = NextAuth(authConfig);
export { auth };

// Wrap so errors return JSON instead of HTML 500 (avoids "Unexpected token '<'" in SessionProvider).
async function handleAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
) {
  try {
    return await handler(req);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Authentication configuration error';
    const hint =
      !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET
        ? ' Set AUTH_SECRET in .env.local (e.g. run: npx auth secret).'
        : '';
    console.error('[auth]', message, err);
    return Response.json(
      { error: 'ConfigurationError', message: message + hint },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleAuth(req, handlers.GET);
}

export async function POST(req: NextRequest) {
  return handleAuth(req, handlers.POST);
}

