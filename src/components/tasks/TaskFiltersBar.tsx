import Link from 'next/link';
import type { TaskFilters } from '@/lib/tasks/types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/ui/labels';
import type { WebsiteOption } from '@/lib/tasks/types';

export function TaskFiltersBar({
  filters,
  websites,
  groups,
  users = [],
}: {
  filters: TaskFilters;
  websites: WebsiteOption[];
  groups: string[];
  users?: Array<{ id: string; name: string; email: string }>;
}) {
  return (
    <form method="get" action="/tasks" className="space-y-3">
      {/* Preserve focus from tab / legacy URL — not a visible control. */}
      <input type="hidden" name="focus" value={filters.focus} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm text-ink-200">
          Поиск
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Название, описание или домен"
            className="field-input mt-1"
          />
        </label>
        <label className="block text-sm text-ink-200">
          Сайт
          <select name="websiteId" defaultValue={filters.websiteId} className="field-input mt-1">
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
          <select name="group" defaultValue={filters.group} className="field-input mt-1">
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
          <select name="priority" defaultValue={filters.priority} className="field-input mt-1">
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
          <select name="status" defaultValue={filters.status} className="field-input mt-1">
            <option value="">Любой</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Исполнитель
          <select
            name="assignedToUserId"
            defaultValue={filters.assignedToUserId}
            className="field-input mt-1"
          >
            <option value="">Любой</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Автор
          <select
            name="createdByUserId"
            defaultValue={filters.createdByUserId}
            className="field-input mt-1"
          >
            <option value="">Любой</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">
          Применить
        </button>
        <Link href="/tasks" className="btn-secondary">
          Сбросить фильтры
        </Link>
      </div>
    </form>
  );
}
