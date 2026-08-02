import Link from 'next/link';
import { roundDays } from '@/lib/reports/math';
import type { TaskReportSummary } from '@/lib/reports/types';

function fmt(value: number | null): string {
  const n = roundDays(value, 1);
  return n == null ? '—' : `${n} дн.`;
}

export function TaskReport({ summary }: { summary: TaskReportSummary }) {
  const cards = [
    { label: 'Открытые', value: String(summary.open) },
    { label: 'В работе', value: String(summary.inProgress) },
    { label: 'Просроченные', value: String(summary.overdue) },
    { label: 'Выполнены за 30 дней', value: String(summary.doneLast30Days) },
    { label: 'Среднее время выполнения', value: fmt(summary.meanCompletionDays) },
    { label: 'Медиана выполнения', value: fmt(summary.medianCompletionDays) },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl text-sand-100">Задачи</h2>
          <p className="mt-1 text-sm text-ink-200">
            Canceled не считаются выполненными. Без completedAt — вне длительности.
          </p>
        </div>
        <Link href="/tasks" className="text-sm text-moss-300 hover:text-moss-200">
          Все задачи →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded border border-ink-700/70 bg-ink-950/40 px-3 py-3"
          >
            <div className="text-xs uppercase tracking-wide text-ink-300">{card.label}</div>
            <div className="mt-1 font-display text-xl text-sand-100">{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
