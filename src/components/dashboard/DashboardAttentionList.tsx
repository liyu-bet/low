import Link from 'next/link';
import type { AttentionItem, AttentionPriority } from '@/lib/dashboard/types';
import { formatDateRu, labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';

function priorityLabel(priority: AttentionPriority): string {
  if (priority === 'critical') return 'Критический';
  if (priority === 'high') return 'Высокий';
  return 'Средний';
}

function priorityClass(priority: AttentionPriority): string {
  if (priority === 'critical') return 'text-red-700';
  if (priority === 'high') return 'text-amber-800';
  return 'text-ink-100';
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <>
      <td className="px-3 py-3 align-top">
        <div className="font-medium text-sand-100">{item.domain}</div>
        <div className="text-xs text-ink-200">{item.name ?? '—'}</div>
      </td>
      <td className="px-3 py-3 align-top text-ink-100">
        {labelWebsiteStatus(item.status)}
        <div className="text-xs text-ink-200">{labelLifecycleStage(item.lifecycleStage)}</div>
      </td>
      <td className="px-3 py-3 align-top text-ink-200">{item.group ?? '—'}</td>
      <td className={`px-3 py-3 align-top font-medium ${priorityClass(item.priority)}`}>
        {priorityLabel(item.priority)}
      </td>
      <td className="px-3 py-3 align-top">
        <ul className="space-y-1 text-sm text-ink-100">
          {item.reasons.map((reason) => (
            <li key={reason.code + reason.label}>{reason.label}</li>
          ))}
        </ul>
      </td>
      <td className="px-3 py-3 align-top text-sm text-ink-200">
        <div>Работа: {formatDateRu(item.lastWorkAt)}</div>
        <div>Запуск: {formatDateRu(item.launchedAt)}</div>
        <div>Показы: {formatDateRu(item.firstImpressionAt)}</div>
        <div>Клик: {formatDateRu(item.firstClickAt)}</div>
        <div>Домен: {formatDateRu(item.domainExpiresAt)}</div>
      </td>
      <td className="px-3 py-3 align-top text-sm text-ink-200">
        <div>DSD: {item.dsdStatusLabel}</div>
        <div>GSC: {item.gscStatusLabel}</div>
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-2 text-sm">
          <Link href={`/websites/${item.websiteId}`} className="text-moss-600 hover:text-moss-600">
            Открыть
          </Link>
          <Link
            href={`/websites/${item.websiteId}#add-event`}
            className="text-ink-100 hover:text-sand-100"
          >
            Записать работу
          </Link>
        </div>
      </td>
    </>
  );
}

export function DashboardAttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-200">
        Нет сайтов по текущим фильтрам.
      </p>
    );
  }

  return (
    <>
      <div className="data-scroll hidden md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink-700 bg-ink-900 text-xs font-medium text-ink-200">
            <tr>
              <th className="px-3 py-3 font-medium">Сайт</th>
              <th className="px-3 py-3 font-medium">Статус / этап</th>
              <th className="px-3 py-3 font-medium">Группа</th>
              <th className="px-3 py-3 font-medium">Приоритет</th>
              <th className="px-3 py-3 font-medium">Причины</th>
              <th className="px-3 py-3 font-medium">Даты</th>
              <th className="px-3 py-3 font-medium">DSD / GSC</th>
              <th className="px-3 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800/80">
            {items.map((item) => (
              <tr key={item.websiteId} className="bg-ink-950/30">
                <AttentionRow item={item} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article
            key={item.websiteId}
            className="rounded border border-ink-700 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-sand-100">{item.domain}</h3>
                <p className="text-xs text-ink-200">{item.name ?? '—'}</p>
              </div>
              <span className={`text-sm font-medium ${priorityClass(item.priority)}`}>
                {priorityLabel(item.priority)}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-200">
              {labelWebsiteStatus(item.status)} · {labelLifecycleStage(item.lifecycleStage)}
              {item.group ? ` · ${item.group}` : ''}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink-100">
              {item.reasons.map((reason) => (
                <li key={reason.code + reason.label}>{reason.label}</li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-200">
              <div>
                <dt>Последняя работа</dt>
                <dd className="text-ink-100">{formatDateRu(item.lastWorkAt)}</dd>
              </div>
              <div>
                <dt>Запуск</dt>
                <dd className="text-ink-100">{formatDateRu(item.launchedAt)}</dd>
              </div>
              <div>
                <dt>Показы</dt>
                <dd className="text-ink-100">{formatDateRu(item.firstImpressionAt)}</dd>
              </div>
              <div>
                <dt>Клик</dt>
                <dd className="text-ink-100">{formatDateRu(item.firstClickAt)}</dd>
              </div>
              <div>
                <dt>Домен</dt>
                <dd className="text-ink-100">{formatDateRu(item.domainExpiresAt)}</dd>
              </div>
              <div>
                <dt>DSD / GSC</dt>
                <dd className="text-ink-100">
                  {item.dsdStatusLabel} / {item.gscStatusLabel}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-4 text-sm">
              <Link href={`/websites/${item.websiteId}`} className="text-moss-600">
                Открыть
              </Link>
              <Link href={`/websites/${item.websiteId}#add-event`} className="text-ink-100">
                Записать работу
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
