import Link from 'next/link';
import { TaskCardActions } from '@/components/tasks/TaskCardActions';
import type { TaskListItem } from '@/lib/tasks/types';
import { assigneeDisplayLabel, formatTaskCompletedWhen } from '@/lib/tasks/view';
import { cn } from '@/lib/ui/cn';

export function TaskCard({
  item,
  currentUserId,
  canEdit,
  users = [],
  mode = 'open',
  showWebsite = true,
  hideDueInMeta = false,
}: {
  item: TaskListItem;
  currentUserId?: string;
  canEdit: boolean;
  users?: Array<{ id: string; name: string; email: string }>;
  mode?: 'open' | 'done';
  showWebsite?: boolean;
  /** When the section already implies no due date. */
  hideDueInMeta?: boolean;
}) {
  if (mode === 'done') {
    return (
      <li
        data-task-id={item.id}
        className="rounded-[10px] border border-ink-700 bg-white px-3 py-2.5 sm:px-4"
      >
        <p className="break-anywhere text-sm font-medium text-ink-50">{item.title}</p>
        <p className="mt-0.5 text-xs text-ink-200">
          {showWebsite ? (
            <>
              <Link
                href={`/websites/${item.websiteId}`}
                className="text-moss-700 hover:underline"
                aria-label={`Открыть профиль ${item.website.domain}`}
              >
                {item.website.domain}
              </Link>
              <span className="mx-1.5 text-ink-700">·</span>
            </>
          ) : null}
          <span>{item.completedByLabel ?? '—'}</span>
          <span className="mx-1.5 text-ink-700">·</span>
          <span>{formatTaskCompletedWhen(item)}</span>
        </p>
      </li>
    );
  }

  const assignee = assigneeDisplayLabel(item, currentUserId);
  const showDue = Boolean(item.dueAt) && !hideDueInMeta;
  const meta: Array<{ text: string; overdue?: boolean }> = [];

  if (showWebsite) {
    meta.push({ text: item.website.domain });
  }
  meta.push({ text: assignee });
  if (showDue) {
    meta.push({
      text: item.dueRelative,
      overdue: item.dueBucket === 'overdue',
    });
  }
  if (item.status === 'IN_PROGRESS') {
    meta.push({ text: 'В работе' });
  }

  return (
    <li
      data-task-id={item.id}
      className="relative rounded-[10px] border border-ink-700 bg-white px-3 py-2.5 sm:px-4"
    >
      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-anywhere text-sm font-medium text-ink-50">{item.title}</p>
          <div className="mt-0.5 text-xs text-ink-200">
            {meta.map((bit, index) => (
              <span key={`${bit.text}-${index}`}>
                {index > 0 ? <span className="mx-1.5 text-ink-700">·</span> : null}
                {index === 0 && showWebsite ? (
                  <Link
                    href={`/websites/${item.websiteId}`}
                    className={cn(
                      'hover:underline',
                      bit.overdue ? 'text-red-700' : 'text-moss-700',
                    )}
                    aria-label={`Открыть профиль ${item.website.domain}`}
                  >
                    {bit.text}
                  </Link>
                ) : (
                  <span className={bit.overdue ? 'text-red-700' : undefined}>{bit.text}</span>
                )}
              </span>
            ))}
          </div>
        </div>
        <TaskCardActions item={item} canEdit={canEdit} users={users} />
      </div>
    </li>
  );
}
