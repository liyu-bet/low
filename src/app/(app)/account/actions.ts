'use server';

import { revalidatePath } from 'next/cache';
import {
  refreshSessionCookie,
  requireUserSession,
} from '@/app/login/actions';
import { changeUserPassword, updateUserProfile } from '@/lib/auth/users';

export type AccountActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
};

export async function updateProfileAction(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requireUserSession();
  try {
    await updateUserProfile(session.userId, {
      name: String(formData.get('name') ?? ''),
    });
    revalidatePath('/account');
    return { ok: true, message: 'Имя обновлено' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Не удалось сохранить' };
  }
}

export async function changePasswordAction(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await requireUserSession({ allowMustChangePassword: true });
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const requireCurrent = String(formData.get('requireCurrent') ?? '1') !== '0';
  const currentPassword = String(formData.get('currentPassword') ?? '');

  if (newPassword !== confirmPassword) {
    return { error: 'Пароли не совпадают' };
  }

  try {
    const updated = await changeUserPassword(session.userId, {
      currentPassword: requireCurrent ? currentPassword : undefined,
      newPassword,
      requireCurrent: session.mustChangePassword ? false : requireCurrent,
    });
    await refreshSessionCookie(updated);
    revalidatePath('/account');
    return { ok: true, message: 'Пароль изменён', redirectTo: '/websites' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Не удалось сменить пароль' };
  }
}
