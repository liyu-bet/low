import { formatDateTimeRu, labelSyncRunStatus } from '@/lib/ui/labels';
import { isDsdConfigured } from '@/lib/dsd/config';
import { getLatestDsdSyncRun } from '@/lib/dsd/sync';
import { getGscBaseUrlForDisplay, isGscConfigured } from '@/lib/gsc/config';
import { getLatestGscSyncRun } from '@/lib/gsc/sync';
import {
  GSC_LIFECYCLE_SYNC_JOB_TYPE,
  GSC_PROPERTIES_SYNC_JOB_TYPE,
} from '@/lib/constants';
import { DsdIntegrationActions } from '@/components/DsdIntegrationActions';
import { GscIntegrationActions } from '@/components/GscIntegrationActions';
import {
  getWorkerAutomationStatus,
  labelWorkerPresence,
} from '@/lib/worker/status';

function SyncRunDetails({
  title,
  latest,
}: {
  title: string;
  latest: Awaited<ReturnType<typeof getLatestDsdSyncRun>>;
}) {
  return (
    <div className="border-t border-ink-700 pt-4 text-sm text-ink-200">
      <h3 className="text-ink-100">{title}</h3>
      {latest ? (
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <dt>Статус</dt>
            <dd className="text-ink-50">{labelSyncRunStatus(latest.status)}</dd>
          </div>
          <div>
            <dt>Тип / триггер</dt>
            <dd className="text-ink-50">
              {latest.jobType ?? '—'}
              {latest.trigger ? ` · ${latest.trigger}` : ''}
            </dd>
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
              <dd className="text-red-700">{latest.error}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2">Запусков ещё не было.</p>
      )}
    </div>
  );
}

function presenceClass(presence: 'online' | 'stale' | 'offline') {
  if (presence === 'online') return 'text-moss-600';
  if (presence === 'stale') return 'text-amber-800';
  return 'text-red-700';
}

export default async function IntegrationsPage() {
  const dsdConfigured = isDsdConfigured();
  const gscConfigured = isGscConfigured();
  const gscBaseUrl = getGscBaseUrlForDisplay();
  const latestDsd = await getLatestDsdSyncRun();
  const latestGscProperties = await getLatestGscSyncRun(GSC_PROPERTIES_SYNC_JOB_TYPE);
  const latestGscLifecycle = await getLatestGscSyncRun(GSC_LIFECYCLE_SYNC_JOB_TYPE);
  const worker = await getWorkerAutomationStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-sand-100">Интеграции</h1>
        <p className="mt-1 text-sm text-ink-200">
          Read-only синхронизация с DSD и GSC. Токены хранятся только на сервере и не попадают в
          браузер. OAuth-токены Google в LOW не копируются.
        </p>
      </div>

      <section className="space-y-4 rounded border border-ink-700 bg-white p-5">
        <div>
          <h2 className="text-2xl font-semibold text-sand-100">Фоновая синхронизация</h2>
          <p className="mt-1 text-sm text-ink-200">
            Отдельный фоновый процесс по расписанию. Ручные кнопки ниже используют те же блокировки.
          </p>
        </div>
        <dl className="grid gap-3 text-sm text-ink-200 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt>Включено</dt>
            <dd className="text-ink-50">{worker.enabled ? 'да' : 'нет (WORKER_ENABLED)'}</dd>
          </div>
          <div>
            <dt>Статус worker</dt>
            <dd className={presenceClass(worker.presence)}>
              {labelWorkerPresence(worker.presence)}
              {worker.workerLabel ? ` · ${worker.workerLabel}` : ''}
            </dd>
          </div>
          <div>
            <dt>Текущая задача</dt>
            <dd className="text-ink-50">{worker.currentJob ?? '—'}</dd>
          </div>
          <div>
            <dt>Последний heartbeat</dt>
            <dd className="text-ink-50">{formatDateTimeRu(worker.lastHeartbeatAt)}</dd>
          </div>
          <div>
            <dt>Интеграции</dt>
            <dd className="text-ink-50">
              DSD {worker.configuredIntegrations.dsd ? 'ок' : 'нет'} · GSC{' '}
              {worker.configuredIntegrations.gsc ? 'ок' : 'нет'}
            </dd>
          </div>
          {worker.lastError ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt>Последняя ошибка worker</dt>
              <dd className="text-red-700">{worker.lastError}</dd>
            </div>
          ) : null}
        </dl>

        <div className="border-t border-ink-700 pt-4">
          <h3 className="text-sm text-ink-100">Задачи</h3>
          <ul className="mt-2 space-y-3 text-sm text-ink-200">
            {worker.jobs.map((job) => (
              <li key={job.jobType} className="grid gap-1 sm:grid-cols-3">
                <span className="text-ink-50">{job.label}</span>
                <span>
                  Последний: {job.lastRun ? labelSyncRunStatus(job.lastRun.status) : '—'}
                  {job.lastRun?.finishedAt
                    ? ` · ${formatDateTimeRu(job.lastRun.finishedAt)}`
                    : ''}
                </span>
                <span>
                  Следующий (оценка):{' '}
                  {job.estimatedNextRunAt ? formatDateTimeRu(job.estimatedNextRunAt) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {worker.locks.length > 0 ? (
          <div className="border-t border-ink-700 pt-4 text-sm text-ink-200">
            <h3 className="text-ink-100">Активные блокировки</h3>
            <ul className="mt-2 space-y-1">
              {worker.locks.map((lock) => (
                <li key={lock.id}>
                  {lock.id.replace('job:', '')} — {lock.ownerLabel}, до{' '}
                  {formatDateTimeRu(lock.expiresAt)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded border border-ink-700 bg-white p-5">
        <div>
          <h2 className="text-2xl font-semibold text-sand-100">DSD</h2>
          <p className="mt-1 text-sm text-ink-200">
            Статус настройки:{' '}
            <span className={dsdConfigured ? 'text-moss-600' : 'text-red-700'}>
              {dsdConfigured ? 'настроено' : 'не настроено'}
            </span>
          </p>
        </div>

        <DsdIntegrationActions configured={dsdConfigured} />
        <SyncRunDetails title="Последняя синхронизация" latest={latestDsd} />
      </section>

      <section className="space-y-4 rounded border border-ink-700 bg-white p-5">
        <div>
          <h2 className="text-2xl font-semibold text-sand-100">GSC</h2>
          <p className="mt-1 text-sm text-ink-200">
            Статус настройки:{' '}
            <span className={gscConfigured ? 'text-moss-600' : 'text-red-700'}>
              {gscConfigured ? 'настроено' : 'не настроено'}
            </span>
          </p>
        </div>

        <GscIntegrationActions configured={gscConfigured} baseUrl={gscBaseUrl} />
        <SyncRunDetails title="Последняя синхронизация свойств" latest={latestGscProperties} />
        <SyncRunDetails title="Последний поиск показов и кликов" latest={latestGscLifecycle} />
      </section>
    </div>
  );
}
