'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  cancelTaskAction,
  completeTaskAction,
  startTaskAction,
  updateTaskAction,
  type TaskActionState,
} from '@/app/(app)/tasks/actions';
import { ActionMenu, preserveScroll } from '@/components/ui/ActionMenu';
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
      <span className="inline-block min-w-[4.5rem] text-center">{pending ? '…' : label}</span>
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
  dense?: boolean;
}) {
  const router = useRouter();
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
      preserveScroll(() => router.refresh());
    }
  }, [completeState, cancelState, startState, updateState, router]);

  const metaBits: string[] = [];
  if (dense) {
    if (item.assignedToLabel) metaBits.push(item.assignedToLabel);
    if (item.dueAt) metaBits.push(item.dueRelative);
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
    if (item.assignedToLabel && item.status !== 'DONE') {
      metaBits.push(item.assignedToLabel);
    } else if (item.status === 'DONE' && item.completedByLabel) {
      metaBits.push(`Выполнил: ${item.completedByLabel}`);
    } else {
      metaBits.push(`Создал: ${item.createdByLabel}`);
    }
  }

  return (
    <li className="rounded-[10px] border border-ink-700 bg-white px-3 py-2.5 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          {showWebsite ? (
            <a
              href={`/websites/${item.websiteId}`}
              className="mb-0.5 block break-anywhere text-sm font-medium text-moss-700 hover:underline"
            >
              {item.website.domain}
            </a>
          ) : null}
          <p className="break-anywhere text-sm font-medium text-ink-50">{item.title}</p>
          {metaBits.length > 0 ? (
            <p className="mt-0.5 text-xs text-ink-200">
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
            </p>
          ) : null}
        </div>
        {open ? (
          <div className="flex flex-wrap items-center gap-2">
            <form action={completeAction}>
              <PendingButton
                label="Выполнить"
                ariaLabel={`Выполнить задачу: ${item.title}`}
                className="btn-primary"
              />
            </form>
            <ActionMenu>
              {item.status === 'TODO' ? (
                <form action={startAction}>
                  <PendingButton
                    label="В работу"
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink-100 hover:bg-ink-900"
                  />
                </form>
              ) : null}
              <form action={cancelAction}>
                <PendingButton
                  label="Отменить"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
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
                    className="field-input"
                  />
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={item.description ?? ''}
                    className="field-input"
                  />
                  <select name="priority" defaultValue={item.priority} className="field-input">
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
                    className="field-input"
                  />
                  <PendingButton label="Сохранить" className="btn-primary w-full" />
                </form>
              </details>
            </ActionMenu>
          </div>
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
