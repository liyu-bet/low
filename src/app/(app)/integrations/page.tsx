import { formatDateTimeRu } from '@/lib/ui/labels';
import { isDsdConfigured } from '@/lib/dsd/config';
import { getLatestDsdSyncRun } from '@/lib/dsd/sync';
import { DsdIntegrationActions } from '@/components/DsdIntegrationActions';

export default async function IntegrationsPage() {
  const configured = isDsdConfigured();
  const latest = await getLatestDsdSyncRun();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-sand-100">Интеграции</h1>
        <p className="mt-1 text-sm text-ink-200">
          Read-only синхронизация с DSD. Токены хранятся только на сервере и не попадают в браузер.
        </p>
      </div>

      <section className="space-y-4 rounded border border-ink-700/70 bg-ink-950/40 p-5">
        <div>
          <h2 className="font-display text-2xl text-sand-100">DSD</h2>
          <p className="mt-1 text-sm text-ink-200">
            Статус настройки:{' '}
            <span className={configured ? 'text-moss-400' : 'text-red-200'}>
              {configured ? 'настроено' : 'не настроено'}
            </span>
          </p>
        </div>

        <DsdIntegrationActions configured={configured} />

        <div className="border-t border-ink-700/60 pt-4 text-sm text-ink-200">
          <h3 className="text-ink-100">Последняя синхронизация</h3>
          {latest ? (
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <dt>Статус</dt>
                <dd className="text-ink-50">{latest.status}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd className="text-ink-50">{latest.jobType ?? '—'}</dd>
              </div>
              <div>
                <dt>Начало</dt>
                <dd className="text-ink-50">{formatDateTimeRu(latest.startedAt)}</dd>
              </div>
              <div>
                <dt>Окончание</dt>
                <dd className="text-ink-50">{formatDateTimeRu(latest.finishedAt)}</dd>
              </div>
              <div>
                <dt>Прочитано / обработано</dt>
                <dd className="text-ink-50">
                  {latest.itemsRead} / {latest.processed}
                </dd>
              </div>
              <div>
                <dt>Создано / обновлено / ошибок</dt>
                <dd className="text-ink-50">
                  {latest.createdCount} / {latest.updatedCount} / {latest.errorCount}
                </dd>
              </div>
              {latest.error ? (
                <div className="sm:col-span-2">
                  <dt>Ошибка</dt>
                  <dd className="text-red-200">{latest.error}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2">Синхронизаций ещё не было.</p>
          )}
        </div>
      </section>
    </div>
  );
}
