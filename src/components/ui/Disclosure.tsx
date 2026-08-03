import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Semantic details with unified chevron + padding. Works without JS. */
export function Disclosure({
  title,
  children,
  summaryExtra,
  className,
  defaultOpen = false,
  id,
}: {
  title: ReactNode;
  children: ReactNode;
  summaryExtra?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  id?: string;
}) {
  return (
    <details
      id={id}
      className={cn('border-b border-ink-800', className)}
      open={defaultOpen || undefined}
    >
      <summary className="disclosure-summary">
        <ChevronIcon className="disclosure-chevron" />
        <span className="min-w-0 flex-1">
          {title}
          {summaryExtra ? (
            <span className="ml-2 font-normal text-ink-200">{summaryExtra}</span>
          ) : null}
        </span>
      </summary>
      <div className="space-y-4 pb-4 pt-1">{children}</div>
    </details>
  );
}
