'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { DateOverrideFormState } from '@/app/(app)/websites/[id]/dates/actions';
import { dateOnlyToInputValue } from '@/lib/dates/date-only';
import type { DateOverrideField } from '@/lib/dates/fields';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? 'Сохранение…' : label}
    </button>
  );
}

type Props = {
  field: DateOverrideField;
  currentManual: Date | null;
  setAction: (state: DateOverrideFormState, formData: FormData) => Promise<DateOverrideFormState>;
  clearAction: (state: DateOverrideFormState, formData: FormData) => Promise<DateOverrideFormState>;
  onDone: () => void;
};

export function DateOverrideForm({
  field,
  currentManual,
  setAction,
  clearAction,
  onDone,
}: Props) {
  const router = useRouter();
  const [setState, setFormAction] = useActionState(setAction, {});
  const [clearState, clearFormAction] = useActionState(clearAction, {});

  useEffect(() => {
    if (setState.ok || clearState.ok) {
      router.refresh();
      onDone();
    }
  }, [setState, clearState, router, onDone]);

  const error = setState.error || clearState.error;

  return (
    <div className="mt-3 space-y-3 rounded border border-ink-700/80 bg-ink-950/60 p-3">
      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form action={setFormAction} className="space-y-3">
        <input type="hidden" name="field" value={field} />
        <label className="block space-y-1.5 text-sm text-ink-200">
          <span>
            Новое значение даты <span className="text-moss-400">*</span>
          </span>
          <input
            type="date"
            name="date"
            required
            defaultValue={dateOnlyToInputValue(currentManual)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5 text-sm text-ink-200">
          <span>
            Причина изменения <span className="text-moss-400">*</span>
          </span>
          <textarea
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={2}
            placeholder="Почему меняете эту дату?"
            className={inputClass}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <SubmitButton label="Сохранить" />
          <button
            type="button"
            onClick={onDone}
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Отмена
          </button>
        </div>
      </form>

      {currentManual ? (
        <form action={clearFormAction} className="space-y-3 border-t border-ink-700/60 pt-3">
          <input type="hidden" name="field" value={field} />
          <label className="block space-y-1.5 text-sm text-ink-200">
            <span>
              Причина удаления корректировки <span className="text-moss-400">*</span>
            </span>
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={500}
              rows={2}
              placeholder="Почему убираете ручное значение?"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            className="rounded border border-red-500/40 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
          >
            Убрать ручную корректировку
          </button>
        </form>
      ) : null}
    </div>
  );
}

const inputClass =
  'w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-ink-50 outline-none focus:border-moss-500';
