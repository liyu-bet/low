import Link from 'next/link';
import { buildDashboardQuery } from '@/lib/dashboard/service';
import type { AttentionFocus, DashboardFilters, DashboardSummary } from '@/lib/dashboard/types';

type CardDef = {
  key: string;
  label: string;
  value: number;
  href: string;
  active: boolean;
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

  const cards: CardDef[] = [
    {
      key: 'total',
      label: 'Всего активных сайтов',
      value: summary.totalActive,
      href: '/websites',
      active: false,
    },
    {
      key: 'attention',
      label: 'Требуют внимания',
      value: summary.needsAttention,
      href: withFocus('all'),
      active: filters.focus === 'all' && !filters.q && !filters.group && !filters.stage && !filters.priority,
    },
    {
      key: 'down',
      label: 'Недоступны',
      value: summary.down,
      href: withFocus('down'),
      active: filters.focus === 'down',
    },
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

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className={`rounded border px-4 py-3 transition ${
            card.active
              ? 'border-moss-500 bg-moss-500/10'
              : 'border-ink-700/70 bg-ink-950/40 hover:border-moss-500/60'
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-ink-200">{card.label}</p>
          <p className="mt-1 font-display text-3xl text-sand-100">{card.value}</p>
        </Link>
      ))}
    </div>
  );
}
