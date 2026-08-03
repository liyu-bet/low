'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/ui/cn';
import type { UserRole } from '@prisma/client';

const PRIMARY = [
  { href: '/websites', label: 'Сайты' },
  { href: '/tasks', label: 'Задачи' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/websites') return pathname === '/websites' || pathname.startsWith('/websites/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname() || '';

  const more = [
    { href: '/dashboard', label: 'Обзор' },
    { href: '/reports', label: 'Отчёты' },
    ...(role === 'ADMIN'
      ? [
          { href: '/integrations', label: 'Интеграции' },
          { href: '/settings/users', label: 'Пользователи' },
        ]
      : []),
  ];

  const moreActive = more.some((item) => isActive(pathname, item.href));

  return (
    <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1 sm:gap-1">
      {PRIMARY.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium transition',
              active
                ? 'bg-moss-50 text-moss-700'
                : 'text-ink-200 hover:bg-ink-900 hover:text-ink-50',
            )}
          >
            {item.label}
          </Link>
        );
      })}

      <details className="relative shrink-0">
        <summary
          className={cn(
            'cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-sm font-medium transition marker:content-none [&::-webkit-details-marker]:hidden',
            moreActive
              ? 'bg-moss-50 text-moss-700'
              : 'text-ink-200 hover:bg-ink-900 hover:text-ink-50',
          )}
        >
          Ещё
        </summary>
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-ink-700 bg-white p-1 shadow-card">
          {more.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm',
                  active
                    ? 'bg-moss-50 font-medium text-moss-700'
                    : 'text-ink-100 hover:bg-ink-900',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </details>
    </nav>
  );
}
