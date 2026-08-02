import Link from 'next/link';
import { notFound } from 'next/navigation';
import { IntegrationSystem } from '@prisma/client';
import { archiveWebsiteAction } from '@/app/(app)/websites/actions';
import { createManualEventAction } from '@/app/(app)/websites/[id]/events/actions';
import { EventForm } from '@/components/EventForm';
import { EventTimeline } from '@/components/EventTimeline';
import { KeyDatesSection } from '@/components/KeyDatesSection';
import { WebsiteDsdBlock } from '@/components/WebsiteDsdBlock';
import { prisma } from '@/lib/db/prisma';
import { listWebsiteEvents } from '@/lib/events/service';
import { formatDateRu, labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';
import { WebsiteNotFoundError, getWebsiteById } from '@/lib/websites/service';

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let website;
  try {
    website = await getWebsiteById(id);
  } catch (error) {
    if (error instanceof WebsiteNotFoundError) notFound();
    throw error;
  }

  const events = await listWebsiteEvents(id);
  const createEvent = createManualEventAction.bind(null, website.id);
  const dsdIntegration = await prisma.websiteIntegration.findUnique({
    where: {
      websiteId_system: {
        websiteId: website.id,
        system: IntegrationSystem.DSD,
      },
    },
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/websites" className="text-sm text-ink-200 hover:text-sand-100">
            ← Сайты
          </Link>
          <h1 className="mt-2 font-display text-3xl text-sand-100">{website.domain}</h1>
          <p className="mt-1 text-sm text-ink-200">
            Нормализованный домен:{' '}
            <span className="text-ink-100">{website.normalizedDomain}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/websites/${website.id}/edit`}
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Редактировать
          </Link>
          {!website.archivedAt ? (
            <form action={archiveWebsiteAction.bind(null, website.id)}>
              <button
                type="submit"
                className="rounded border border-red-500/40 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
              >
                В архив
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Название" value={website.name ?? '—'} />
        <Meta label="Статус" value={labelWebsiteStatus(website.status)} />
        <Meta label="Этап" value={labelLifecycleStage(website.lifecycleStage)} />
        <Meta label="Группа" value={website.group ?? '—'} />
        <Meta label="Теги" value={website.tags.length ? website.tags.join(', ') : '—'} />
        <Meta label="Основной URL" value={website.primaryUrl ?? '—'} />
        <Meta label="Последняя работа" value={formatDateRu(website.lastWorkAt)} />
        <Meta label="В архиве с" value={formatDateRu(website.archivedAt)} />
      </dl>

      <KeyDatesSection website={website} />

      <WebsiteDsdBlock integration={dsdIntegration} />

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-sand-100">Журнал событий</h2>
          <p className="mt-1 text-sm text-ink-200">
            Хронология по дате события. Источник каждой записи виден в ленте. Коррекции дат не
            меняют старые записи.
          </p>
        </div>
        <EventTimeline events={events} />
      </section>

      <section>
        <EventForm action={createEvent} />
      </section>
    </div>
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
