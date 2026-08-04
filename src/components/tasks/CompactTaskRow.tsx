import { TaskCardActions } from '@/components/tasks/TaskCardActions';
import type { TaskListItem } from '@/lib/tasks/types';
import { assigneeDisplayLabel } from '@/lib/tasks/view';

/**
 * Dense row for website profile. Keeps complete / menu / edit dialog behaviour
 * aligned with /tasks without the full TaskCard chrome.
 */
export function CompactTaskRow({
  item,
  showWebsite = false,
  dense = false,
  canEdit = true,
  currentUserId,
  users = [],
}: {
  item: TaskListItem;
  showWebsite?: boolean;
  dense?: boolean;
  canEdit?: boolean;
  currentUserId?: string;
  users?: Array<{ id: string; name: string; email: string }>;
}) {
  const open = item.status === 'TODO' || item.status === 'IN_PROGRESS';
  const assignee = assigneeDisplayLabel(item, currentUserId);

  const metaBits: string[] = [];
  if (dense) {
    if (item.assignedToLabel || item.assignedToUserId) metaBits.push(assignee);
    if (item.dueAt) metaBits.push(item.dueRelative);
    if (item.status === 'IN_PROGRESS') metaBits.push('В работе');
  } else {
    if (item.dueAt) metaBits.push(item.dueRelative);
    if (item.status === 'IN_PROGRESS') metaBits.push('В работе');
    if (item.status === 'DONE' && item.completedByLabel) {
      metaBits.push(`Выполнил: ${item.completedByLabel}`);
    } else if (open) {
      metaBits.push(assignee);
    }
  }

  return (
    <li
      data-task-id={item.id}
      className="relative rounded-[10px] border border-ink-700 bg-white px-3 py-2.5 sm:px-4"
    >
      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          {showWebsite ? (
            <a
              href={`/websites/${item.websiteId}`}
              className="mb-0.5 block break-anywhere text-sm font-medium text-moss-700 hover:underline"
              aria-label={`Открыть профиль ${item.website.domain}`}
            >
              {item.website.domain}
            </a>
          ) : null}
          <p className="break-anywhere text-sm font-medium text-ink-50">{item.title}</p>
          {metaBits.length > 0 ? (
            <div className="mt-0.5 text-xs text-ink-200">
              {metaBits.map((bit, index) => (
                <span key={`${bit}-${index}`}>
                  {index > 0 ? <span className="mx-1.5 text-ink-700">·</span> : null}
                  <span
                    className={
                      bit === item.dueRelative && item.dueBucket === 'overdue' ? 'text-red-700' : ''
                    }
                  >
                    {bit}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {open ? <TaskCardActions item={item} canEdit={canEdit} users={users} /> : null}
      </div>
    </li>
  );
}
