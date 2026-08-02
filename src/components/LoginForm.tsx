'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { loginAction, type LoginState } from '@/app/login/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-moss-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? 'Вход…' : 'Войти'}
    </button>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(loginAction, {} as LoginState);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      {state.error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
      <label className="block space-y-1.5 text-sm text-ink-200">
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-ink-50 outline-none focus:border-moss-500"
        />
      </label>
      <label className="block space-y-1.5 text-sm text-ink-200">
        <span>Пароль</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-ink-50 outline-none focus:border-moss-500"
        />
      </label>
      <SubmitButton />
    </form>
  );
}
