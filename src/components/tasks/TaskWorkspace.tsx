import Link from 'next/link';
import { canEditTask } from '@/lib/auth/permissions';
import type { UserSession } from '@/lib/auth/session';
import { GlobalQuickTaskForm } from '@/components/tasks/GlobalQuickTaskForm';
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar';
import {
  DoneTaskSectionsView,
  EmptyMine,
  FlatTaskList,
  OpenTaskSections,
} from '@/components/tasks/TaskSections';
import { TaskTabs } from '@/components/tasks/TaskTabs';
import { isOpenTaskStatus } from '@/lib/tasks/classify';
import { buildTasksQuery } from '@/lib/tasks/service';
import { partitionDoneTasks, partitionOpenTasks } from '@/lib/tasks/sections';
import type { TaskFilters, TaskFocus, TasksPageData } from '@/lib/tasks/types';
import {
  collectActiveFilterChips,
  countActiveFilters,
  isLegacyTaskFocus,
  LEGACY_FOCUS_LABELS,
} from '@/lib/tasks/view';

export function TaskWorkspace({
  data,
  session,
  now = new Date(),
}: {
  data: TasksPageData;
  session: UserSession;
  now?: Date;
}) {
  const focus = data.filters.focus || 'mine';
  const counts = {
    mine: data.summary.mine,
    open: data.items.filter((i) => isOpenTaskStatus(i.status)).length,
    done: data.summary.done,
  };

  const hrefFor = (nextFocus: TaskFocus) =>
    buildTasksQuery({ ...data.filters, focus: nextFocus, action: '' });

  const resetFiltersHref = buildTasksQuery({ focus, action: '' });
  const clearLegacyHref = buildTasksQuery({ ...data.filters, focus: 'mine', action: '' });

  const chips = collectActiveFilterChips(data.filters, {
    websites: data.websites,
    users: data.users,
    buildHref: (partial) =>
      buildTasksQuery({ ...data.filters, ...partial, action: '' } as Partial<TaskFilters>),
  });
  const activeFilterCount = countActiveFilters(data.filters);
  const hasExtraFilters = activeFilterCount > 0;

  const canEdit = (item: (typeof data.filteredItems)[number]) =>
    canEditTask(session, {
      createdByUserId: item.createdByUserId,
      assignedToUserId: item.assignedToUserId,
    });

  const showGrouped = focus === 'open' || focus === 'mine';
  const openSections = showGrouped
    ? partitionOpenTasks(
        data.filteredItems.filter((i) => isOpenTaskStatus(i.status)),
        now,
      )
    : null;
  const doneSections =
    focus === 'done'
      ? partitionDoneTasks(
          data.filteredItems.filter((i) => i.status === 'DONE'),
          now,
        )
      : null;

  const filteredEmpty = (
    <p className="text-sm text-ink-200">По выбранным условиям задачи не найдены.</p>
  );

  const emptyForFocus =
    hasExtraFilters && data.filteredItems.length === 0
      ? filteredEmpty
      : focus === 'mine'
        ? (
            <EmptyMine />
          )
        : focus === 'done'
          ? (
              <p className="text-sm text-ink-200">Выполненных задач пока нет.</p>
            )
          : focus === 'open'
            ? (
                <p className="text-sm text-ink-200">Открытых задач нет.</p>
              )
            : filteredEmpty;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">Задачи</h1>

      <GlobalQuickTaskForm
        websites={data.websites}
        defaultWebsiteId={data.filters.websiteId || undefined}
      />

      <TaskTabs activeFocus={focus} counts={counts} hrefFor={hrefFor} />

      {isLegacyTaskFocus(focus) ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-ink-900 px-2.5 py-1 text-ink-100">
            {LEGACY_FOCUS_LABELS[focus]}
          </span>
          <Link href={clearLegacyHref} className="text-moss-700 hover:underline">
            Убрать
          </Link>
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.clearHref}
              className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-ink-100 hover:bg-ink-800"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link href={resetFiltersHref} className="text-moss-700 hover:underline">
            Сбросить
          </Link>
        </div>
      ) : null}

      <details className="group text-sm">
        <summary className="disclosure-summary border-0 py-1">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="disclosure-chevron">
            <path
              d="M6 3.5 10.5 8 6 12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {activeFilterCount > 0 ? `Фильтры · ${activeFilterCount}` : 'Фильтры'}
        </summary>
        <div className="mt-3">
          <TaskFiltersBar
            filters={data.filters}
            websites={data.websites}
            groups={data.groups}
            users={data.users}
          />
        </div>
      </details>

      {showGrouped && openSections ? (
        <OpenTaskSections
          sections={openSections}
          currentUserId={session.userId}
          canEditTask={canEdit}
          users={data.users}
          empty={emptyForFocus}
        />
      ) : doneSections ? (
        <DoneTaskSectionsView sections={doneSections} empty={emptyForFocus} />
      ) : (
        <FlatTaskList
          items={data.filteredItems}
          currentUserId={session.userId}
          canEditTask={canEdit}
          users={data.users}
          empty={emptyForFocus}
        />
      )}
    </div>
  );
}
