import type { WebsiteIntegration } from '@prisma/client';
import { parseDsdExternalSnapshot, isDsdOfflineStatus, isDsdOnlineStatus } from '@/lib/dsd/snapshot';
import { formatDateRu, formatDateTimeRu } from '@/lib/ui/labels';

function availabilityLabel(integration: WebsiteIntegration | null): string {
  if (!integration) return 'Нет связи с DSD';
  const snapshot = parseDsdExternalSnapshot(integration.externalData);
  if (!snapshot) return 'Неизвестно';
  if (isDsdOnlineStatus(snapshot.status)) return 'Работает';
  if (isDsdOfflineStatus(snapshot.status)) return 'Недоступен';
  return 'Неизвестно';
}

export function WebsiteDsdBlock({ integration }: { integration: WebsiteIntegration | null }) {
  if (!integration) {
    return (
      <section className="rounded border border-dashed border-ink-700 px-4 py-6 text-sm text-ink-200">
        Связь с DSD ещё не установлена. Запустите синхронизацию на странице «Интеграции».
      </section>
    );
  }

  const snapshot = parseDsdExternalSnapshot(integration.externalData);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">DSD</h2>
        <p className="mt-1 text-sm text-ink-200">Снимок read-only данных из DSD (без секретов).</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Состояние" value={availabilityLabel(integration)} />
        <Meta label="Статус" value={snapshot?.status ?? 'Нет данных'} />
        <Meta
          label="Ping"
          value={snapshot?.lastPingMs != null ? `${snapshot.lastPingMs} мс` : 'Нет данных'}
        />
        <Meta
          label="DNS"
          value={
            snapshot ? (snapshot.isDnsValid ? 'валиден' : 'невалиден') : 'Нет данных'
          }
        />
        <Meta label="Сервер" value={snapshot?.server?.name ?? 'Нет данных'} />
        <Meta
          label="IP"
          value={snapshot?.server?.ip ?? snapshot?.apexARecord ?? 'Нет данных'}
        />
        <Meta
          label="Окончание домена"
          value={
            snapshot?.domainExpiresAt
              ? formatDateRu(new Date(snapshot.domainExpiresAt))
              : 'Нет данных'
          }
        />
        <Meta label="Синхронизация" value={formatDateTimeRu(integration.lastSyncedAt)} />
        <Meta label="Ошибка sync" value={integration.syncError ?? 'Нет данных'} />
        <Meta label="DSD external id" value={integration.externalEntityId ?? 'Нет данных'} />
      </dl>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink-700 bg-white px-4 py-3">
      <dt className="text-xs font-medium text-ink-200">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink-50">{value}</dd>
    </div>
  );
}
