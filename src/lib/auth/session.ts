import { AUTH_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/constants';

export type AdminSession = {
  email: string;
  scope: 'admin';
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim() ?? '';
  if (secret.length < 16) {
    throw new Error('SESSION_SECRET must be at least 16 characters long');
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64Url(input: string): string {
  return bytesToBase64Url(new TextEncoder().encode(input));
}

function fromBase64Url(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function createSessionToken(email: string): Promise<string> {
  const payload: AdminSession = {
    email,
    scope: 'admin',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token?: string | null): Promise<AdminSession | null> {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = await sign(encodedPayload);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AdminSession;
    if (payload.scope !== 'admin') return null;
    if (!payload.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return AUTH_COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const expectedPassword = process.env.ADMIN_PASSWORD ?? '';
  if (!expectedEmail || !expectedPassword) return false;
  if (expectedPassword.length < 8) return false;

  const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

/**
 * Pure helper for route protection decisions (unit-tested).
 * Returns a login redirect path when the session is missing.
 */
export function resolveProtectedPathAccess(options: {
  pathname: string;
  hasValidSession: boolean;
}): { allowed: boolean; redirectTo: string | null } {
  const isProtected =
    options.pathname === '/dashboard' ||
    options.pathname.startsWith('/dashboard/') ||
    options.pathname === '/tasks' ||
    options.pathname.startsWith('/tasks/') ||
    options.pathname === '/websites' ||
    options.pathname.startsWith('/websites/') ||
    options.pathname === '/integrations' ||
    options.pathname.startsWith('/integrations/') ||
    options.pathname === '/logout';

  if (!isProtected) {
    return { allowed: true, redirectTo: null };
  }

  if (options.hasValidSession) {
    return { allowed: true, redirectTo: null };
  }

  const next = encodeURIComponent(options.pathname);
  return { allowed: false, redirectTo: `/login?next=${next}` };
}

export class UnauthorizedError extends Error {
  constructor(message = 'Требуется авторизация') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Pure auth guard (unit-tested). Server pages also use requireAdminSession(). */
export function assertAuthenticated(
  session: AdminSession | null | undefined,
): asserts session is AdminSession {
  if (!session) {
    throw new UnauthorizedError();
  }
}
