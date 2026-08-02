'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
  verifyAdminCredentials,
  verifySessionToken,
} from '@/lib/auth/session';

export type LoginState = {
  error?: string;
  ok?: boolean;
  redirectTo?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const nextPath = String(formData.get('next') ?? '/dashboard');

  if (!verifyAdminCredentials(email, password)) {
    return { error: 'Неверный email или пароль' };
  }

  const token = await createSessionToken(email.trim().toLowerCase());
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, getSessionCookieOptions());

  const safeNext =
    nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';

  // Do not call redirect() here: with useActionState it surfaces as a client error in Next 15.
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

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    redirect('/login');
  }
  return session;
}
