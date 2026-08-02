'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { completeTaskAction, type TaskActionState } from '@/app/(app)/tasks/actions';
import type { DashboardTaskItem } from '@/lib/tasks/types';
import { labelTaskPriority } from '@/lib/ui/labels';

function PendingButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-2.5 py-1.5 text-xs font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? '…' : 'Выполнить'}
    </button>
  );
}

function DashboardTaskRow({ item }: { item: DashboardTaskItem }) {
  const router = useRouter();
  const bound = completeTaskAction.bind(null, item.id, item.websiteId);
  const [state, action] = useActionState(bound, {} as TaskActionState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <li className="rounded border border-ink-700/70 bg-ink-950/40 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/websites/${item.websiteId}`} className="text-moss-400 hover:text-moss-300">
            {item.domain}
          </Link>
          <p className="mt-1 font-medium text-sand-100">{item.title}</p>
          <p className="mt-1 text-xs text-ink-200">
            {labelTaskPriority(item.priority)} ·{' '}
            <span className={item.dueBucket === 'overdue' ? 'text-red-200' : ''}>
              {item.dueRelative}
            </span>
          </p>
        </div>
        <form action={action} className="flex flex-col items-end gap-1">
          <input type="hidden" name="result" value="" />
          <PendingButton />
        </form>
      </div>
      {state.error ? <p className="mt-2 text-xs text-red-200">{state.error}</p> : null}
      {state.ok && state.message ? (
        <p className="mt-2 text-xs text-moss-400">{state.message}</p>
      ) : null}
    </li>
  );
}

export function DashboardUpcomingTasks({ items }: { items: DashboardTaskItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl text-sand-100">Ближайшие задачи</h2>
          <p className="mt-1 text-sm text-ink-200">Просроченные, сегодняшние и ближайшие (до 10).</p>
        </div>
        <Link href="/tasks" className="text-sm text-moss-400 hover:text-moss-300">
          Все задачи
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-200">Открытых задач с ближайшими сроками нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <DashboardTaskRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
