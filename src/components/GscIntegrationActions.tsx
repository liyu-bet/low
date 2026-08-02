'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  checkGscConnectionAction,
  syncGscLifecycleAction,
  syncGscPropertiesAction,
  type IntegrationActionState,
} from '@/app/(app)/integrations/actions';

function PendingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function GscIntegrationActions({
  configured,
  baseUrl,
}: {
  configured: boolean;
  baseUrl: string | null;
}) {
  const [healthState, healthAction] = useActionState(
    checkGscConnectionAction,
    {} as IntegrationActionState,
  );
  const [syncState, syncAction] = useActionState(
    syncGscPropertiesAction,
    {} as IntegrationActionState,
  );
  const [lifecycleState, lifecycleAction] = useActionState(
    syncGscLifecycleAction,
    {} as IntegrationActionState,
  );

  if (!configured) {
    return (
      <p className="text-sm text-ink-200">
        Задайте <code className="text-ink-100">GSC_BASE_URL</code> и{' '}
        <code className="text-ink-100">GSC_LOW_API_TOKEN</code> в серверном окружении (без
        NEXT_PUBLIC_).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {baseUrl ? (
        <p className="text-sm text-ink-200">
          Base URL: <span className="text-ink-100">{baseUrl}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <form action={healthAction}>
          <PendingButton label="Проверить подключение" pendingLabel="Проверка…" />
        </form>
        <form action={syncAction}>
          <PendingButton label="Синхронизировать свойства" pendingLabel="Синхронизация…" />
        </form>
        <form action={lifecycleAction}>
          <PendingButton label="Найти первые показы и клики" pendingLabel="Поиск…" />
        </form>
      </div>

      <p className="text-xs text-ink-200">
        firstSeenAt — дата первого импорта property в приложение GSC. Даты показов/кликов —
        earliest available через Search Console API в пределах lookback, не «первая за всю
        историю».
      </p>

      {healthState.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {healthState.error}
        </p>
      ) : null}
      {healthState.ok && healthState.health ? (
        <p className="rounded border border-moss-500/40 bg-moss-50 px-3 py-2 text-sm text-moss-600">
          {healthState.message}: {healthState.health.service}, {healthState.health.generatedAt}
        </p>
      ) : null}

      {syncState.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {syncState.error}
        </p>
      ) : null}
      {syncState.ok && syncState.summary ? (
        <div className="rounded border border-moss-500/40 bg-moss-50 px-3 py-2 text-sm text-moss-600">
          <div>{syncState.message}</div>
          <div className="mt-1 text-ink-200">
            Статус: {syncState.summary.status} · обработано {syncState.summary.processed} · создано{' '}
            {syncState.summary.createdCount} · обновлено {syncState.summary.updatedCount} · ошибок{' '}
            {syncState.summary.errorCount}
          </div>
        </div>
      ) : null}

      {lifecycleState.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {lifecycleState.error}
        </p>
      ) : null}
      {lifecycleState.ok && lifecycleState.summary ? (
        <div className="rounded border border-moss-500/40 bg-moss-50 px-3 py-2 text-sm text-moss-600">
          <div>{lifecycleState.message}</div>
          <div className="mt-1 text-ink-200">
            Статус: {lifecycleState.summary.status} · обработано {lifecycleState.summary.processed} ·
            создано {lifecycleState.summary.createdCount} · обновлено{' '}
            {lifecycleState.summary.updatedCount} · ошибок {lifecycleState.summary.errorCount}
          </div>
        </div>
      ) : null}
    </div>
  );
}
