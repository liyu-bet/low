'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/app/login/actions';
import { authorSnapshot } from '@/lib/auth/session';
import { toSafeActionError } from '@/lib/errors/safe-action';
import {
  archiveWebsite,
  createWebsite,
  isDomainNormalizationError,
  isDuplicateDomainError,
  restoreWebsite,
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
  return toSafeActionError(error, 'Не удалось сохранить изменения');
}

export async function createWebsiteAction(
  _prev: WebsiteFormState,
  formData: FormData,
): Promise<WebsiteFormState> {
  const session = await requireAdminSession();
  try {
    const website = await createWebsite(formDataToObject(formData), {
      createdBy: authorSnapshot(session),
      createdByUserId: session.userId,
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
  const session = await requireAdminSession();
  await archiveWebsite(websiteId, { userId: session.userId, label: authorSnapshot(session) });
  revalidatePath('/websites');
  revalidatePath(`/websites/${websiteId}`);
  // Plain form action (not useActionState) — server redirect is fine.
  redirect('/websites');
}

export type WebsiteListActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

/** Used from the workspace cards — no redirect, list stays in place. */
export async function archiveWebsiteFromListAction(
  websiteId: string,
  _prev: WebsiteListActionState,
  _formData: FormData,
): Promise<WebsiteListActionState> {
  const session = await requireAdminSession();
  try {
    await archiveWebsite(websiteId, { userId: session.userId, label: authorSnapshot(session) });
    revalidatePath('/websites');
    revalidatePath(`/websites/${websiteId}`);
    return { ok: true, message: 'Сайт убран из LOW' };
  } catch (error) {
    return { error: mapWebsiteError(error) };
  }
}

export async function restoreWebsiteFromListAction(
  websiteId: string,
  _prev: WebsiteListActionState,
  _formData: FormData,
): Promise<WebsiteListActionState> {
  const session = await requireAdminSession();
  try {
    await restoreWebsite(websiteId, { userId: session.userId, label: authorSnapshot(session) });
    revalidatePath('/websites');
    revalidatePath(`/websites/${websiteId}`);
    return { ok: true, message: 'Сайт возвращён в LOW' };
  } catch (error) {
    return { error: mapWebsiteError(error) };
  }
}
