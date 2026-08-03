'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/login/actions';
import { APP_NAME } from '@/lib/constants';
import { userInitials } from '@/lib/auth/session';
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

function MenuPanel({
  id,
  open,
  onClose,
  children,
  className,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      id={id}
      role="menu"
      className={cn(
        'absolute right-0 top-full z-50 mt-1 max-h-[min(24rem,calc(100vh-4.5rem))] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[10px] border border-ink-700 bg-white p-1 shadow-card',
        className,
      )}
      onClick={(event) => {
        const el = event.target as HTMLElement;
        if (el.closest('a,button[type="submit"]')) onClose();
      }}
    >
      {children}
    </div>
  );
}

export function AppHeader({
  user,
}: {
  user: { userId: string; email: string; name: string; role: UserRole };
}) {
  const pathname = usePathname() || '';
  const initials = userInitials(user.name, user.email);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const mobileMenuId = useId();
  const moreMenuId = useId();
  const userMenuId = useId();

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setDesktopMoreOpen(false);
    setUserOpen(false);
  }, []);

  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll();
    };
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        closeAll();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [closeAll]);

  const more = [
    { href: '/dashboard', label: 'Обзор' },
    { href: '/reports', label: 'Отчёты' },
    ...(user.role === 'ADMIN'
      ? [
          { href: '/integrations', label: 'Интеграции' },
          { href: '/settings/users', label: 'Пользователи' },
        ]
      : []),
  ];
  const moreActive = more.some((item) => isActive(pathname, item.href));

  const mobileItems = [
    ...more,
    { href: '/account', label: 'Мой профиль' },
  ];

  return (
    <header ref={rootRef} className="sticky top-0 z-40 border-b border-ink-700 bg-white">
      <div className="mx-auto flex h-14 max-w-app items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-7">
        <Link
          href="/websites"
          className="shrink-0 text-lg font-bold tracking-tight text-ink-50 sm:text-xl"
        >
          {APP_NAME}
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1" aria-label="Основная">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors duration-150',
                  active
                    ? 'bg-moss-50 text-moss-700'
                    : 'text-ink-200 hover:bg-ink-900 hover:text-ink-50',
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Desktop «Ещё» */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              className={cn(
                'rounded-[10px] px-2.5 py-1.5 text-sm font-medium transition-colors duration-150',
                moreActive || desktopMoreOpen
                  ? 'bg-moss-50 text-moss-700'
                  : 'text-ink-200 hover:bg-ink-900 hover:text-ink-50',
              )}
              aria-expanded={desktopMoreOpen}
              aria-controls={moreMenuId}
              onClick={() => {
                setDesktopMoreOpen((v) => !v);
                setUserOpen(false);
                setMobileOpen(false);
              }}
            >
              Ещё
            </button>
            <MenuPanel
              id={moreMenuId}
              open={desktopMoreOpen}
              onClose={() => setDesktopMoreOpen(false)}
              className="left-0 right-auto"
            >
              {more.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
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
            </MenuPanel>
          </div>
        </nav>

        {/* Mobile menu button */}
        <div className="relative sm:hidden">
          <button
            type="button"
            className="icon-btn"
            aria-label="Меню"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            onClick={() => {
              setMobileOpen((v) => !v);
              setUserOpen(false);
            }}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" fill="currentColor">
              <rect x="2" y="3.5" width="12" height="1.5" rx="0.5" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.5" />
              <rect x="2" y="11" width="12" height="1.5" rx="0.5" />
            </svg>
          </button>
          <MenuPanel id={mobileMenuId} open={mobileOpen} onClose={() => setMobileOpen(false)}>
            {mobileItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
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
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-100 hover:bg-ink-900"
              >
                Выйти
              </button>
            </form>
          </MenuPanel>
        </div>

        {/* Desktop user menu */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            className="flex items-center gap-2 rounded-[10px] px-1.5 py-1 hover:bg-ink-900"
            aria-label="Меню пользователя"
            aria-expanded={userOpen}
            aria-controls={userMenuId}
            onClick={() => {
              setUserOpen((v) => !v);
              setDesktopMoreOpen(false);
            }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-50 text-xs font-semibold text-moss-700">
              {initials}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm text-ink-100 lg:inline">
              {user.name}
            </span>
          </button>
          <MenuPanel id={userMenuId} open={userOpen} onClose={() => setUserOpen(false)}>
            <Link
              href="/account"
              role="menuitem"
              className="block rounded-md px-3 py-2 text-sm text-ink-100 hover:bg-ink-900"
            >
              Мой профиль
            </Link>
            {user.role === 'ADMIN' ? (
              <Link
                href="/settings/users"
                role="menuitem"
                className="block rounded-md px-3 py-2 text-sm text-ink-100 hover:bg-ink-900"
              >
                Пользователи
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-100 hover:bg-ink-900"
              >
                Выйти
              </button>
            </form>
          </MenuPanel>
        </div>
      </div>
    </header>
  );
}
