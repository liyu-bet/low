import Link from 'next/link';
import { CompactTaskRow } from '@/components/tasks/CompactTaskRow';
import { GlobalQuickTaskForm } from '@/components/tasks/GlobalQuickTaskForm';
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar';
import { buildTasksQuery, getTasksPageData } from '@/lib/tasks/service';
import type { TaskFocus, TaskListItem } from '@/lib/tasks/types';
import { classifyTaskDue } from '@/lib/tasks/classify';
import { cn } from '@/lib/ui/cn';

const TABS: Array<{ focus: TaskFocus; label: string; countKey: keyof Counts }> = [
  { focus: 'open', label: 'Открытые', countKey: 'open' },
  { focus: 'today', label: 'Сегодня', countKey: 'today' },
  { focus: 'in_progress', label: 'В работе', countKey: 'inProgress' },
  { focus: 'done', label: 'Выполненные', countKey: 'done' },
];

type Counts = {
  open: number;
  today: number;
  inProgress: number;
  done: number;
};

function groupOpenTasks(items: TaskListItem[], now: Date) {
  const today: TaskListItem[] = [];
  const upcoming: TaskListItem[] = [];
  const noDue: TaskListItem[] = [];

  for (const item of items) {
    const bucket = classifyTaskDue(item.dueAt, now);
    if (bucket === 'overdue' || bucket === 'today') today.push(item);
    else if (bucket === 'upcoming') upcoming.push(item);
    else noDue.push(item);
  }

  return { today, upcoming, noDue };
}

function TaskGroup({
  title,
  items,
  note,
}: {
  title: string;
  items: TaskListItem[];
  note?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ink-200">
        {title}
        {note ? <span className="ml-2 font-normal text-ink-200">{note}</span> : null}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <CompactTaskRow key={item.id} item={item} showWebsite />
        ))}
      </ul>
    </div>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await getTasksPageData(params);
  const now = new Date();
  const focus = data.filters.focus || 'open';

  const counts: Counts = {
    open: data.items.filter((i) => i.status === 'TODO' || i.status === 'IN_PROGRESS').length,
    today:
      data.summary.today +
      data.summary.overdue,
    inProgress: data.summary.inProgress,
    done: data.summary.done,
  };

  const showGrouped = focus === 'open';
  const grouped = showGrouped
    ? groupOpenTasks(
        data.filteredItems.filter((i) => i.status === 'TODO' || i.status === 'IN_PROGRESS'),
        now,
      )
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">Задачи</h1>

      <GlobalQuickTaskForm
        websites={data.websites}
        defaultWebsiteId={data.filters.websiteId || undefined}
      />

      <div className="flex flex-wrap gap-1 border-b border-ink-700 pb-px">
        {TABS.map((tab) => {
          const href = buildTasksQuery({ ...data.filters, focus: tab.focus, action: '' });
          const active = focus === tab.focus;
          return (
            <Link
              key={tab.focus}
              href={href}
              className={cn(
                'rounded-t-lg px-3 py-2 text-sm font-medium',
                active
                  ? 'border border-b-white border-ink-700 bg-white text-ink-50'
                  : 'text-ink-200 hover:text-ink-50',
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-ink-200">{counts[tab.countKey]}</span>
            </Link>
          );
        })}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-ink-200 hover:text-ink-50">Фильтры</summary>
        <div className="mt-3">
          <TaskFiltersBar
            filters={data.filters}
            websites={data.websites}
            groups={data.groups}
          />
        </div>
      </details>

      {showGrouped && grouped ? (
        <div className="space-y-6">
          <TaskGroup
            title="Сегодня"
            items={grouped.today}
            note={
              grouped.today.some((t) => t.dueBucket === 'overdue')
                ? '(включая просроченные)'
                : undefined
            }
          />
          <TaskGroup title="Ближайшие" items={grouped.upcoming} />
          <TaskGroup title="Без срока" items={grouped.noDue} />
          {grouped.today.length + grouped.upcoming.length + grouped.noDue.length === 0 ? (
            <p className="text-sm text-ink-200">Открытых задач нет.</p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {data.filteredItems.length === 0 ? (
            <p className="text-sm text-ink-200">Задачи не найдены.</p>
          ) : (
            data.filteredItems.map((item) => (
              <CompactTaskRow key={item.id} item={item} showWebsite />
            ))
          )}
        </ul>
      )}
    </div>
  );
}
