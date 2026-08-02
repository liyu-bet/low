import type { Website } from '@prisma/client';
import type { WebsiteProfileOverview } from '@/lib/websites/profile';
import { formatDateRu, labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink-700/60 bg-ink-950/40 px-3 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-200">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink-50">{value || 'Нет данных'}</dd>
    </div>
  );
}

export function WebsiteStatusOverview({
  website,
  overview,
}: {
  website: Website;
  overview: WebsiteProfileOverview;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-sand-100">Текущее состояние</h2>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Статус сайта" value={labelWebsiteStatus(website.status)} />
        <Card label="Этап жизни" value={labelLifecycleStage(website.lifecycleStage)} />
        <Card label="Доступность DSD" value={overview.dsdAvailability} />
        <Card
          label="Подключение GSC"
          value={
            overview.gscLinkedCount > 0
              ? `${overview.gscLinkedCount} ${
                  overview.gscLinkedCount === 1 ? 'свойство' : 'свойств'
                }`
              : 'Нет данных'
          }
        />
        <Card label="Открытые задачи" value={String(overview.openTasksCount)} />
        <Card label="Последняя работа" value={formatDateRu(overview.lastWorkAt)} />
        <Card label="Срок домена" value={formatDateRu(overview.domainExpiresAt)} />
        <Card label="Сервер" value={overview.serverName ?? 'Нет данных'} />
      </dl>
    </section>
  );
}
