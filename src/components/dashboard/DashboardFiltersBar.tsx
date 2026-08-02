import Link from 'next/link';
import { LIFECYCLE_STAGE_LABELS } from '@/lib/ui/labels';
import type { AttentionFocus, AttentionPriority, DashboardFilters } from '@/lib/dashboard/types';

const FOCUS_OPTIONS: Array<{ value: AttentionFocus; label: string }> = [
  { value: 'all', label: 'Все проблемы' },
  { value: 'down', label: 'Недоступны' },
  { value: 'no_gsc', label: 'Без GSC' },
  { value: 'no_impressions', label: 'Без показов' },
  { value: 'no_clicks', label: 'Без кликов' },
  { value: 'stale_work', label: 'Давно без работ' },
  { value: 'expiring', label: 'Скоро истекают' },
  { value: 'sync_errors', label: 'Ошибки синхронизации' },
];

const PRIORITY_OPTIONS: Array<{ value: '' | AttentionPriority; label: string }> = [
  { value: '', label: 'Любой приоритет' },
  { value: 'critical', label: 'Критический' },
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
];

export function DashboardFiltersBar({
  filters,
  groups,
}: {
  filters: DashboardFilters;
  groups: string[];
}) {
  return (
    <form method="get" action="/dashboard" className="space-y-3 rounded border border-ink-700/70 bg-ink-950/40 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm text-ink-200">
          Поиск
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Домен или название"
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
        </label>
        <label className="block text-sm text-ink-200">
          Проблемы
          <select
            name="focus"
            defaultValue={filters.focus}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            {FOCUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Приоритет
          <select
            name="priority"
            defaultValue={filters.priority}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value || 'any'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Группа
          <select
            name="group"
            defaultValue={filters.group}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
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
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-moss-400"
        >
          Применить
        </button>
        <Link
          href="/dashboard"
          className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
        >
          Сбросить фильтры
        </Link>
      </div>
    </form>
  );
}
