'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/app/login/actions';
import { assertAuthenticated } from '@/lib/auth/session';
import { checkDsdHealth, DsdApiError } from '@/lib/dsd/client';
import { DsdConfigError, requireDsdClientConfig } from '@/lib/dsd/config';
import { runManualDsdFullSync } from '@/lib/dsd/sync';
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

function mapError(error: unknown): string {
  if (
    error instanceof DsdConfigError ||
    error instanceof DsdApiError ||
    error instanceof GscConfigError ||
    error instanceof GscApiError
  ) {
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
    return {
      ok: true,
      message:
        summary.status === 'SUCCESS'
          ? 'Синхронизация свойств GSC завершена успешно'
          : summary.status === 'PARTIAL'
            ? 'Синхронизация свойств GSC завершена частично'
            : 'Синхронизация свойств GSC завершилась с ошибкой',
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
    return {
      ok: true,
      message:
        summary.status === 'SUCCESS'
          ? 'Поиск первых показов и кликов завершён успешно'
          : summary.status === 'PARTIAL'
            ? 'Поиск первых показов и кликов завершён частично'
            : 'Поиск первых показов и кликов завершился с ошибкой',
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
