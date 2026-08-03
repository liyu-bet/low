import Link from 'next/link';
import { CompactTaskRow } from '@/components/tasks/CompactTaskRow';
import { QuickWebsiteTaskForm } from '@/components/tasks/QuickWebsiteTaskForm';
import type { TaskListItem } from '@/lib/tasks/types';

const MAX_VISIBLE = 5;

export function WebsiteNextTasks({
  websiteId,
  archived,
  openTasks,
  assignees = [],
}: {
  websiteId: string;
  archived: boolean;
  openTasks: TaskListItem[];
  assignees?: Array<{ id: string; name: string; email: string }>;
}) {
  const visible = openTasks.slice(0, MAX_VISIBLE);
  const hasMore = openTasks.length > MAX_VISIBLE;

  return (
    <section id="tasks" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">Следующие задачи</h2>
        <Link
          href={`/tasks?websiteId=${websiteId}`}
          className="text-sm text-moss-700 hover:underline"
        >
          Все задачи сайта
        </Link>
      </div>

      {!archived ? (
        <QuickWebsiteTaskForm websiteId={websiteId} assignees={assignees} />
      ) : (
        <p className="text-sm text-ink-200">Архивный сайт: новые задачи не создаются.</p>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-ink-200">Открытых задач нет.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <CompactTaskRow key={task.id} item={task} />
          ))}
        </ul>
      )}

      {hasMore ? (
        <Link
          href={`/tasks?websiteId=${websiteId}&focus=open`}
          className="inline-block text-sm text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline"
        >
          Все задачи сайта ({openTasks.length})
        </Link>
      ) : null}
    </section>
  );
}
