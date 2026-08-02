import Link from 'next/link';
import { formatDateTimeRu } from '@/lib/ui/labels';
import { listWebsites } from '@/lib/websites/service';
import {
  getWorkerAutomationStatus,
  labelWorkerPresence,
} from '@/lib/worker/status';
import { WebsitesTable } from '@/components/WebsitesTable';

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const includeArchived = params.archived === '1';
  const websites = await listWebsites({ includeArchived });
  const worker = await getWorkerAutomationStatus();

  const rows = websites.map((site) => ({
    id: site.id,
    domain: site.domain,
    normalizedDomain: site.normalizedDomain,
    name: site.name,
    primaryUrl: site.primaryUrl,
    status: site.status,
    lifecycleStage: site.lifecycleStage,
    group: site.group,
    tags: site.tags,
    launchedAt: site.launchedAt?.toISOString() ?? null,
    launchedAtManual: site.launchedAtManual?.toISOString() ?? null,
    firstHealthyAt: site.firstHealthyAt?.toISOString() ?? null,
    gscFirstSeenAt: site.gscFirstSeenAt?.toISOString() ?? null,
    gscAddedAtManual: site.gscAddedAtManual?.toISOString() ?? null,
    firstImpressionAt: site.firstImpressionAt?.toISOString() ?? null,
    firstImpressionAtManual: site.firstImpressionAtManual?.toISOString() ?? null,
    firstClickAt: site.firstClickAt?.toISOString() ?? null,
    firstClickAtManual: site.firstClickAtManual?.toISOString() ?? null,
    lastWorkAt: site.lastWorkAt?.toISOString() ?? null,
    archivedAt: site.archivedAt?.toISOString() ?? null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-sand-100">Сайты</h1>
          <p className="mt-1 text-sm text-ink-200">
            Инвентарь жизненного цикла всех отслеживаемых доменов.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={includeArchived ? '/websites' : '/websites?archived=1'}
            className="text-ink-200 underline-offset-2 hover:text-sand-100 hover:underline"
          >
            {includeArchived ? 'Скрыть архив' : 'Показать архив'}
          </Link>
          <Link
            href="/websites/new"
            className="rounded bg-moss-500 px-3 py-2 font-semibold text-white hover:bg-moss-600"
          >
            Добавить сайт
          </Link>
        </div>
      </div>

      <section className="rounded border border-ink-700 bg-white/30 px-4 py-3 text-sm text-ink-200">
        <h2 className="font-medium text-ink-50">Автоматизация</h2>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <span>
            Worker:{' '}
            <span
              className={
                worker.presence === 'online'
                  ? 'text-moss-600'
                  : worker.presence === 'stale'
                    ? 'text-amber-800'
                    : 'text-red-700'
              }
            >
              {labelWorkerPresence(worker.presence)}
            </span>
            {!worker.enabled ? ' (выключен)' : ''}
          </span>
          <span>
            DSD: {worker.lastSuccessfulDsdAt ? formatDateTimeRu(worker.lastSuccessfulDsdAt) : '—'}
          </span>
          <span>
            GSC:{' '}
            {worker.lastSuccessfulGscPropertiesAt
              ? formatDateTimeRu(worker.lastSuccessfulGscPropertiesAt)
              : '—'}
          </span>
          <span>Ждут lifecycle: {worker.lifecycleAwaitingCount}</span>
          {worker.lastWorkerError ? (
            <span className="text-red-700">Ошибка: {worker.lastWorkerError}</span>
          ) : null}
          <Link href="/integrations" className="text-sand-100 underline-offset-2 hover:underline">
            Подробнее
          </Link>
        </div>
      </section>

      <WebsitesTable websites={rows} />
    </div>
  );
}
