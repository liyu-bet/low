import type { WebsiteIntegration } from '@prisma/client';
import type { DsdExternalSnapshot } from '@/lib/dsd/schemas';
import { formatDateRu, formatDateTimeRu } from '@/lib/ui/labels';

function asSnapshot(value: unknown): DsdExternalSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as DsdExternalSnapshot;
}

export function WebsiteDsdBlock({ integration }: { integration: WebsiteIntegration | null }) {
  if (!integration) {
    return (
      <section className="rounded border border-dashed border-ink-700 px-4 py-6 text-sm text-ink-200">
        Связь с DSD ещё не установлена. Запустите синхронизацию на странице «Интеграции».
      </section>
    );
  }

  const snapshot = asSnapshot(integration.externalData);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl text-sand-100">DSD</h2>
        <p className="mt-1 text-sm text-ink-200">Снимок read-only данных из DSD (без секретов).</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Статус" value={snapshot?.status ?? '—'} />
        <Meta
          label="Ping"
          value={snapshot?.lastPingMs != null ? `${snapshot.lastPingMs} мс` : '—'}
        />
        <Meta label="DNS" value={snapshot ? (snapshot.isDnsValid ? 'валиден' : 'невалиден') : '—'} />
        <Meta label="Сервер" value={snapshot?.server?.name ?? '—'} />
        <Meta
          label="IP"
          value={snapshot?.server?.ip ?? snapshot?.apexARecord ?? '—'}
        />
        <Meta
          label="Окончание домена"
          value={
            snapshot?.domainExpiresAt
              ? formatDateRu(new Date(snapshot.domainExpiresAt))
              : '—'
          }
        />
        <Meta label="Синхронизация" value={formatDateTimeRu(integration.lastSyncedAt)} />
        <Meta label="DSD external id" value={integration.externalEntityId ?? '—'} />
      </dl>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink-700/60 bg-ink-950/40 px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-200">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink-50">{value}</dd>
    </div>
  );
}
