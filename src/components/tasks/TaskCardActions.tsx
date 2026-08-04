'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
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
import { TaskEditDialog } from '@/components/tasks/TaskEditDialog';
import type { TaskListItem } from '@/lib/tasks/types';
import { cn } from '@/lib/ui/cn';

function CompleteButton({ title, compactLabel }: { title: string; compactLabel?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={`Выполнить задачу: ${title}`}
      title="Выполнить"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] border border-moss-600 bg-moss-500 text-white hover:bg-moss-600 disabled:opacity-60',
        'h-10 w-10 sm:h-9 sm:w-9',
        compactLabel ? 'gap-1 px-2 sm:w-auto sm:px-2.5' : '',
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
        <path
          d="M3.5 8.2 6.4 11l6.1-6.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compactLabel ? (
        <span className="text-xs font-medium sm:sr-only" aria-hidden="true">
          Готово
        </span>
      ) : null}
    </button>
  );
}

function MenuPendingButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? '…' : label}
    </button>
  );
}

export function TaskCardActions({
  item,
  canEdit,
  users = [],
  showMobileCompleteLabel = false,
}: {
  item: TaskListItem;
  canEdit: boolean;
  users?: Array<{ id: string; name: string; email: string }>;
  showMobileCompleteLabel?: boolean;
}) {
  const router = useRouter();
  const menuTriggerWrapRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);

  const completeBound = completeTaskAction.bind(null, item.id, item.websiteId);
  const cancelBound = cancelTaskAction.bind(null, item.id, item.websiteId);
  const startBound = startTaskAction.bind(null, item.id, item.websiteId);
  const updateBound = updateTaskAction.bind(null, item.id, item.websiteId);

  const [completeState, completeAction] = useActionState(completeBound, {} as TaskActionState);
  const [cancelState, cancelAction] = useActionState(cancelBound, {} as TaskActionState);
  const [startState, startAction] = useActionState(startBound, {} as TaskActionState);
  const [updateState, updateAction] = useActionState(updateBound, {} as TaskActionState);

  useEffect(() => {
    if (completeState.ok || cancelState.ok || startState.ok) {
      preserveScroll(() => router.refresh());
    }
  }, [completeState, cancelState, startState, router]);

  useEffect(() => {
    if (updateState.ok) {
      setEditOpen(false);
      preserveScroll(() => router.refresh());
    }
  }, [updateState, router]);

  const open = item.status === 'TODO' || item.status === 'IN_PROGRESS';
  if (!open) return null;

  const error =
    completeState.error || cancelState.error || startState.error || updateState.error;

  const returnFocusRef = {
    get current() {
      return menuTriggerWrapRef.current?.querySelector('button') ?? null;
    },
  } as RefObject<HTMLElement | null>;

  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <form action={completeAction}>
        <CompleteButton title={item.title} compactLabel={showMobileCompleteLabel} />
      </form>

      <div ref={menuTriggerWrapRef}>
        <ActionMenu label="Дополнительные действия">
          {item.status === 'TODO' ? (
            <form action={startAction}>
              <MenuPendingButton
                label="В работу"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink-100 hover:bg-ink-900"
              />
            </form>
          ) : null}
          <button
            type="button"
            data-close-menu
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink-100 hover:bg-ink-900"
            onClick={() => setEditOpen(true)}
          >
            Редактировать
          </button>
          <form action={cancelAction}>
            <MenuPendingButton
              label="Отменить"
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
            />
          </form>
        </ActionMenu>
      </div>

      {editOpen ? (
        <TaskEditDialog
          item={item}
          formAction={updateAction}
          onCancel={() => setEditOpen(false)}
          error={updateState.error}
          returnFocusRef={returnFocusRef}
          users={users}
        />
      ) : null}

      {error && !editOpen ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
      {error && !editOpen ? (
        <p className="absolute left-3 right-3 top-full mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
