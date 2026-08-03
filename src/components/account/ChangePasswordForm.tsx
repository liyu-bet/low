'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  changePasswordAction,
  type AccountActionState,
} from '@/app/(app)/account/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Сохранение…' : 'Сменить пароль'}
    </button>
  );
}

export function ChangePasswordForm({
  requireCurrent = true,
}: {
  requireCurrent?: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(changePasswordAction, {} as AccountActionState);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3 rounded-card border border-ink-700 bg-white p-4">
      <input type="hidden" name="requireCurrent" value={requireCurrent ? '1' : '0'} />
      {state.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {requireCurrent ? (
        <label className="block text-sm text-ink-200">
          Текущий пароль
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
          />
        </label>
      ) : null}
      <label className="block text-sm text-ink-200">
        Новый пароль
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
        />
      </label>
      <label className="block text-sm text-ink-200">
        Повтор нового пароля
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-ink-50"
        />
      </label>
      <Submit />
    </form>
  );
}
