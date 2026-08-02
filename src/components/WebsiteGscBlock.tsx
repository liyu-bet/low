import type { WebsiteIntegration } from '@prisma/client';
import { formatDateRu, formatDateTimeRu } from '@/lib/ui/labels';
import type { GscExternalSnapshot } from '@/lib/gsc/schemas';

function asSnapshot(value: unknown): GscExternalSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as GscExternalSnapshot;
}

export function WebsiteGscBlock({
  integrations,
  gscFirstSeenAt,
  firstImpressionAt,
  firstClickAt,
}: {
  integrations: WebsiteIntegration[];
  gscFirstSeenAt: Date | null;
  firstImpressionAt: Date | null;
  firstClickAt: Date | null;
}) {
  if (integrations.length === 0) {
    return (
      <section className="rounded border border-dashed border-ink-700 px-4 py-6 text-sm text-ink-200">
        Связь с GSC ещё не установлена. Запустите синхронизацию свойств на странице «Интеграции».
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-sand-100">GSC</h2>
        <p className="mt-1 text-sm text-ink-200">
          Связано properties: {integrations.length}. Read-only снимок Search Console. Дата
          обнаружения — первый импорт в приложение GSC; показы/клики — earliest available в API, не
          гарантия первой даты за всю историю.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta
          label="Первое обнаружение (GSC app)"
          value={formatDateRu(gscFirstSeenAt)}
        />
        <Meta label="Первые доступные показы" value={formatDateRu(firstImpressionAt)} />
        <Meta label="Первый доступный клик" value={formatDateRu(firstClickAt)} />
      </dl>

      <div className="space-y-4">
        {integrations.map((integration) => {
          const snapshot = asSnapshot(integration.externalData);
          return (
            <div
              key={integration.id}
              className="space-y-3 rounded border border-ink-700/60 bg-ink-950/40 px-4 py-3"
            >
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Meta label="Property URL" value={snapshot?.siteUrl ?? integration.externalKey ?? '—'} />
                <Meta label="Тип" value={snapshot?.propertyType ?? '—'} />
                <Meta label="Permission" value={snapshot?.permissionLevel ?? '—'} />
                <Meta
                  label="Google account"
                  value={
                    snapshot?.connection
                      ? `${snapshot.connection.name ?? '—'} (${snapshot.connection.email})`
                      : '—'
                  }
                />
                <Meta
                  label="Импорт в GSC app"
                  value={
                    snapshot?.gscFirstSeenAt
                      ? formatDateTimeRu(new Date(snapshot.gscFirstSeenAt))
                      : '—'
                  }
                />
                <Meta label="Синхронизация" value={formatDateTimeRu(integration.lastSyncedAt)} />
                <Meta label="Ошибка sync" value={integration.syncError ?? 'Нет данных'} />
                <Meta label="External id" value={integration.externalEntityId ?? '—'} />
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-200">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink-50">{value}</dd>
    </div>
  );
}
