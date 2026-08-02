'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  checkDsdConnectionAction,
  syncDsdSitesAction,
  type IntegrationActionState,
} from '@/app/(app)/integrations/actions';

function PendingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-moss-400 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function DsdIntegrationActions({ configured }: { configured: boolean }) {
  const [healthState, healthAction] = useActionState(checkDsdConnectionAction, {} as IntegrationActionState);
  const [syncState, syncAction] = useActionState(syncDsdSitesAction, {} as IntegrationActionState);

  if (!configured) {
    return (
      <p className="text-sm text-ink-200">
        Задайте <code className="text-ink-100">DSD_BASE_URL</code> и{' '}
        <code className="text-ink-100">DSD_LOW_API_TOKEN</code> в серверном окружении (без NEXT_PUBLIC_).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form action={healthAction}>
          <PendingButton label="Проверить подключение" pendingLabel="Проверка…" />
        </form>
        <form action={syncAction}>
          <PendingButton label="Синхронизировать сайты" pendingLabel="Синхронизация…" />
        </form>
      </div>

      {healthState.error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {healthState.error}
        </p>
      ) : null}
      {healthState.ok && healthState.health ? (
        <p className="rounded border border-moss-500/40 bg-moss-500/10 px-3 py-2 text-sm text-moss-400">
          {healthState.message}: {healthState.health.service}, {healthState.health.generatedAt}
        </p>
      ) : null}

      {syncState.error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {syncState.error}
        </p>
      ) : null}
      {syncState.ok && syncState.summary ? (
        <div className="rounded border border-moss-500/40 bg-moss-500/10 px-3 py-2 text-sm text-moss-400">
          <div>{syncState.message}</div>
          <div className="mt-1 text-ink-200">
            Статус: {syncState.summary.status} · обработано {syncState.summary.processed} · создано{' '}
            {syncState.summary.createdCount} · обновлено {syncState.summary.updatedCount} · ошибок{' '}
            {syncState.summary.errorCount}
          </div>
        </div>
      ) : null}
    </div>
  );
}
