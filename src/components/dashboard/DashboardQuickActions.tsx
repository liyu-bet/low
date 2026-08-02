'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  syncDsdSitesAction,
  syncGscPropertiesAction,
  type IntegrationActionState,
} from '@/app/(app)/integrations/actions';

function PendingButton({
  label,
  pendingLabel,
  primary,
}: {
  label: string;
  pendingLabel: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primary ? 'btn-primary' : 'btn-secondary'}>
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {dsdConfigured ? (
          <form action={dsdAction}>
            <PendingButton label="Синхронизировать DSD" pendingLabel="Синхронизация…" primary />
          </form>
        ) : null}
        {gscConfigured ? (
          <form action={gscAction}>
            <PendingButton label="Синхронизировать GSC" pendingLabel="Синхронизация…" />
          </form>
        ) : null}
        <Link href="/integrations" className="btn-secondary">
          Интеграции
        </Link>
      </div>
      {dsdState.error ? <p className="text-sm text-red-700">{dsdState.error}</p> : null}
      {dsdState.message ? <p className="text-sm text-moss-600">{dsdState.message}</p> : null}
      {gscState.error ? <p className="text-sm text-red-700">{gscState.error}</p> : null}
      {gscState.message ? <p className="text-sm text-moss-600">{gscState.message}</p> : null}
    </div>
  );
}
