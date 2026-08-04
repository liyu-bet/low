'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/app/login/actions';
import { assertAuthenticated, authorSnapshot } from '@/lib/auth/session';
import { DateOnlyError } from '@/lib/dates/date-only';
import { toSafeActionError } from '@/lib/errors/safe-action';
import {
  clearDateOverride,
  isWebsiteNotFoundError,
  setDateOverride,
} from '@/lib/dates/overrides';

export type DateOverrideFormState = {
  error?: string;
  ok?: boolean;
  field?: string;
};

function formDataToObject(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

function mapError(error: unknown): string {
  if (isWebsiteNotFoundError(error)) return 'Сайт не найден';
  if (error instanceof DateOnlyError) return error.message;
  return toSafeActionError(error, 'Не удалось сохранить корректировку даты');
}

export async function setDateOverrideAction(
  websiteId: string,
  _prev: DateOverrideFormState,
  formData: FormData,
): Promise<DateOverrideFormState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  const payload = formDataToObject(formData);
  try {
    await setDateOverride(websiteId, payload, {
      createdBy: authorSnapshot(session),
      createdByUserId: session.userId,
    });
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath('/websites');
    return { ok: true, field: payload.field };
  } catch (error) {
    return { error: mapError(error), field: payload.field };
  }
}

export async function clearDateOverrideAction(
  websiteId: string,
  _prev: DateOverrideFormState,
  formData: FormData,
): Promise<DateOverrideFormState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  const payload = formDataToObject(formData);
  try {
    await clearDateOverride(websiteId, payload, {
      createdBy: authorSnapshot(session),
      createdByUserId: session.userId,
    });
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath('/websites');
    return { ok: true, field: payload.field };
  } catch (error) {
    return { error: mapError(error), field: payload.field };
  }
}
