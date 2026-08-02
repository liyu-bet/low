'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { EventFormState } from '@/app/(app)/websites/[id]/events/actions';
import { EVENT_CATEGORY_LABELS, MANUAL_EVENT_TYPES } from '@/lib/ui/labels';
import { EventCategory } from '@prisma/client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? 'Сохранение…' : 'Добавить событие'}
    </button>
  );
}

type Props = {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
};

export function EventForm({ action }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, {});
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded border border-ink-700/70 bg-ink-950/40 p-4">
      <div>
        <h3 className="font-display text-xl text-sand-100">Новое событие</h3>
        <p className="mt-1 text-sm text-ink-200">
          Журнал только на добавление. Автоматические события появятся позже из DSD/GSC.
        </p>
      </div>

      {state.error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded border border-moss-500/40 bg-moss-500/10 px-3 py-2 text-sm text-moss-400">
          Событие добавлено в журнал.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Тип" htmlFor="eventType" required>
          <select id="eventType" name="eventType" required defaultValue="note" className={inputClass}>
            {MANUAL_EVENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Категория" htmlFor="category">
          <select id="category" name="category" defaultValue="" className={inputClass}>
            <option value="">По типу события</option>
            {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((key) => (
              <option key={key} value={key}>
                {EVENT_CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Заголовок" htmlFor="title" required>
        <input id="title" name="title" required maxLength={200} className={inputClass} />
      </Field>

      <Field label="Описание" htmlFor="description">
        <textarea id="description" name="description" rows={3} className={inputClass} />
      </Field>

      <Field label="Дата события" htmlFor="occurredAt" required>
        <input
          id="occurredAt"
          name="occurredAt"
          type="date"
          required
          defaultValue={today}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Сумма" htmlFor="amount">
          <input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} />
        </Field>
        <Field label="Валюта" htmlFor="currency">
          <input id="currency" name="currency" placeholder="RUB" maxLength={3} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Количество" htmlFor="quantity">
          <input id="quantity" name="quantity" inputMode="decimal" className={inputClass} />
        </Field>
        <Field label="Единица" htmlFor="unit">
          <input id="unit" name="unit" placeholder="шт, час…" className={inputClass} />
        </Field>
      </div>

      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span className="text-sm text-ink-200">
        {label}
        {required ? <span className="text-moss-400"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-ink-50 outline-none focus:border-moss-500';
