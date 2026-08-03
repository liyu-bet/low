'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  createUserAction,
  resetUserPasswordAction,
  updateUserAction,
  type UsersActionState,
} from '@/app/(app)/settings/users/actions';
import type { PublicUser } from '@/lib/auth/users';
import { formatDateTimeRu } from '@/lib/ui/labels';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !py-1.5 !text-sm">
      {pending ? '…' : label}
    </button>
  );
}

function Message({ state }: { state: UsersActionState }) {
  if (state.error) {
    return <p className="text-sm text-red-700">{state.error}</p>;
  }
  if (state.ok && state.message) {
    return <p className="text-sm text-moss-700">{state.message}</p>;
  }
  return null;
}

function UserRow({
  user,
  currentUserId,
}: {
  user: PublicUser;
  currentUserId: string;
}) {
  const router = useRouter();
  const updateBound = updateUserAction.bind(null, user.id);
  const resetBound = resetUserPasswordAction.bind(null, user.id);
  const [updateState, updateAction] = useActionState(updateBound, {} as UsersActionState);
  const [resetState, resetAction] = useActionState(resetBound, {} as UsersActionState);

  useEffect(() => {
    if (updateState.ok || resetState.ok) router.refresh();
  }, [updateState, resetState, router]);

  return (
    <li className="space-y-3 rounded-card border border-ink-700 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium text-ink-50">{user.name}</p>
          <p className="text-sm text-ink-200">{user.email}</p>
        </div>
        <p className="text-xs text-ink-200">
          {user.isActive ? 'Активен' : 'Отключён'}
          {user.lastLoginAt ? ` · вход ${formatDateTimeRu(user.lastLoginAt)}` : ''}
        </p>
      </div>

      <form action={updateAction} className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <label className="text-sm text-ink-200 sm:col-span-2">
          Имя
          <input
            name="name"
            required
            defaultValue={user.name}
            className="mt-1 w-full rounded border border-ink-700 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-ink-200">
          Роль
          <select
            name="role"
            defaultValue={user.role}
            className="mt-1 w-full rounded border border-ink-700 px-2 py-1.5 text-sm"
          >
            <option value="MEMBER">Участник</option>
            <option value="ADMIN">Администратор</option>
          </select>
        </label>
        <label className="text-sm text-ink-200">
          Статус
          <select
            name="isActive"
            defaultValue={user.isActive ? '1' : '0'}
            disabled={user.id === currentUserId}
            className="mt-1 w-full rounded border border-ink-700 px-2 py-1.5 text-sm disabled:opacity-60"
          >
            <option value="1">Активен</option>
            <option value="0">Отключён</option>
          </select>
        </label>
        <div className="sm:col-span-4">
          <Submit label="Сохранить" />
          <Message state={updateState} />
        </div>
      </form>

      <details className="text-sm">
        <summary className="cursor-pointer text-ink-200">Сбросить пароль</summary>
        <form action={resetAction} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-ink-200">
            Временный пароль
            <input
              type="password"
              name="temporaryPassword"
              required
              minLength={8}
              className="mt-1 block rounded border border-ink-700 px-2 py-1.5"
            />
          </label>
          <Submit label="Сбросить" />
          <Message state={resetState} />
        </form>
      </details>

      <p className="text-xs text-ink-200">Создан: {formatDateTimeRu(user.createdAt)}</p>
    </li>
  );
}

export function UsersAdminPanel({
  users,
  currentUserId,
}: {
  users: PublicUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [createState, createAction] = useActionState(createUserAction, {} as UsersActionState);

  useEffect(() => {
    if (createState.ok) router.refresh();
  }, [createState, router]);

  return (
    <div className="space-y-6">
      <form action={createAction} className="space-y-3 rounded-card border border-ink-700 bg-white p-4">
        <h2 className="text-lg font-semibold text-ink-50">Новый пользователь</h2>
        <Message state={createState} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink-200">
            Имя
            <input name="name" required className="mt-1 w-full rounded border border-ink-700 px-3 py-2" />
          </label>
          <label className="text-sm text-ink-200">
            Email
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded border border-ink-700 px-3 py-2"
            />
          </label>
          <label className="text-sm text-ink-200">
            Роль
            <select name="role" defaultValue="MEMBER" className="mt-1 w-full rounded border border-ink-700 px-3 py-2">
              <option value="MEMBER">Участник</option>
              <option value="ADMIN">Администратор</option>
            </select>
          </label>
          <label className="text-sm text-ink-200">
            Временный пароль
            <input
              type="password"
              name="temporaryPassword"
              required
              minLength={8}
              className="mt-1 w-full rounded border border-ink-700 px-3 py-2"
            />
          </label>
        </div>
        <Submit label="Создать" />
      </form>

      <ul className="space-y-3">
        {users.map((user) => (
          <UserRow key={user.id} user={user} currentUserId={currentUserId} />
        ))}
      </ul>
    </div>
  );
}
