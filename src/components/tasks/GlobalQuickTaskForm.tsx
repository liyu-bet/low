'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createTaskAction, type TaskActionState } from '@/app/(app)/tasks/actions';
import type { WebsiteOption } from '@/lib/tasks/types';
import { TaskPriority } from '@prisma/client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded bg-moss-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss-600 disabled:opacity-60"
    >
      {pending ? '…' : 'Добавить'}
    </button>
  );
}

export function GlobalQuickTaskForm({
  websites,
  defaultWebsiteId,
}: {
  websites: WebsiteOption[];
  defaultWebsiteId?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createTaskAction, {} as TaskActionState);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  if (websites.length === 0) {
    return (
      <p className="text-sm text-ink-200">Нет активных сайтов для новых задач.</p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="priority" value={TaskPriority.MEDIUM} />
      {state.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="rounded border border-moss-500/40 bg-moss-50 px-3 py-2 text-sm text-moss-700">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-stretch gap-2">
        <select
          name="websiteId"
          required
          defaultValue={defaultWebsiteId ?? ''}
          className="w-full rounded border border-ink-700 bg-white px-3 py-2.5 text-sm text-ink-50 sm:w-52"
        >
          <option value="" disabled>
            Сайт
          </option>
          {websites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.domain}
            </option>
          ))}
        </select>
        <input
          name="title"
          required
          maxLength={200}
          placeholder="Что нужно сделать?"
          className="min-w-0 flex-1 rounded border border-ink-700 bg-white px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-200"
        />
        <SubmitButton />
      </div>
    </form>
  );
}
