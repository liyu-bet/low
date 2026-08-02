'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/app/login/actions';
import { assertAuthenticated } from '@/lib/auth/session';
import { checkDsdHealth, DsdApiError } from '@/lib/dsd/client';
import { DsdConfigError, requireDsdClientConfig } from '@/lib/dsd/config';
import { runManualDsdFullSync } from '@/lib/dsd/sync';

export type IntegrationActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  summary?: {
    status: string;
    processed: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
  };
  health?: {
    ok: boolean;
    service: string;
    generatedAt: string;
  };
};

function mapError(error: unknown): string {
  if (error instanceof DsdConfigError || error instanceof DsdApiError) {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Операция интеграции не выполнена';
}

export async function checkDsdConnectionAction(
  _prev: IntegrationActionState,
  _formData: FormData,
): Promise<IntegrationActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const config = requireDsdClientConfig();
    const health = await checkDsdHealth(config);
    return {
      ok: true,
      message: 'Подключение к DSD успешно',
      health,
    };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function syncDsdSitesAction(
  _prev: IntegrationActionState,
  _formData: FormData,
): Promise<IntegrationActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const summary = await runManualDsdFullSync({ session });
    revalidatePath('/integrations');
    revalidatePath('/websites');
    return {
      ok: true,
      message:
        summary.status === 'SUCCESS'
          ? 'Синхронизация завершена успешно'
          : summary.status === 'PARTIAL'
            ? 'Синхронизация завершена частично'
            : 'Синхронизация завершилась с ошибкой',
      summary: {
        status: summary.status,
        processed: summary.processed,
        createdCount: summary.createdCount,
        updatedCount: summary.updatedCount,
        errorCount: summary.errorCount,
      },
    };
  } catch (error) {
    return { error: mapError(error) };
  }
}
