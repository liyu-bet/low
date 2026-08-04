'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  assertAdmin,
  assertAuthenticated,
  authorSnapshot,
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
  type UserSession,
  verifySessionToken,
} from '@/lib/auth/session';
import { authenticateUser, resolveSessionUser } from '@/lib/auth/users';

export type LoginState = {
  error?: string;
  ok?: boolean;
  redirectTo?: string;
};

async function setSessionCookie(user: {
  id: string;
  sessionVersion: number;
}): Promise<void> {
  const token = await createSessionToken({
    userId: user.id,
    sessionVersion: user.sessionVersion,
  });
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, getSessionCookieOptions());
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const nextPath = String(formData.get('next') ?? '/websites');

  const result = await authenticateUser(email, password);
  if (!result.ok) {
    if (result.reason === 'inactive') {
      return { error: 'Учётная запись отключена' };
    }
    return { error: 'Неверный email или пароль' };
  }

  await setSessionCookie(result.user);

  if (result.user.mustChangePassword) {
    return { ok: true, redirectTo: '/account/password' };
  }

  const safeNext =
    nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/websites';
  return { ok: true, redirectTo: safeNext };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  redirect('/login');
}

export async function getOptionalUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await resolveSessionUser({
    userId: payload.userId,
    sessionVersion: payload.sessionVersion,
  });
  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function requireUserSession(options?: {
  allowMustChangePassword?: boolean;
}): Promise<UserSession> {
  const session = await getOptionalUserSession();
  if (!session) {
    redirect('/login');
  }
  if (session.mustChangePassword && !options?.allowMustChangePassword) {
    redirect('/account/password');
  }
  return session;
}

/** Requires authenticated ADMIN. Non-admins are redirected (pages) / never reach admin UI. */
export async function requireAdminSession(): Promise<UserSession> {
  const session = await requireUserSession();
  if (session.role !== 'ADMIN') {
    redirect('/websites');
  }
  return session;
}

/** Re-issue cookie after password change (new sessionVersion). */
export async function refreshSessionCookie(user: {
  id: string;
  sessionVersion: number;
}): Promise<void> {
  await setSessionCookie(user);
}

export { assertAuthenticated, assertAdmin, authorSnapshot };
