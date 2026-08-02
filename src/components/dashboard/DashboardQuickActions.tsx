'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  syncDsdSitesAction,
  syncGscPropertiesAction,
  type IntegrationActionState,
} from '@/app/(app)/integrations/actions';

function PendingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function DashboardQuickActions({
  dsdConfigured,
  gscConfigured,
}: {
  dsdConfigured: boolean;
  gscConfigured: boolean;
}) {
  const [dsdState, dsdAction] = useActionState(syncDsdSitesAction, {} as IntegrationActionState);
  const [gscState, gscAction] = useActionState(
    syncGscPropertiesAction,
    {} as IntegrationActionState,
  );

  return (
    <section className="space-y-3 rounded border border-ink-700/70 bg-ink-950/40 p-4">
      <h2 className="font-display text-xl text-sand-100">Быстрые действия</h2>
      <div className="flex flex-wrap gap-3">
        {dsdConfigured ? (
          <form action={dsdAction}>
            <PendingButton label="Синхронизировать DSD" pendingLabel="Синхронизация…" />
          </form>
        ) : null}
        {gscConfigured ? (
          <form action={gscAction}>
            <PendingButton label="Синхронизировать GSC" pendingLabel="Синхронизация…" />
          </form>
        ) : null}
        <Link
          href="/integrations"
          className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
        >
          Открыть интеграции
        </Link>
      </div>
      {dsdState.error ? <p className="text-sm text-red-200">{dsdState.error}</p> : null}
      {dsdState.message ? <p className="text-sm text-moss-400">{dsdState.message}</p> : null}
      {gscState.error ? <p className="text-sm text-red-200">{gscState.error}</p> : null}
      {gscState.message ? <p className="text-sm text-moss-400">{gscState.message}</p> : null}
    </section>
  );
}
