import Link from 'next/link';
import type { ReportsFilters } from '@/lib/reports/types';
import { LIFECYCLE_STAGE_LABELS, WEBSITE_STATUS_LABELS } from '@/lib/ui/labels';

const PERIOD_OPTIONS = [
  { value: '30', label: 'Последние 30 дней' },
  { value: '90', label: 'Последние 90 дней' },
  { value: 'year', label: 'Текущий год' },
  { value: 'prev_year', label: 'Прошлый год' },
  { value: 'all', label: 'Всё время' },
  { value: 'custom', label: 'Произвольный диапазон' },
] as const;

export function ReportsFilters({
  filters,
  groups,
}: {
  filters: ReportsFilters;
  groups: string[];
}) {
  return (
    <form method="get" action="/reports" className="space-y-3 rounded border border-ink-700/70 bg-ink-950/40 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm text-ink-200">
          Период запуска
          <select
            name="period"
            defaultValue={filters.period}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          С даты
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
        </label>
        <label className="block text-sm text-ink-200">
          По дату
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
        </label>
        <label className="block text-sm text-ink-200">
          Группа
          <select
            name="group"
            defaultValue={filters.group}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            <option value="">Все группы</option>
            <option value="__none__">Без группы</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Статус
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            <option value="">Любой статус</option>
            {Object.entries(WEBSITE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Этап
          <select
            name="stage"
            defaultValue={filters.stage}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            <option value="">Все этапы</option>
            {Object.entries(LIFECYCLE_STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          name="archived"
          value="1"
          defaultChecked={filters.includeArchived}
          className="rounded border-ink-700"
        />
        Включать архивные
      </label>
      {filters.groupSort !== 'count' ? (
        <input type="hidden" name="groupSort" value={filters.groupSort} />
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded bg-moss-600 px-4 py-2 text-sm text-sand-50 hover:bg-moss-500"
        >
          Применить
        </button>
        <Link
          href="/reports"
          className="rounded border border-ink-700 px-4 py-2 text-sm text-ink-100 hover:border-moss-500"
        >
          Сбросить фильтры
        </Link>
      </div>
    </form>
  );
}
