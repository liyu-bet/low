'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createTaskAction, type TaskActionState } from '@/app/(app)/tasks/actions';
import { TASK_PRIORITY_LABELS } from '@/lib/ui/labels';
import { TaskPriority } from '@prisma/client';

function AddButton({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        compact
          ? 'shrink-0 rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500'
          : 'shrink-0 rounded bg-moss-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss-600 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500'
      }
    >
      {pending ? '…' : 'Добавить'}
    </button>
  );
}

/**
 * Ultra-simple task create: title required; optional due + parameters.
 */
export function QuickWebsiteTaskForm({
  websiteId,
  compact = false,
  onCancel,
  autoFocus = false,
  assignees = [],
}: {
  websiteId: string;
  compact?: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
  assignees?: Array<{ id: string; name: string; email: string }>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(createTaskAction, {} as TaskActionState);
  const [showDue, setShowDue] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [flashOk, setFlashOk] = useState(false);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setShowDue(false);
    setAdvanced(false);
    setFlashOk(true);
    router.refresh();
    const timer = window.setTimeout(() => setFlashOk(false), 2500);
    return () => window.clearTimeout(timer);
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="websiteId" value={websiteId} />
      {!advanced ? <input type="hidden" name="priority" value={TaskPriority.MEDIUM} /> : null}

      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-stretch gap-2">
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={200}
          placeholder="Что нужно сделать?"
          className="min-w-0 flex-1 rounded border border-ink-700 bg-white px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
        />
        {!showDue ? (
          <button
            type="button"
            onClick={() => setShowDue(true)}
            aria-label="Указать дату"
            className="shrink-0 rounded border border-ink-700 px-2.5 py-2 text-sm text-ink-200 hover:border-moss-500 hover:text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
          >
            Дата
          </button>
        ) : (
          <input
            type="date"
            name="dueAt"
            className="shrink-0 rounded border border-ink-700 bg-white px-2 py-2 text-sm text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
          />
        )}
        <AddButton compact={compact} />
        <span className="flex min-w-[4.5rem] items-center text-sm text-moss-700" aria-live="polite">
          {flashOk ? 'Добавлено' : ''}
        </span>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:text-ink-50"
          >
            Отмена
          </button>
        ) : null}
      </div>

      {!compact ? (
        <div>
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="text-sm text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
          >
            {advanced ? 'Скрыть параметры' : 'Параметры'}
          </button>
          {advanced ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block text-sm text-ink-200 sm:col-span-2">
                Описание
                <textarea
                  name="description"
                  rows={2}
                  className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
                />
              </label>
              <label className="block text-sm text-ink-200">
                Приоритет
                <select
                  name="priority"
                  defaultValue={TaskPriority.MEDIUM}
                  className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {!showDue ? (
                <label className="block text-sm text-ink-200">
                  Срок
                  <input
                    type="date"
                    name="dueAt"
                    className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
                  />
                </label>
              ) : null}
              <label className="block text-sm text-ink-200 sm:col-span-2">
                Исполнитель
                <select
                  name="assignedToUserId"
                  defaultValue="__self__"
                  className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
                >
                  <option value="__self__">Я</option>
                  <option value="__none__">Не назначать</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
