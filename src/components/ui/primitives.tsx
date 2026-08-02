import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

export function Card({
 children,
 className,
 padding = true,
}: {
 children: ReactNode;
 className?: string;
 padding?: boolean;
}) {
 return (
 <div className={cn('rounded-card border border-ink-700 bg-white shadow-card', padding && 'p-4 sm:p-5', className)}>
 {children}
 </div>
 );
}

export function SectionHeader({
 title,
 description,
 action,
}: {
 title: string;
 description?: string;
 action?: ReactNode;
}) {
 return (
 <div className="flex flex-wrap items-end justify-between gap-2">
 <div className="min-w-0">
 <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">{title}</h2>
 {description ? <p className="mt-1 text-sm text-ink-200">{description}</p> : null}
 </div>
 {action ? <div className="shrink-0">{action}</div> : null}
 </div>
 );
}

export function Badge({
 children,
 tone = 'neutral',
 className,
}: {
 children: ReactNode;
 tone?: 'neutral' | 'accent' | 'warning' | 'danger';
 className?: string;
}) {
 const tones = {
 neutral: 'badge-neutral',
 accent: 'badge-accent',
 warning: 'badge-warning',
 danger: 'badge-danger',
 } as const;
 return <span className={cn(tones[tone], className)}>{children}</span>;
}

export function Alert({
 children,
 tone = 'warning',
 className,
}: {
 children: ReactNode;
 tone?: 'warning' | 'danger' | 'success';
 className?: string;
}) {
 const tones = {
 warning: 'alert-warning',
 danger: 'alert-danger',
 success: 'alert-success',
 } as const;
 return <div className={cn(tones[tone], className)}>{children}</div>;
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
 return <div className={cn('empty-state', className)}>{children}</div>;
}

export function StatCard({
 label,
 value,
 href,
 active,
 large,
}: {
 label: string;
 value: string | number;
 href?: string;
 active?: boolean;
 large?: boolean;
}) {
 const content = (
 <>
 <div className="text-xs font-medium text-ink-200 sm:text-sm">{label}</div>
 <div
 className={cn(
 'mt-1 font-semibold tabular-nums text-ink-50',
 large ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
 )}
 >
 {value}
 </div>
 </>
 );

 const className = cn('stat-card', active && 'stat-card-active', href && 'hover:border-moss-500');

 if (href) {
 return (
 <a href={href} className={className}>
 {content}
 </a>
 );
 }

 return <div className={className}>{content}</div>;
}
