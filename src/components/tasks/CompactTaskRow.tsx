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
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? '…' : label}
    </button>
  );
}

export function CompactTaskRow({
  item,
  showWebsite = false,
}: {
  item: TaskListItem;
  showWebsite?: boolean;
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
          <p className="mt-0.5 text-xs text-ink-200">
            <span className={item.dueBucket === 'overdue' ? 'text-red-700' : ''}>
              {item.dueRelative}
            </span>
            <span className="mx-1.5 text-ink-700">·</span>
            {labelTaskStatus(item.status)}
            <span className="mx-1.5 text-ink-700">·</span>
            Создал: {item.createdByLabel}
            {item.status === 'DONE' && item.completedByLabel ? (
              <>
                <span className="mx-1.5 text-ink-700">·</span>
                Выполнил: {item.completedByLabel}
              </>
            ) : null}
            {item.assignedToLabel && item.status !== 'DONE' ? (
              <>
                <span className="mx-1.5 text-ink-700">·</span>
                Исполнитель: {item.assignedToLabel}
              </>
            ) : null}
          </p>
        </div>
        {open ? (
          <form action={completeAction}>
            <PendingButton
              label="Выполнить"
              className="rounded bg-moss-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-moss-600 disabled:opacity-60"
            />
          </form>
        ) : null}
        {open ? (
          <details
            className="relative"
            open={menuOpen}
            onToggle={(e) => setMenuOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer list-none rounded border border-ink-700 px-2 py-1 text-ink-200 marker:content-none [&::-webkit-details-marker]:hidden">
              ⋯
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
