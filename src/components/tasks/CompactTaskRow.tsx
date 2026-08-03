'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  cancelTaskAction,
  completeTaskAction,
  startTaskAction,
  updateTaskAction,
  type TaskActionState,
} from '@/app/(app)/tasks/actions';
import { dateOnlyToInputValue } from '@/lib/dates/date-only';
import type { TaskListItem } from '@/lib/tasks/types';
import { TASK_PRIORITY_LABELS, labelTaskStatus } from '@/lib/ui/labels';

function PendingButton({
  label,
  className,
  ariaLabel,
}: {
  label: string;
  className?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-label={ariaLabel ?? label}>
      {pending ? '…' : label}
    </button>
  );
}

export function CompactTaskRow({
  item,
  showWebsite = false,
  dense = false,
}: {
  item: TaskListItem;
  showWebsite?: boolean;
  /** Profile-style: title, assignee, due, in-progress — not full meta dump. */
  dense?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const completeBound = completeTaskAction.bind(null, item.id, item.websiteId);
  const cancelBound = cancelTaskAction.bind(null, item.id, item.websiteId);
  const startBound = startTaskAction.bind(null, item.id, item.websiteId);
  const updateBound = updateTaskAction.bind(null, item.id, item.websiteId);

  const [completeState, completeAction] = useActionState(completeBound, {} as TaskActionState);
  const [cancelState, cancelAction] = useActionState(cancelBound, {} as TaskActionState);
  const [startState, startAction] = useActionState(startBound, {} as TaskActionState);
  const [updateState, updateAction] = useActionState(updateBound, {} as TaskActionState);

  const open = item.status === 'TODO' || item.status === 'IN_PROGRESS';

  useEffect(() => {
    if (completeState.ok || cancelState.ok || startState.ok || updateState.ok) {
      setMenuOpen(false);
      router.refresh();
    }
  }, [completeState, cancelState, startState, updateState, router]);

  const metaBits: string[] = [];
  if (dense) {
    if (item.assignedToLabel) metaBits.push(item.assignedToLabel);
    if (item.dueAt) {
      metaBits.push(item.dueRelative);
    }
    if (item.status === 'IN_PROGRESS') metaBits.push('В работе');
    if (
      item.createdByLabel &&
      item.assignedToLabel &&
      item.createdByLabel !== item.assignedToLabel
    ) {
      metaBits.push(`Создал: ${item.createdByLabel}`);
    }
  } else {
    metaBits.push(item.dueRelative);
    metaBits.push(labelTaskStatus(item.status));
    metaBits.push(`Создал: ${item.createdByLabel}`);
    if (item.status === 'DONE' && item.completedByLabel) {
      metaBits.push(`Выполнил: ${item.completedByLabel}`);
    }
    if (item.assignedToLabel && item.status !== 'DONE') {
      metaBits.push(`Исполнитель: ${item.assignedToLabel}`);
    }
  }

  return (
    <li className="rounded border border-ink-700 bg-white px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {showWebsite ? (
          <a
            href={`/websites/${item.websiteId}`}
            className="shrink-0 text-sm font-medium text-moss-700 hover:underline"
          >
            {item.website.domain}
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-50">{item.title}</p>
          {metaBits.length > 0 ? (
            <p className="mt-0.5 text-xs text-ink-200">
              {metaBits.map((bit, index) => (
                <span key={`${bit}-${index}`}>
                  {index > 0 ? <span className="mx-1.5 text-ink-700">·</span> : null}
                  <span className={bit === item.dueRelative && item.dueBucket === 'overdue' ? 'text-red-700' : ''}>
                    {bit}
                  </span>
                </span>
              ))}
            </p>
          ) : null}
        </div>
        {open ? (
          <form action={completeAction}>
            <PendingButton
              label="Выполнить"
              ariaLabel={`Выполнить задачу: ${item.title}`}
              className="rounded bg-moss-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-moss-600 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
            />
          </form>
        ) : null}
        {open ? (
          <details
            className="relative"
            open={menuOpen}
            onToggle={(e) => setMenuOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary
              aria-label="Дополнительные действия"
              className="cursor-pointer list-none rounded border border-ink-700 px-2 py-1 text-ink-200 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500 [&::-webkit-details-marker]:hidden"
            >
              •••
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-56 space-y-2 rounded-lg border border-ink-700 bg-white p-2 shadow-card">
              {item.status === 'TODO' ? (
                <form action={startAction}>
                  <PendingButton
                    label="В работу"
                    className="w-full rounded px-2 py-1.5 text-left text-sm text-ink-100 hover:bg-ink-900"
                  />
                </form>
              ) : null}
              <form action={cancelAction}>
                <PendingButton
                  label="Отменить"
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
                />
              </form>
              <details>
                <summary className="cursor-pointer px-2 py-1.5 text-sm text-ink-200">
                  Редактировать
                </summary>
                <form action={updateAction} className="mt-2 space-y-2 border-t border-ink-800 pt-2">
                  <input
                    name="title"
                    required
                    defaultValue={item.title}
                    className="w-full rounded border border-ink-700 px-2 py-1.5 text-sm"
                  />
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={item.description ?? ''}
                    className="w-full rounded border border-ink-700 px-2 py-1.5 text-sm"
                  />
                  <select
                    name="priority"
                    defaultValue={item.priority}
                    className="w-full rounded border border-ink-700 px-2 py-1.5 text-sm"
                  >
                    {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    name="dueAt"
                    defaultValue={dateOnlyToInputValue(item.dueAt)}
                    className="w-full rounded border border-ink-700 px-2 py-1.5 text-sm"
                  />
                  <PendingButton
                    label="Сохранить"
                    className="w-full rounded bg-moss-500 px-2 py-1.5 text-sm font-semibold text-white"
                  />
                </form>
              </details>
            </div>
          </details>
        ) : null}
      </div>
      {completeState.error || cancelState.error || startState.error || updateState.error ? (
        <p className="mt-2 text-xs text-red-700">
          {completeState.error || cancelState.error || startState.error || updateState.error}
        </p>
      ) : null}
    </li>
  );
}
