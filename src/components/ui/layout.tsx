import type { ReactNode } from 'react';
import { getInitials } from '@/lib/auth/actor-label';
import { cn } from '@/lib/ui/cn';

export function InlineNotice({
  children,
  tone = 'success',
}: {
  children: ReactNode;
  tone?: 'success' | 'error';
}) {
  return (
    <span
      className={tone === 'error' ? 'inline-notice-error' : 'inline-notice'}
      aria-live="polite"
    >
      {children}
    </span>
  );
}

export function UserInitials({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-ink-50',
        className,
      )}
    >
      {getInitials(label)}
    </span>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('space-y-3', className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-2', className)}>
      <h2 className="min-w-0 text-lg font-semibold text-ink-50 sm:text-xl">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="break-anywhere text-xl font-semibold text-ink-50 sm:text-2xl">{title}</h1>
        {description ? <div className="mt-1 text-sm text-ink-200">{description}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('empty-state', className)}>{children}</div>;
}
