'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createTaskAction, type TaskActionState } from '@/app/(app)/tasks/actions';
import { InlineNotice } from '@/components/ui/layout';
import { preserveScroll } from '@/components/ui/ActionMenu';
import type { WebsiteOption } from '@/lib/tasks/types';
import { TaskPriority } from '@prisma/client';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className="btn-primary shrink-0">
      <span className="inline-block min-w-[4.75rem] text-center">
        {pending ? '…' : 'Добавить'}
      </span>
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
  const titleRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(createTaskAction, {} as TaskActionState);
  const [flashOk, setFlashOk] = useState(false);
  const [websiteId, setWebsiteId] = useState(defaultWebsiteId ?? '');

  useEffect(() => {
    if (defaultWebsiteId) setWebsiteId(defaultWebsiteId);
  }, [defaultWebsiteId]);

  useEffect(() => {
    if (!state.ok) return;
    if (titleRef.current) titleRef.current.value = '';
    setFlashOk(true);
    preserveScroll(() => router.refresh());
    titleRef.current?.focus();
    const timer = window.setTimeout(() => setFlashOk(false), 2500);
    return () => window.clearTimeout(timer);
  }, [state, router]);

  if (websites.length === 0) {
    return <p className="text-sm text-ink-200">Нет активных сайтов для новых задач.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="priority" value={TaskPriority.MEDIUM} />
      {state.error ? (
        <p className="inline-notice-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          name="websiteId"
          required
          value={websiteId}
          onChange={(event) => setWebsiteId(event.target.value)}
          className="field-input min-w-0 sm:max-w-[14rem]"
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
          ref={titleRef}
          name="title"
          required
          maxLength={200}
          placeholder="Что нужно сделать?"
          className="field-input min-w-0 flex-1"
        />
        <div className="flex items-center gap-2">
          <SubmitButton />
          <span className="inline-flex min-w-[4.75rem] items-center" aria-live="polite">
            {flashOk ? <InlineNotice>Добавлено</InlineNotice> : null}
          </span>
        </div>
      </div>
    </form>
  );
}
