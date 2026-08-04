'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/app/login/actions';
import { assertAuthenticated } from '@/lib/auth/session';
import { checkDsdHealth, DsdApiError } from '@/lib/dsd/client';
import { DsdConfigError, requireDsdClientConfig } from '@/lib/dsd/config';
import { runManualDsdFullSync } from '@/lib/dsd/sync';
import { toSafeActionError } from '@/lib/errors/safe-action';
import { checkGscHealth, GscApiError } from '@/lib/gsc/client';
import { GscConfigError, requireGscClientConfig } from '@/lib/gsc/config';
import { runManualGscLifecycleSync } from '@/lib/gsc/lifecycle';
import { runManualGscPropertiesSync } from '@/lib/gsc/sync';

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

function syncMessage(
  status: string,
  labels: { success: string; partial: string; skipped: string; failed: string },
): string {
  if (status === 'SUCCESS') return labels.success;
  if (status === 'PARTIAL') return labels.partial;
  if (status === 'SKIPPED') return labels.skipped;
  return labels.failed;
}

function mapError(error: unknown): string {
  if (
    error instanceof DsdConfigError ||
    error instanceof DsdApiError ||
    error instanceof GscConfigError ||
    error instanceof GscApiError
  ) {
    return error.message;
  }
  return toSafeActionError(error, 'Операция интеграции не выполнена');
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
    revalidatePath('/dashboard');
    return {
      ok: summary.status !== 'FAILED' && summary.status !== 'SKIPPED',
      message: syncMessage(summary.status, {
        success: 'Синхронизация завершена успешно',
        partial: 'Синхронизация завершена частично',
        skipped: 'Синхронизация уже выполняется',
        failed: 'Синхронизация завершилась с ошибкой',
      }),
      error: summary.status === 'SKIPPED' ? 'Синхронизация уже выполняется' : undefined,
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

export async function checkGscConnectionAction(
  _prev: IntegrationActionState,
  _formData: FormData,
): Promise<IntegrationActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const config = requireGscClientConfig();
    const health = await checkGscHealth(config);
    return {
      ok: true,
      message: 'Подключение к GSC успешно',
      health,
    };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function syncGscPropertiesAction(
  _prev: IntegrationActionState,
  _formData: FormData,
): Promise<IntegrationActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const summary = await runManualGscPropertiesSync({ session });
    revalidatePath('/integrations');
    revalidatePath('/websites');
    revalidatePath('/dashboard');
    return {
      ok: summary.status !== 'FAILED' && summary.status !== 'SKIPPED',
      message: syncMessage(summary.status, {
        success: 'Синхронизация свойств GSC завершена успешно',
        partial: 'Синхронизация свойств GSC завершена частично',
        skipped: 'Синхронизация уже выполняется',
        failed: 'Синхронизация свойств GSC завершилась с ошибкой',
      }),
      error: summary.status === 'SKIPPED' ? 'Синхронизация уже выполняется' : undefined,
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

export async function syncGscLifecycleAction(
  _prev: IntegrationActionState,
  _formData: FormData,
): Promise<IntegrationActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const summary = await runManualGscLifecycleSync({ session });
    revalidatePath('/integrations');
    revalidatePath('/websites');
    revalidatePath('/dashboard');
    return {
      ok: summary.status !== 'FAILED' && summary.status !== 'SKIPPED',
      message: syncMessage(summary.status, {
        success: 'Поиск первых показов и кликов завершён успешно',
        partial: 'Поиск первых показов и кликов завершён частично',
        skipped: 'Синхронизация уже выполняется',
        failed: 'Поиск первых показов и кликов завершился с ошибкой',
      }),
      error: summary.status === 'SKIPPED' ? 'Синхронизация уже выполняется' : undefined,
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
