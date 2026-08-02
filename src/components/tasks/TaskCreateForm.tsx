'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createTaskAction, type TaskActionState } from '@/app/(app)/tasks/actions';
import type { WebsiteOption } from '@/lib/tasks/types';
import { TASK_PRIORITY_LABELS } from '@/lib/ui/labels';
import { TaskPriority } from '@prisma/client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? 'Создание…' : 'Создать задачу'}
    </button>
  );
}

export function TaskCreateForm({
  websites,
  defaultWebsiteId,
  openByDefault = false,
}: {
  websites: WebsiteOption[];
  defaultWebsiteId?: string;
  openByDefault?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(createTaskAction, {} as TaskActionState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  if (websites.length === 0) {
    return (
      <p className="text-sm text-ink-200">
        Нет активных сайтов для новых задач. Архивные сайты не предлагаются.
      </p>
    );
  }

  return (
    <details
      open={openByDefault}
      className="rounded border border-ink-700/70 bg-ink-950/40 p-4"
    >
      <summary className="cursor-pointer font-display text-xl text-sand-100">
        Новая задача
      </summary>
      <form action={formAction} className="mt-4 space-y-3">
        {state.error ? (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p className="rounded border border-moss-500/40 bg-moss-500/10 px-3 py-2 text-sm text-moss-400">
            {state.message}
          </p>
        ) : null}
        <label className="block text-sm text-ink-200">
          Сайт
          <select
            name="websiteId"
            required
            defaultValue={defaultWebsiteId ?? ''}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          >
            <option value="" disabled>
              Выберите сайт
            </option>
            {websites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain}
                {site.name ? ` — ${site.name}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink-200">
          Название
          <input
            name="title"
            required
            maxLength={200}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
        </label>
        <label className="block text-sm text-ink-200">
          Описание
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-ink-200">
            Приоритет
            <select
              name="priority"
              defaultValue={TaskPriority.MEDIUM}
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ink-200">
            Срок
            <input
              name="dueAt"
              type="date"
              className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
            />
          </label>
        </div>
        <SubmitButton />
      </form>
    </details>
  );
}
