import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getToken } from 'next-auth/jwt';

const LOCALE_COOKIE = 'devtree-locale';
const LOCALE_HEADER = 'x-devtree-locale';

/** Resolve locale from request: cookie > Accept-Language > en. Runs on every request so layout gets correct locale on first paint. */
function getLocaleFromRequest(req: NextRequest): 'en' | 'uk' {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie === 'uk' || cookie === 'en') return cookie;
  const acceptLang = req.headers.get('accept-language');
  if (acceptLang) {
    const first = acceptLang.split(',')[0].trim().toLowerCase();
    if (first.startsWith('uk')) return 'uk';
  }
  return 'en';
}

/** Add locale to request headers so root layout can read it (layout runs after proxy; header is reliable). */
function nextWithLocale(req: NextRequest, locale: 'en' | 'uk') {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  return { request: { headers: requestHeaders } };
}

// Protect app routes; allow login, register, forgot-password, auth API
const publicPaths = ['/login', '/register', '/forgot-password', '/api/auth'];
const isPublic = (path: string) =>
  publicPaths.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next(nextWithLocale(req, locale));
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next(nextWithLocale(req, locale));
}

export const config = {
  // Don't run auth for Next.js internals (all _next/*), static assets, or favicon.
  // Otherwise JS chunk requests get redirected to /login and browser gets HTML instead of JS.
  matcher: [
    '/((?!_next|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};

