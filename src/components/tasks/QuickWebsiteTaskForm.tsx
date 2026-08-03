'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createTaskAction, type TaskActionState } from '@/app/(app)/tasks/actions';
import { InlineNotice } from '@/components/ui/layout';
import { preserveScroll } from '@/components/ui/ActionMenu';
import { TASK_PRIORITY_LABELS } from '@/lib/ui/labels';
import { TaskPriority } from '@prisma/client';
import { cn } from '@/lib/ui/cn';

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary shrink-0">
      <span className="inline-block min-w-[4.75rem] text-center">
        {pending ? '…' : 'Добавить'}
      </span>
    </button>
  );
}

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
  const lastOkRef = useRef(0);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!state.ok) return;
    // Avoid re-triggering for the same successful state object identity churn
    const stamp = Date.now();
    if (stamp - lastOkRef.current < 300) return;
    lastOkRef.current = stamp;

    formRef.current?.reset();
    setShowDue(false);
    setAdvanced(false);
    setFlashOk(true);
    preserveScroll(() => router.refresh());
    titleRef.current?.focus();
    const timer = window.setTimeout(() => setFlashOk(false), 2500);
    return () => window.clearTimeout(timer);
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="websiteId" value={websiteId} />
      {!advanced ? <input type="hidden" name="priority" value={TaskPriority.MEDIUM} /> : null}

      {state.error ? (
        <p className="inline-notice-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={200}
          placeholder="Что нужно сделать?"
          className="field-input min-w-0 flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          {!showDue ? (
            <button
              type="button"
              onClick={() => setShowDue(true)}
              aria-label="Указать дату"
              className="btn-secondary shrink-0"
            >
              Дата
            </button>
          ) : (
            <input type="date" name="dueAt" className="field-input w-auto shrink-0" />
          )}
          <AddButton />
          <span className="inline-flex min-w-[4.75rem] items-center">
            {flashOk ? <InlineNotice>Добавлено</InlineNotice> : null}
          </span>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="btn-ghost">
              Отмена
            </button>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div>
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="text-sm text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline"
          >
            {advanced ? 'Скрыть параметры' : 'Параметры'}
          </button>
          {advanced ? (
            <div className={cn('mt-2 grid gap-2 sm:grid-cols-2')}>
              <label className="block text-sm text-ink-200 sm:col-span-2">
                Описание
                <textarea name="description" rows={2} className="field-input mt-1" />
              </label>
              <label className="block text-sm text-ink-200">
                Приоритет
                <select
                  name="priority"
                  defaultValue={TaskPriority.MEDIUM}
                  className="field-input mt-1"
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
                  <input type="date" name="dueAt" className="field-input mt-1" />
                </label>
              ) : null}
              <label className="block text-sm text-ink-200 sm:col-span-2">
                Исполнитель
                <select
                  name="assignedToUserId"
                  defaultValue="__self__"
                  className="field-input mt-1"
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
