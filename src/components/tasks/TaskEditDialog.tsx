'use client';

import { useEffect, useId, useRef, type MutableRefObject, type RefObject } from 'react';
import { useFormStatus } from 'react-dom';
import { dateOnlyToInputValue } from '@/lib/dates/date-only';
import type { TaskListItem } from '@/lib/tasks/types';
import { TASK_PRIORITY_LABELS } from '@/lib/ui/labels';

function DialogFooter({
  onCancel,
  cancelRef,
}: {
  onCancel: () => void;
  cancelRef: RefObject<HTMLButtonElement | null>;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex shrink-0 justify-end gap-2 border-t border-ink-800 px-4 py-3">
      <button
        ref={cancelRef}
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="btn-secondary"
      >
        Отмена
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="btn-primary"
      >
        <span className="inline-block min-w-[5.5rem] text-center">
          {pending ? '…' : 'Сохранить'}
        </span>
      </button>
    </div>
  );
}

function PendingEscapeGuard({
  onCancel,
  allowOutsideClose,
}: {
  onCancel: () => void;
  allowOutsideClose: MutableRefObject<boolean>;
}) {
  const { pending } = useFormStatus();
  useEffect(() => {
    allowOutsideClose.current = !pending;
  }, [pending, allowOutsideClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);

  return null;
}

export function TaskEditDialog({
  item,
  formAction,
  onCancel,
  error,
  returnFocusRef,
  users = [],
  showAssignee = true,
}: {
  item: TaskListItem;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
  error?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  users?: Array<{ id: string; name: string; email: string }>;
  showAssignee?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const allowOutsideClose = useRef(true);
  const titleId = useId();

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();

    function onPointer(event: MouseEvent) {
      if (!allowOutsideClose.current) return;
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      returnFocusRef?.current?.focus();
    };
  }, [onCancel, returnFocusRef]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-3 sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label="Редактировать задачу"
        className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-card border border-ink-700 bg-white shadow-card"
      >
        <div className="shrink-0 space-y-1 border-b border-ink-800 px-4 py-3">
          <h3 id={titleId} className="text-base font-semibold text-ink-50">
            Редактировать задачу
          </h3>
          <p className="text-sm text-ink-200">{item.website.domain}</p>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <PendingEscapeGuard onCancel={onCancel} allowOutsideClose={allowOutsideClose} />
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <label className="block text-sm text-ink-200">
              Название
              <input
                ref={titleRef}
                name="title"
                required
                maxLength={200}
                defaultValue={item.title}
                className="field-input mt-1"
              />
            </label>
            <label className="block text-sm text-ink-200">
              Описание
              <textarea
                name="description"
                rows={4}
                defaultValue={item.description ?? ''}
                className="field-input mt-1"
              />
            </label>
            <label className="block text-sm text-ink-200">
              Приоритет
              <select name="priority" defaultValue={item.priority} className="field-input mt-1">
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
                type="date"
                name="dueAt"
                defaultValue={dateOnlyToInputValue(item.dueAt)}
                className="field-input mt-1"
              />
            </label>
            {showAssignee && users.length > 0 ? (
              <label className="block text-sm text-ink-200">
                Исполнитель
                <select
                  name="assignedToUserId"
                  defaultValue={item.assignedToUserId ?? '__none__'}
                  className="field-input mt-1"
                >
                  <option value="__self__">Я</option>
                  <option value="__none__">Не назначена</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {item.createdByLabel ? (
              <p className="text-xs text-ink-200">Автор: {item.createdByLabel}</p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter onCancel={onCancel} cancelRef={cancelRef} />
        </form>
      </div>
    </div>
  );
}
