'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/app/login/actions';
import {
  adminResetPassword,
  createUser,
  updateUserAdminFields,
} from '@/lib/auth/users';
import { toSafeActionError } from '@/lib/errors/safe-action';
import type { UserRole } from '@prisma/client';

export type UsersActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

function mapError(error: unknown): string {
  return toSafeActionError(error, 'Не удалось сохранить изменения');
}

export async function createUserAction(
  _prev: UsersActionState,
  formData: FormData,
): Promise<UsersActionState> {
  await requireAdminSession();
  try {
    await createUser({
      email: String(formData.get('email') ?? ''),
      name: String(formData.get('name') ?? ''),
      role: String(formData.get('role') ?? 'MEMBER') as UserRole,
      temporaryPassword: String(formData.get('temporaryPassword') ?? ''),
    });
    revalidatePath('/settings/users');
    return { ok: true, message: 'Пользователь создан' };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function updateUserAction(
  userId: string,
  _prev: UsersActionState,
  formData: FormData,
): Promise<UsersActionState> {
  const session = await requireAdminSession();
  try {
    const isActiveRaw = formData.get('isActive');
    const roleRaw = String(formData.get('role') ?? '');
    await updateUserAdminFields(
      userId,
      {
        name: String(formData.get('name') ?? ''),
        role: roleRaw === 'ADMIN' || roleRaw === 'MEMBER' ? roleRaw : undefined,
        isActive: isActiveRaw == null ? undefined : String(isActiveRaw) === '1',
      },
      session.userId,
    );
    revalidatePath('/settings/users');
    return { ok: true, message: 'Сохранено' };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function resetUserPasswordAction(
  userId: string,
  _prev: UsersActionState,
  formData: FormData,
): Promise<UsersActionState> {
  await requireAdminSession();
  try {
    await adminResetPassword(userId, String(formData.get('temporaryPassword') ?? ''));
    revalidatePath('/settings/users');
    return { ok: true, message: 'Пароль сброшен' };
  } catch (error) {
    return { error: mapError(error) };
  }
}
