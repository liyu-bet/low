import Link from 'next/link';
import type { ReportsSummary } from '@/lib/reports/types';

type Card = {
  label: string;
  value: number;
  href: string;
};

export function ReportsSummary({ summary }: { summary: ReportsSummary }) {
  const cards: Card[] = [
    { label: 'Всего сайтов', value: summary.total, href: '/websites' },
    { label: 'Активных', value: summary.active, href: '/websites' },
    { label: 'Запущенных', value: summary.launched, href: '/websites' },
    { label: 'Подключено к GSC', value: summary.withGsc, href: '/websites' },
    { label: 'Есть показы', value: summary.withImpressions, href: '/websites' },
    { label: 'Есть клики', value: summary.withClicks, href: '/websites' },
    { label: 'Архивных', value: summary.archived, href: '/websites?archived=1' },
    { label: 'Требуют внимания', value: summary.needsAttention, href: '/dashboard' },
    { label: 'Открытых задач', value: summary.openTasks, href: '/tasks' },
    { label: 'Просроченных задач', value: summary.overdueTasks, href: '/tasks?focus=overdue' },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">Общая сводка</h2>
        <p className="mt-1 text-sm text-ink-200">
          По текущим фильтрам. Карточки ведут на сайты, обзор или задачи.
        </p>
      </div>
      {summary.dateAnomalies > 0 ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Требуют проверки дат: {summary.dateAnomalies} (отрицательные интервалы исключены из средних)
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded border border-ink-700 bg-white px-3 py-3 hover:border-moss-600"
          >
            <div className="text-xs font-medium text-ink-200">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold text-sand-100">{card.value}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
