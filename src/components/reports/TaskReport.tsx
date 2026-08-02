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
          <h2 className="text-2xl font-semibold text-sand-100">Задачи</h2>
          <p className="mt-1 text-sm text-ink-200">
            Отменённые задачи не считаются выполненными. Без даты выполнения — вне длительности.
          </p>
        </div>
        <Link href="/tasks" className="text-sm text-moss-600 hover:text-moss-200">
          Все задачи →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded border border-ink-700 bg-white px-3 py-3"
          >
            <div className="text-xs font-medium text-ink-200">{card.label}</div>
            <div className="mt-1 text-xl font-semibold text-sand-100">{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
