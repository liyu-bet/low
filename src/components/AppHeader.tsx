import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';
import { AppNav } from '@/components/AppNav';
import { APP_NAME } from '@/lib/constants';

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-white">
      <div className="mx-auto flex h-14 max-w-app items-center gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="shrink-0 text-lg font-bold tracking-tight text-ink-50 sm:text-xl"
        >
          {APP_NAME}
        </Link>

        <AppNav />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[12rem] truncate text-sm text-ink-200 md:inline" title={email}>
            {email}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary !py-1.5 !text-xs sm:!text-sm">
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
