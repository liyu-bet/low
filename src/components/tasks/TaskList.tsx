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
import type { TaskListItem } from '@/lib/tasks/types';
import { dateOnlyToInputValue } from '@/lib/dates/date-only';
import { TASK_PRIORITY_LABELS, labelTaskPriority, labelTaskStatus } from '@/lib/ui/labels';
import Link from 'next/link';

function PendingButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function ActionMessage({ state }: { state: TaskActionState }) {
  if (state.error) {
    return <p className="mt-2 text-xs text-red-700">{state.error}</p>;
  }
  if (state.ok && state.message) {
    return <p className="mt-2 text-xs text-moss-600">{state.message}</p>;
  }
  return null;
}

export function TaskActions({ item }: { item: TaskListItem }) {
  const router = useRouter();
  const startBound = startTaskAction.bind(null, item.id, item.websiteId);
  const completeBound = completeTaskAction.bind(null, item.id, item.websiteId);
  const cancelBound = cancelTaskAction.bind(null, item.id, item.websiteId);
  const updateBound = updateTaskAction.bind(null, item.id, item.websiteId);

  const [startState, startAction] = useActionState(startBound, {} as TaskActionState);
  const [completeState, completeAction] = useActionState(completeBound, {} as TaskActionState);
  const [cancelState, cancelAction] = useActionState(cancelBound, {} as TaskActionState);
  const [updateState, updateAction] = useActionState(updateBound, {} as TaskActionState);

  useEffect(() => {
    if (startState.ok || completeState.ok || cancelState.ok || updateState.ok) {
      router.refresh();
    }
  }, [startState, completeState, cancelState, updateState, router]);

  const open = item.status === 'TODO' || item.status === 'IN_PROGRESS';

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {item.status === 'TODO' ? (
          <form action={startAction}>
            <PendingButton
              label="В работу"
              pendingLabel="…"
              className="rounded border border-ink-700 px-2.5 py-1.5 text-ink-100 hover:border-moss-500 disabled:opacity-60"
            />
          </form>
        ) : null}
        {open ? (
          <>
            <form action={completeAction} className="flex flex-wrap items-center gap-2">
              <input
                name="result"
                placeholder="Результат (необязательно)"
                className="min-w-[10rem] flex-1 rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
              />
              <PendingButton
                label="Выполнить"
                pendingLabel="…"
                className="rounded bg-moss-500 px-2.5 py-1.5 font-semibold text-white hover:bg-moss-600 disabled:opacity-60"
              />
            </form>
            <form action={cancelAction}>
              <PendingButton
                label="Отменить"
                pendingLabel="…"
                className="rounded border border-ink-700 px-2.5 py-1.5 text-ink-200 hover:border-red-500/50 disabled:opacity-60"
              />
            </form>
          </>
        ) : null}
      </div>
      <ActionMessage state={startState} />
      <ActionMessage state={completeState} />
      <ActionMessage state={cancelState} />

      {open ? (
        <details className="rounded border border-ink-800/80 bg-ink-950/30 p-3">
          <summary className="cursor-pointer text-ink-200">Редактировать</summary>
          <form action={updateAction} className="mt-3 space-y-2">
            <input
              name="title"
              required
              defaultValue={item.title}
              className="w-full rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
            />
            <textarea
              name="description"
              rows={2}
              defaultValue={item.description ?? ''}
              className="w-full rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                name="priority"
                defaultValue={item.priority}
                className="rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                name="dueAt"
                type="date"
                defaultValue={dateOnlyToInputValue(item.dueAt)}
                className="rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
              />
            </div>
            <PendingButton
              label="Сохранить"
              pendingLabel="…"
              className="rounded border border-ink-700 px-2.5 py-1.5 text-ink-100 hover:border-moss-500 disabled:opacity-60"
            />
            <ActionMessage state={updateState} />
          </form>
        </details>
      ) : (
        <p className="text-xs text-ink-200">
          {labelTaskStatus(item.status)}
          {item.result ? ` · ${item.result}` : ''}
        </p>
      )}
    </div>
  );
}

export function TaskList({ items }: { items: TaskListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-200">
        Нет задач по текущим фильтрам.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded border border-ink-700 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink-700 bg-ink-900 text-xs font-medium text-ink-200">
            <tr>
              <th className="px-3 py-3 font-medium">Задача</th>
              <th className="px-3 py-3 font-medium">Сайт</th>
              <th className="px-3 py-3 font-medium">Приоритет</th>
              <th className="px-3 py-3 font-medium">Статус</th>
              <th className="px-3 py-3 font-medium">Срок</th>
              <th className="px-3 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800/80">
            {items.map((item) => (
              <tr key={item.id} className="bg-ink-950/30 align-top">
                <td className="px-3 py-3">
                  <div className="font-medium text-sand-100">{item.title}</div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-200">{item.description}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/websites/${item.websiteId}`}
                    className="text-moss-600 hover:text-moss-600"
                  >
                    {item.website.domain}
                  </Link>
                </td>
                <td className="px-3 py-3 text-ink-100">{labelTaskPriority(item.priority)}</td>
                <td className="px-3 py-3 text-ink-100">{labelTaskStatus(item.status)}</td>
                <td className="px-3 py-3">
                  <div
                    className={
                      item.dueBucket === 'overdue' ? 'font-medium text-red-700' : 'text-ink-200'
                    }
                  >
                    {item.dueRelative}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <TaskActions item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded border border-ink-700 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium text-sand-100">{item.title}</h3>
              <span className="text-xs text-ink-200">{labelTaskPriority(item.priority)}</span>
            </div>
            <p className="mt-1 text-sm text-ink-200">
              <Link href={`/websites/${item.websiteId}`} className="text-moss-600">
                {item.website.domain}
              </Link>
              {' · '}
              {labelTaskStatus(item.status)}
            </p>
            <p
              className={`mt-2 text-sm ${item.dueBucket === 'overdue' ? 'text-red-700' : 'text-ink-200'}`}
            >
              {item.dueRelative}
            </p>
            {item.description ? (
              <p className="mt-2 text-sm text-ink-100">{item.description}</p>
            ) : null}
            <div className="mt-3">
              <TaskActions item={item} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
