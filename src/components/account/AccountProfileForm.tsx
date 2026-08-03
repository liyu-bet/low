'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  updateProfileAction,
  type AccountActionState,
} from '@/app/(app)/account/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Сохранение…' : 'Сохранить имя'}
    </button>
  );
}

export function AccountProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [state, action] = useActionState(updateProfileAction, {} as AccountActionState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-3 rounded-card border border-ink-700 bg-white p-4">
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
      <label className="block text-sm text-ink-200">
        Имя
        <input
          name="name"
          required
          defaultValue={name}
          className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
        />
      </label>
      <Submit />
    </form>
  );
}
