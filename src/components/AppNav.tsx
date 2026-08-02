'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/ui/cn';

const NAV = [
  { href: '/dashboard', label: 'Обзор' },
  { href: '/websites', label: 'Сайты' },
  { href: '/tasks', label: 'Задачи' },
  { href: '/reports', label: 'Отчёты' },
  { href: '/integrations', label: 'Интеграции' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/websites') return pathname === '/websites' || pathname.startsWith('/websites/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname() || '';

  return (
    <nav className="-mx-1 flex min-w-0 flex-1 gap-0.5 overflow-x-auto px-1 sm:gap-1">
      {NAV.map((item) => {
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
    </nav>
  );
}
