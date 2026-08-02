import Link from 'next/link';
import type { TaskFilters, TaskFocus } from '@/lib/tasks/types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/ui/labels';
import type { WebsiteOption } from '@/lib/tasks/types';

const FOCUS_OPTIONS: Array<{ value: TaskFocus; label: string }> = [
  { value: 'open', label: 'Все открытые' },
  { value: 'overdue', label: 'Просроченные' },
  { value: 'today', label: 'Сегодня' },
  { value: 'upcoming', label: 'Ближайшие' },
  { value: 'no_due', label: 'Без срока' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполненные' },
  { value: 'canceled', label: 'Отменённые' },
];

export function TaskFiltersBar({
  filters,
  websites,
  groups,
}: {
  filters: TaskFilters;
  websites: WebsiteOption[];
  groups: string[];
}) {
  return (
    <form method="get" action="/tasks" className="space-y-3 rounded border border-ink-700 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm text-ink-200">
          Поиск
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Название, описание или домен"
            className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
          />
        </label>
        <label className="block text-sm text-ink-200">
          Фокус
          <select
            name="focus"
            defaultValue={filters.focus}
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
          Сайт
          <select
            name="websiteId"
            defaultValue={filters.websiteId}
            className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
          >
            <option value="">Все сайты</option>
            {websites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Группа
          <select
            name="group"
            defaultValue={filters.group}
            className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
          >
            <option value="">Все группы</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Приоритет
          <select
            name="priority"
            defaultValue={filters.priority}
            className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
          >
            <option value="">Любой</option>
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Статус
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
          >
            <option value="">Любой</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
          href="/tasks"
          className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
        >
          Сбросить фильтры
        </Link>
      </div>
    </form>
  );
}
