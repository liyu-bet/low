import Link from 'next/link';
import { CompactTaskRow } from '@/components/tasks/CompactTaskRow';
import { QuickWebsiteTaskForm } from '@/components/tasks/QuickWebsiteTaskForm';
import { Section, SectionHeader } from '@/components/ui/layout';
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
    <Section id="tasks">
      <SectionHeader
        title="Задачи"
        action={
          <Link
            href={`/tasks?websiteId=${websiteId}`}
            className="text-sm text-moss-700 hover:underline"
          >
            Все
          </Link>
        }
      />

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
            <CompactTaskRow key={task.id} item={task} dense />
          ))}
        </ul>
      )}

      {hasMore ? (
        <Link
          href={`/tasks?websiteId=${websiteId}&focus=open`}
          className="inline-block text-sm text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline"
        >
          Ещё открытые ({openTasks.length - MAX_VISIBLE})
        </Link>
      ) : null}
    </Section>
  );
}
