'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireAdminSession } from '@/app/login/actions';
import { assertAuthenticated, authorSnapshot } from '@/lib/auth/session';
import {
  bulkAddTagsFromForm,
  bulkArchiveWebsitesFromForm,
  bulkCreateTasksFromForm,
  bulkRecordWorkFromForm,
  bulkRemoveTagsFromForm,
  bulkSetGroupFromForm,
  bulkSetLifecycleStageFromForm,
  bulkSetStatusFromForm,
  formatBulkResultMessage,
  isBulkValidationError,
  type BulkOperationResult,
} from '@/lib/websites/bulk';

export type BulkActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  clearSelection?: boolean;
  result?: BulkOperationResult;
};

function mapError(error: unknown): string {
  if (isBulkValidationError(error)) return error.message;
  if (error instanceof ZodError) {
    return error.errors.map((issue) => issue.message).join('; ');
  }
  if (error instanceof Error) return error.message;
  return 'Массовая операция не выполнена';
}

function revalidateBulkPaths(websiteIds: string[]) {
  revalidatePath('/websites');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  const limit = Math.min(websiteIds.length, 40);
  for (let i = 0; i < limit; i++) {
    revalidatePath(`/websites/${websiteIds[i]}`);
  }
}

function parseWebsiteIds(formData: FormData): string[] {
  const raw = String(formData.get('websiteIds') ?? '');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

async function runBulk(
  formData: FormData,
  runner: (
    formData: FormData,
    options: { createdBy: string; createdByUserId?: string | null },
  ) => Promise<BulkOperationResult>,
  options?: { clearSelectionOnSuccess?: boolean; revalidateTasks?: boolean },
): Promise<BulkActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  const websiteIds = parseWebsiteIds(formData);
  try {
    const result = await runner(formData, {
      createdBy: authorSnapshot(session),
      createdByUserId: session.userId,
    });
    revalidateBulkPaths(websiteIds);
    if (options?.revalidateTasks) revalidatePath('/tasks');
    return {
      ok: true,
      message: formatBulkResultMessage(result),
      clearSelection: options?.clearSelectionOnSuccess !== false,
      result,
    };
  } catch (error) {
    return { error: mapError(error), clearSelection: false };
  }
}

export async function bulkSetGroupAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkSetGroupFromForm);
}

export async function bulkAddTagsAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkAddTagsFromForm);
}

export async function bulkRemoveTagsAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkRemoveTagsFromForm);
}

export async function bulkSetStatusAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkSetStatusFromForm);
}

export async function bulkSetLifecycleStageAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkSetLifecycleStageFromForm);
}

export async function bulkCreateTasksAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkCreateTasksFromForm, { revalidateTasks: true });
}

export async function bulkRecordWorkAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkRecordWorkFromForm);
}

export async function bulkArchiveWebsitesAction(
  _prev: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  return runBulk(formData, bulkArchiveWebsitesFromForm);
}
