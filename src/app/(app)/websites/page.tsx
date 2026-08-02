import Link from 'next/link';
import {
  formatDateRu,
  labelLifecycleStage,
  labelWebsiteStatus,
} from '@/lib/ui/labels';
import { listWebsites } from '@/lib/websites/service';

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const includeArchived = params.archived === '1';
  const websites = await listWebsites({ includeArchived });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-sand-100">Сайты</h1>
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
            className="rounded bg-moss-500 px-3 py-2 font-semibold text-ink-950 hover:bg-moss-400"
          >
            Добавить сайт
          </Link>
        </div>
      </div>

      {websites.length === 0 ? (
        <p className="rounded border border-dashed border-ink-700 px-4 py-10 text-center text-ink-200">
          Сайтов пока нет. Добавьте первый домен, чтобы начать журнал.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-ink-700/70">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-900/80 text-ink-200">
              <tr>
                <th className="px-4 py-3 font-medium">Домен</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Этап</th>
                <th className="px-4 py-3 font-medium">Группа</th>
                <th className="px-4 py-3 font-medium">Обновлён</th>
              </tr>
            </thead>
            <tbody>
              {websites.map((site) => (
                <tr key={site.id} className="border-t border-ink-700/50 hover:bg-ink-900/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/websites/${site.id}`}
                      className="font-medium text-sand-100 hover:underline"
                    >
                      {site.domain}
                    </Link>
                    <div className="text-xs text-ink-200">{site.normalizedDomain}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-100">{site.name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-100">{labelWebsiteStatus(site.status)}</td>
                  <td className="px-4 py-3 text-ink-100">
                    {labelLifecycleStage(site.lifecycleStage)}
                  </td>
                  <td className="px-4 py-3 text-ink-100">{site.group ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-200">{formatDateRu(site.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
