import Link from 'next/link';
import type { EventSource } from '@prisma/client';
import {
  buildEventListHref,
  type EventFocusFilter,
  type EventListQuery,
  type EventPeriodFilter,
} from '@/lib/events/query';
import { EVENT_SOURCE_LABELS } from '@/lib/ui/labels';

const FOCUS_OPTIONS: Array<{ value: EventFocusFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'work', label: 'Работы' },
  { value: 'technical', label: 'Технические' },
  { value: 'seo', label: 'SEO' },
  { value: 'content', label: 'Контент' },
  { value: 'lifecycle', label: 'Жизненный цикл' },
  { value: 'integration', label: 'Интеграции' },
  { value: 'notes', label: 'Заметки' },
];

const PERIOD_OPTIONS: Array<{ value: EventPeriodFilter; label: string }> = [
  { value: 'all', label: 'Всё' },
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
  { value: '365', label: 'Год' },
];

export function WebsiteEventFilters({
  websiteId,
  query,
  total,
  pageSize,
}: {
  websiteId: string;
  query: EventListQuery;
  total: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <form method="get" action={`/websites/${websiteId}`} className="space-y-3 rounded border border-ink-700 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm text-ink-200">
            Тип
            <select
              name="focus"
              defaultValue={query.focus}
              className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
            >
              {FOCUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ink-200">
            Источник
            <select
              name="source"
              defaultValue={query.source}
              className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
            >
              <option value="">Все источники</option>
              {(Object.keys(EVENT_SOURCE_LABELS) as EventSource[]).map((source) => (
                <option key={source} value={source}>
                  {EVENT_SOURCE_LABELS[source]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ink-200">
            Период
            <select
              name="period"
              defaultValue={query.period}
              className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ink-200">
            Поиск
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Заголовок или описание"
              className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600"
          >
            Применить
          </button>
          <Link
            href={`/websites/${websiteId}#history`}
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Сбросить
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-200">
        <p>
          Страница {query.page} из {totalPages} · найдено {total}
        </p>
        <div className="flex gap-2">
          {query.page > 1 ? (
            <Link
              href={buildEventListHref(websiteId, { ...query, page: query.page - 1 })}
              className="rounded border border-ink-700 px-3 py-1.5 hover:border-moss-500"
            >
              Назад
            </Link>
          ) : (
            <span className="rounded border border-ink-800 px-3 py-1.5 opacity-40">Назад</span>
          )}
          {query.page < totalPages ? (
            <Link
              href={buildEventListHref(websiteId, { ...query, page: query.page + 1 })}
              className="rounded border border-ink-700 px-3 py-1.5 hover:border-moss-500"
            >
              Далее
            </Link>
          ) : (
            <span className="rounded border border-ink-800 px-3 py-1.5 opacity-40">Далее</span>
          )}
        </div>
      </div>
    </div>
  );
}
