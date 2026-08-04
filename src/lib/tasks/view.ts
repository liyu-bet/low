import type { TaskFocus, TaskFilters, TaskListItem } from '@/lib/tasks/types';
import { formatDateOnlyRu } from '@/lib/dates/date-only';
import { formatDateTimeRu, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/ui/labels';

export const PRIMARY_TASK_TABS = [
  { focus: 'mine' as const, label: 'Мои', shortLabel: 'Мои' },
  { focus: 'open' as const, label: 'Все', shortLabel: 'Все' },
  { focus: 'done' as const, label: 'Выполненные', shortLabel: 'Готово' },
];

export const LEGACY_FOCUS_LABELS: Partial<Record<TaskFocus, string>> = {
  today: 'Сегодня',
  overdue: 'Просроченные',
  upcoming: 'Ближайшие',
  no_due: 'Без срока',
  in_progress: 'В работе',
  canceled: 'Отменённые',
};

export function isPrimaryTaskFocus(focus: TaskFocus): boolean {
  return focus === 'mine' || focus === 'open' || focus === 'done';
}

export function isLegacyTaskFocus(focus: TaskFocus): boolean {
  return Boolean(LEGACY_FOCUS_LABELS[focus]);
}

export function assigneeDisplayLabel(
  item: Pick<TaskListItem, 'assignedToLabel' | 'assignedToUserId'>,
  currentUserId?: string,
): string {
  if (currentUserId && item.assignedToUserId === currentUserId) return 'Вы';
  if (item.assignedToLabel?.trim()) return item.assignedToLabel.trim();
  return 'Не назначена';
}

export function formatTaskCompletedWhen(item: TaskListItem): string {
  if (item.completedAt) {
    try {
      return formatDateTimeRu(item.completedAt);
    } catch {
      return formatDateOnlyRu(item.completedAt);
    }
  }
  return formatDateTimeRu(item.updatedAt);
}

export type ActiveFilterChip = {
  key: string;
  label: string;
  clearHref: string;
};

/** Non-focus filters that appear as removable chips. */
export function collectActiveFilterChips(
  filters: TaskFilters,
  options: {
    websites: Array<{ id: string; domain: string }>;
    users: Array<{ id: string; name: string }>;
    buildHref: (next: Partial<TaskFilters>) => string;
  },
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const { buildHref } = options;

  if (filters.q.trim()) {
    chips.push({
      key: 'q',
      label: `Поиск: ${filters.q.trim()}`,
      clearHref: buildHref({ q: '' }),
    });
  }
  if (filters.websiteId) {
    const site = options.websites.find((w) => w.id === filters.websiteId);
    chips.push({
      key: 'websiteId',
      label: `Сайт: ${site?.domain ?? filters.websiteId}`,
      clearHref: buildHref({ websiteId: '' }),
    });
  }
  if (filters.group) {
    chips.push({
      key: 'group',
      label: `Группа: ${filters.group}`,
      clearHref: buildHref({ group: '' }),
    });
  }
  if (filters.priority) {
    chips.push({
      key: 'priority',
      label: `Приоритет: ${TASK_PRIORITY_LABELS[filters.priority]}`,
      clearHref: buildHref({ priority: '' }),
    });
  }
  if (filters.status) {
    chips.push({
      key: 'status',
      label: `Статус: ${TASK_STATUS_LABELS[filters.status]}`,
      clearHref: buildHref({ status: '' }),
    });
  }
  if (filters.assignedToUserId) {
    const user = options.users.find((u) => u.id === filters.assignedToUserId);
    chips.push({
      key: 'assignedToUserId',
      label: `Исполнитель: ${user?.name ?? filters.assignedToUserId}`,
      clearHref: buildHref({ assignedToUserId: '' }),
    });
  }
  if (filters.createdByUserId) {
    const user = options.users.find((u) => u.id === filters.createdByUserId);
    chips.push({
      key: 'createdByUserId',
      label: `Автор: ${user?.name ?? filters.createdByUserId}`,
      clearHref: buildHref({ createdByUserId: '' }),
    });
  }

  return chips;
}

export function countActiveFilters(filters: TaskFilters): number {
  let n = 0;
  if (filters.q.trim()) n += 1;
  if (filters.websiteId) n += 1;
  if (filters.group) n += 1;
  if (filters.priority) n += 1;
  if (filters.status) n += 1;
  if (filters.assignedToUserId) n += 1;
  if (filters.createdByUserId) n += 1;
  return n;
}
