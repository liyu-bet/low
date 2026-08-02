'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { LifecycleStage, Website, WebsiteStatus } from '@prisma/client';
import type { WebsiteFormState } from '@/app/(app)/websites/actions';
import { LIFECYCLE_STAGE_LABELS, WEBSITE_STATUS_LABELS } from '@/lib/ui/labels';

const STATUSES = Object.keys(WEBSITE_STATUS_LABELS) as WebsiteStatus[];
const STAGES = Object.keys(LIFECYCLE_STAGE_LABELS) as LifecycleStage[];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? 'Сохранение…' : label}
    </button>
  );
}

type Props = {
  action: (state: WebsiteFormState, formData: FormData) => Promise<WebsiteFormState>;
  website?: Website;
  submitLabel: string;
};

export function WebsiteForm({ action, website, submitLabel }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const launchedAtValue = website?.launchedAt
    ? website.launchedAt.toISOString().slice(0, 10)
    : '';

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-5">
      {state.error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      <Field label="Домен" htmlFor="domain" required>
        <input
          id="domain"
          name="domain"
          required
          defaultValue={website?.domain ?? ''}
          placeholder="example.com"
          className={inputClass}
        />
      </Field>

      <Field label="Название" htmlFor="name">
        <input id="name" name="name" defaultValue={website?.name ?? ''} className={inputClass} />
      </Field>

      <Field label="Основной URL" htmlFor="primaryUrl">
        <input
          id="primaryUrl"
          name="primaryUrl"
          defaultValue={website?.primaryUrl ?? ''}
          placeholder="https://example.com"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Статус" htmlFor="status">
          <select
            id="status"
            name="status"
            defaultValue={website?.status ?? 'DRAFT'}
            className={inputClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {WEBSITE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Этап жизненного цикла" htmlFor="lifecycleStage">
          <select
            id="lifecycleStage"
            name="lifecycleStage"
            defaultValue={website?.lifecycleStage ?? 'IDEA'}
            className={inputClass}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {LIFECYCLE_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Группа" htmlFor="group">
        <input id="group" name="group" defaultValue={website?.group ?? ''} className={inputClass} />
      </Field>

      <Field label="Теги (через запятую)" htmlFor="tags">
        <input
          id="tags"
          name="tags"
          defaultValue={website?.tags?.join(', ') ?? ''}
          className={inputClass}
        />
      </Field>

      <Field label="Дата запуска" htmlFor="launchedAt">
        <input
          id="launchedAt"
          name="launchedAt"
          type="date"
          defaultValue={launchedAtValue}
          className={inputClass}
        />
      </Field>

      <div className="pt-2">
        <SubmitButton label={submitLabel} />
      </div>
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
