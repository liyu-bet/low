import Link from 'next/link';
import { buildDashboardQuery } from '@/lib/dashboard/service';
import type { AttentionFocus, DashboardFilters, DashboardSummary } from '@/lib/dashboard/types';
import { cn } from '@/lib/ui/cn';

type CardDef = {
  key: string;
  label: string;
  value: number;
  href: string;
  active: boolean;
  large?: boolean;
};

export function DashboardSummaryCards({
  summary,
  filters,
}: {
  summary: DashboardSummary;
  filters: DashboardFilters;
}) {
  const withFocus = (focus: AttentionFocus | null) =>
    buildDashboardQuery({
      ...filters,
      focus: focus ?? 'all',
    });

  const primary: CardDef[] = [
    {
      key: 'total',
      label: 'Всего активных сайтов',
      value: summary.totalActive,
      href: '/websites',
      active: false,
      large: true,
    },
    {
      key: 'attention',
      label: 'Требуют внимания',
      value: summary.needsAttention,
      href: withFocus('all'),
      active:
        filters.focus === 'all' &&
        !filters.q &&
        !filters.group &&
        !filters.stage &&
        !filters.priority,
      large: true,
    },
    {
      key: 'down',
      label: 'Недоступны',
      value: summary.down,
      href: withFocus('down'),
      active: filters.focus === 'down',
      large: true,
    },
  ];

  const secondary: CardDef[] = [
    {
      key: 'no_gsc',
      label: 'Без GSC',
      value: summary.noGsc,
      href: withFocus('no_gsc'),
      active: filters.focus === 'no_gsc',
    },
    {
      key: 'no_impressions',
      label: 'Без показов',
      value: summary.noImpressions,
      href: withFocus('no_impressions'),
      active: filters.focus === 'no_impressions',
    },
    {
      key: 'no_clicks',
      label: 'Без кликов',
      value: summary.noClicks,
      href: withFocus('no_clicks'),
      active: filters.focus === 'no_clicks',
    },
    {
      key: 'stale_work',
      label: 'Давно не было работ',
      value: summary.staleWork,
      href: withFocus('stale_work'),
      active: filters.focus === 'stale_work',
    },
    {
      key: 'expiring',
      label: 'Домены скоро истекают',
      value: summary.expiring,
      href: withFocus('expiring'),
      active: filters.focus === 'expiring',
    },
    {
      key: 'sync_errors',
      label: 'Ошибки интеграций',
      value: summary.syncErrors,
      href: withFocus('sync_errors'),
      active: filters.focus === 'sync_errors',
    },
    {
      key: 'overdue_tasks',
      label: 'Просроченные задачи',
      value: summary.overdueTasks,
      href: '/tasks?focus=overdue',
      active: false,
    },
    {
      key: 'tasks_today',
      label: 'Задачи на сегодня',
      value: summary.tasksDueToday,
      href: '/tasks?focus=today',
      active: false,
    },
  ];

  const renderCard = (card: CardDef) => (
    <Link
      key={card.key}
      href={card.href}
      className={cn(
        'stat-card block hover:border-moss-500',
        card.active && 'stat-card-active',
      )}
    >
      <p className="text-sm font-medium text-ink-200">{card.label}</p>
      <p
        className={cn(
          'mt-1 font-semibold tabular-nums text-ink-50',
          card.large ? 'text-3xl' : 'text-2xl',
        )}
      >
        {card.value}
      </p>
    </Link>
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">{primary.map(renderCard)}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{secondary.map(renderCard)}</div>
    </div>
  );
}
