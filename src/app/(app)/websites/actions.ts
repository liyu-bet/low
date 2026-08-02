'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { requireAdminSession } from '@/app/login/actions';
import {
  archiveWebsite,
  createWebsite,
  isDomainNormalizationError,
  isDuplicateDomainError,
  updateWebsite,
} from '@/lib/websites/service';

export type WebsiteFormState = {
  error?: string;
  ok?: boolean;
  redirectTo?: string;
};

function formDataToObject(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

function mapWebsiteError(error: unknown): string {
  if (isDuplicateDomainError(error)) {
    return `Сайт с доменом «${error.normalizedDomain}» уже существует`;
  }
  if (isDomainNormalizationError(error)) {
    return error.message;
  }
  if (error instanceof ZodError) {
    return error.errors.map((issue) => issue.message).join('; ');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неожиданная ошибка';
}

export async function createWebsiteAction(
  _prev: WebsiteFormState,
  formData: FormData,
): Promise<WebsiteFormState> {
  const session = await requireAdminSession();
  try {
    const website = await createWebsite(formDataToObject(formData), {
      createdBy: session.email,
    });
    revalidatePath('/websites');
    return { ok: true, redirectTo: `/websites/${website.id}` };
  } catch (error) {
    return { error: mapWebsiteError(error) };
  }
}

export async function updateWebsiteAction(
  websiteId: string,
  _prev: WebsiteFormState,
  formData: FormData,
): Promise<WebsiteFormState> {
  await requireAdminSession();
  try {
    await updateWebsite(websiteId, formDataToObject(formData));
    revalidatePath('/websites');
    revalidatePath(`/websites/${websiteId}`);
    return { ok: true, redirectTo: `/websites/${websiteId}` };
  } catch (error) {
    return { error: mapWebsiteError(error) };
  }
}

export async function archiveWebsiteAction(websiteId: string): Promise<void> {
  await requireAdminSession();
  await archiveWebsite(websiteId);
  revalidatePath('/websites');
  revalidatePath(`/websites/${websiteId}`);
  // Plain form action (not useActionState) — server redirect is fine.
  redirect('/websites');
}
