import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionCookieName,
  resolveProtectedPathAccess,
  verifySessionToken,
} from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);
  const access = resolveProtectedPathAccess({
    pathname,
    hasValidSession: Boolean(session),
  });

  if (!access.allowed && access.redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/websites';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/websites', '/websites/:path*', '/integrations', '/integrations/:path*', '/logout', '/login'],
};
