'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireAdminSession } from '@/app/login/actions';
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
  if (error instanceof ZodError) {
    return error.errors.map((issue) => issue.message).join('; ');
  }
  if (error instanceof Error) return error.message;
  return 'Не удалось сохранить событие';
}

export async function createManualEventAction(
  websiteId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await requireAdminSession();
  try {
    await createManualWebsiteEvent(websiteId, formDataToObject(formData), {
      createdBy: session.email,
    });
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath('/websites');
    return { ok: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}
