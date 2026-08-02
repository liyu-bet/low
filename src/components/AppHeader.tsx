import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';
import { APP_NAME } from '@/lib/constants';

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-display text-2xl text-sand-100">
            {APP_NAME}
          </Link>
          <nav className="flex gap-4 text-sm text-ink-200">
            <Link href="/dashboard" className="hover:text-sand-100">
              Обзор
            </Link>
            <Link href="/reports" className="hover:text-sand-100">
              Отчёты
            </Link>
            <Link href="/tasks" className="hover:text-sand-100">
              Задачи
            </Link>
            <Link href="/websites" className="hover:text-sand-100">
              Сайты
            </Link>
            <Link href="/integrations" className="hover:text-sand-100">
              Интеграции
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-200">
          <span className="hidden sm:inline">{email}</span>
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
