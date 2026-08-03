'use client';

import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';
import { AppNav } from '@/components/AppNav';
import { APP_NAME } from '@/lib/constants';
import { userInitials } from '@/lib/auth/session';
import type { UserRole } from '@prisma/client';

export function AppHeader({
  user,
}: {
  user: { userId: string; email: string; name: string; role: UserRole };
}) {
  const initials = userInitials(user.name, user.email);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-white">
      <div className="mx-auto flex h-14 max-w-app items-center gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/websites"
          className="shrink-0 text-lg font-bold tracking-tight text-ink-50 sm:text-xl"
        >
          {APP_NAME}
        </Link>

        <AppNav role={user.role} />

        <details className="relative ml-auto shrink-0">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-ink-900 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-50 text-xs font-semibold text-moss-700">
              {initials}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm text-ink-100 sm:inline">
              {user.name}
            </span>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-ink-700 bg-white p-1 shadow-card">
            <Link
              href="/account"
              className="block rounded-md px-3 py-2 text-sm text-ink-100 hover:bg-ink-900"
            >
              Мой профиль
            </Link>
            {user.role === 'ADMIN' ? (
              <Link
                href="/settings/users"
                className="block rounded-md px-3 py-2 text-sm text-ink-100 hover:bg-ink-900"
              >
                Пользователи
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-100 hover:bg-ink-900"
              >
                Выйти
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
