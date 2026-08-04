'use server';

import { revalidatePath } from 'next/cache';
import { requireUserSession } from '@/app/login/actions';
import { authorSnapshot } from '@/lib/auth/session';
import { toSafeActionError } from '@/lib/errors/safe-action';
import { createManualWebsiteEvent, isWebsiteNotFoundError } from '@/lib/events/service';

export type EventFormState = {
  error?: string;
  ok?: boolean;
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
  return toSafeActionError(error, 'Не удалось сохранить событие');
}

export async function createManualEventAction(
  websiteId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await requireUserSession();
  try {
    await createManualWebsiteEvent(websiteId, formDataToObject(formData), {
      createdBy: authorSnapshot(session),
      createdByUserId: session.userId,
    });
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath('/websites');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}
