import Link from 'next/link';
import { buildTasksQuery } from '@/lib/tasks/service';
import type { TaskFilters, TaskFocus, TaskSummary } from '@/lib/tasks/types';

type CardDef = {
  key: string;
  label: string;
  value: number;
  focus: TaskFocus;
};

export function TaskSummaryCards({
  summary,
  filters,
}: {
  summary: TaskSummary;
  filters: TaskFilters;
}) {
  const cards: CardDef[] = [
    { key: 'overdue', label: 'Просрочено', value: summary.overdue, focus: 'overdue' },
    { key: 'today', label: 'На сегодня', value: summary.today, focus: 'today' },
    { key: 'upcoming', label: 'Ближайшие 7 дней', value: summary.upcoming7, focus: 'upcoming' },
    { key: 'no_due', label: 'Без срока', value: summary.noDue, focus: 'no_due' },
    { key: 'in_progress', label: 'В работе', value: summary.inProgress, focus: 'in_progress' },
    { key: 'done', label: 'Выполнено', value: summary.done, focus: 'done' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const href = buildTasksQuery({ ...filters, focus: card.focus, action: '' });
        const active = filters.focus === card.focus;
        return (
          <Link
            key={card.key}
            href={href}
            className={`rounded border px-4 py-3 transition ${
              active
                ? 'border-moss-500 bg-moss-500/10'
                : 'border-ink-700/70 bg-ink-950/40 hover:border-moss-500/60'
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-ink-200">{card.label}</p>
            <p
              className={`mt-1 font-display text-3xl ${
                card.focus === 'overdue' && card.value > 0 ? 'text-red-200' : 'text-sand-100'
              }`}
            >
              {card.value}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
