'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/ui/cn';

export function ActionMenu({
  label = 'Дополнительные действия',
  children,
  align = 'end',
  className,
}: {
  label?: string;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        close();
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
  }, [open, close]);

  useEffect(() => {
    const onPop = () => close();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [close]);

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        •••
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-50 mt-1 w-56 max-w-[calc(100vw-2rem)] space-y-1 rounded-[10px] border border-ink-700 bg-white p-1.5 shadow-card',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <div
            onClick={(event) => {
              const el = event.target as HTMLElement;
              if (el.closest('a,button[type="submit"],button[data-close-menu]')) {
                close();
              }
            }}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Preserve scroll across router.refresh(). */
export function preserveScroll(refresh: () => void): void {
  if (typeof window === 'undefined') {
    refresh();
    return;
  }
  const y = window.scrollY;
  refresh();
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}
