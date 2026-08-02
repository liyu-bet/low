import Link from 'next/link';
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';
import { TaskActions } from '@/components/tasks/TaskList';
import type { TaskListItem, WebsiteOption, WebsiteTasksBlockData } from '@/lib/tasks/types';
import { labelTaskPriority, labelTaskStatus } from '@/lib/ui/labels';

type GroupedTasks = WebsiteTasksBlockData & {
  overdue?: TaskListItem[];
  today?: TaskListItem[];
  upcoming?: TaskListItem[];
  noDue?: TaskListItem[];
};

function TaskGroup({
  title,
  tasks,
  empty,
  emphasize,
}: {
  title: string;
  tasks: TaskListItem[];
  empty: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className={`text-sm uppercase tracking-wide ${emphasize ? 'text-red-200' : 'text-ink-200'}`}>
        {title}
      </h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-ink-200">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded border border-ink-700/70 bg-ink-950/40 px-4 py-3"
            >
              <div>
                <p className="font-medium text-sand-100">{task.title}</p>
                <p className="mt-1 text-xs text-ink-200">
                  {labelTaskPriority(task.priority)} · {labelTaskStatus(task.status)} ·{' '}
                  <span className={task.dueBucket === 'overdue' ? 'text-red-200' : ''}>
                    {task.dueRelative}
                  </span>
                </p>
              </div>
              {task.description ? (
                <p className="mt-2 text-sm text-ink-100">{task.description}</p>
              ) : null}
              <div className="mt-3">
                <TaskActions item={task} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WebsiteTasksBlock({
  websiteId,
  domain,
  name,
  group,
  archived,
  data,
}: {
  websiteId: string;
  domain: string;
  name: string | null;
  group: string | null;
  archived: boolean;
  data: GroupedTasks;
}) {
  const websiteOption: WebsiteOption = { id: websiteId, domain, name, group };
  const hasGroups =
    data.overdue != null || data.today != null || data.upcoming != null || data.noDue != null;

  return (
    <section id="tasks" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-sand-100">Задачи</h2>
          <p className="mt-1 text-sm text-ink-200">Открытые планы и недавние выполненные работы.</p>
        </div>
        <Link
          href={`/tasks?websiteId=${websiteId}`}
          className="text-sm text-moss-400 hover:text-moss-300"
        >
          Все задачи сайта
        </Link>
      </div>

      {!archived ? (
        <TaskCreateForm
          websites={[websiteOption]}
          defaultWebsiteId={websiteId}
          openByDefault={false}
        />
      ) : (
        <p className="text-sm text-ink-200">Архивный сайт: новые задачи не создаются.</p>
      )}

      {hasGroups ? (
        <>
          <TaskGroup
            title="Просроченные"
            tasks={data.overdue ?? []}
            empty="Просроченных задач нет."
            emphasize
          />
          <TaskGroup title="На сегодня" tasks={data.today ?? []} empty="На сегодня задач нет." />
          <TaskGroup
            title="Ближайшие"
            tasks={data.upcoming ?? []}
            empty="Ближайших задач нет."
          />
          <TaskGroup title="Без срока" tasks={data.noDue ?? []} empty="Задач без срока нет." />
        </>
      ) : (
        <TaskGroup title="Открытые" tasks={data.openTasks} empty="Открытых задач нет." />
      )}

      <div className="space-y-3">
        <h3 className="text-sm uppercase tracking-wide text-ink-200">Последние выполненные</h3>
        {data.recentDone.length === 0 ? (
          <p className="text-sm text-ink-200">Выполненных задач пока нет.</p>
        ) : (
          <ul className="space-y-2 text-sm text-ink-200">
            {data.recentDone.map((task) => (
              <li key={task.id} className="rounded border border-ink-800/80 px-3 py-2">
                <span className="text-ink-100">{task.title}</span>
                {task.result ? ` — ${task.result}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
