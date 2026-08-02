import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';
import { APP_NAME } from '@/lib/constants';

const NAV = [
  { href: '/dashboard', label: 'Обзор' },
  { href: '/websites', label: 'Сайты' },
  { href: '/tasks', label: 'Задачи' },
  { href: '/reports', label: 'Отчёты' },
  { href: '/integrations', label: 'Интеграции' },
] as const;

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/dashboard" className="shrink-0 font-display text-2xl text-sand-100">
            {APP_NAME}
          </Link>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 text-sm text-ink-200 sm:gap-4 sm:overflow-visible sm:pb-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap rounded px-2 py-1 hover:bg-ink-900/60 hover:text-sand-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 text-sm text-ink-200 sm:justify-end">
          <span className="truncate sm:max-w-[14rem]">{email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded border border-ink-700 px-3 py-1.5 text-ink-100 hover:border-moss-500 hover:text-sand-100"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
