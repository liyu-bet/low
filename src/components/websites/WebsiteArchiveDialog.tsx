'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import { useFormStatus } from 'react-dom';

function ConfirmSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className="btn-danger">
      {pending ? pendingLabel : label}
    </button>
  );
}

export function WebsiteArchiveDialog({
  domain,
  formAction,
  onCancel,
  error,
  returnFocusRef,
}: {
  domain: string;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
  error?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    cancelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    function onPointer(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onCancel();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      returnFocusRef?.current?.focus();
    };
  }, [onCancel, returnFocusRef]);

  const title = 'Убрать сайт из LOW?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={title}
        className="w-full max-w-sm space-y-3 rounded-card border border-ink-700 bg-white p-4 shadow-card"
      >
        <h3 id={titleId} className="text-base font-semibold text-ink-50">
          {title}
        </h3>
        <p className="text-sm text-ink-200">
          «{domain}» будет перемещён в архив. Задачи и события сохранятся — сайт можно вернуть в
          любой момент.
        </p>
        <form action={formAction} className="flex justify-end gap-2 pt-1">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn-secondary">
            Отмена
          </button>
          <ConfirmSubmit label="Убрать из LOW" pendingLabel="Убираем…" />
        </form>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
