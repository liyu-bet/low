import Link from 'next/link';
import type { AttentionItem } from '@/lib/dashboard/types';

function priorityLabel(priority: AttentionItem['priority']): string {
  if (priority === 'critical') return 'Критический';
  if (priority === 'high') return 'Высокий';
  return 'Средний';
}

function priorityClass(priority: AttentionItem['priority']): string {
  if (priority === 'critical') return 'text-red-200';
  if (priority === 'high') return 'text-amber-200';
  return 'text-ink-100';
}

function reasonAction(code: string, websiteId: string): { href: string; label: string } | null {
  switch (code) {
    case 'no_gsc':
    case 'gsc_integration_error':
    case 'gsc_lifecycle_error':
    case 'dsd_integration_error':
    case 'missing_dsd_data':
      return { href: '/integrations', label: 'Открыть интеграции' };
    case 'overdue_tasks':
      return { href: `#tasks`, label: 'К задачам' };
    case 'stale_work':
      return { href: '#add-event', label: 'Записать работу' };
    case 'no_impressions':
    case 'no_clicks':
      return { href: '/integrations', label: 'Синхронизация GSC' };
    case 'site_down':
    case 'was_up_now_down':
      return { href: '#integrations', label: 'Смотреть DSD' };
    default:
      return { href: `/tasks?websiteId=${websiteId}&action=create`, label: 'Создать задачу' };
  }
}

export function WebsiteAttentionBlock({
  attention,
  websiteId,
}: {
  attention: AttentionItem | null;
  websiteId: string;
}) {
  return (
    <section className="space-y-3 rounded border border-ink-700/70 bg-ink-950/40 p-4">
      <h2 className="font-display text-2xl text-sand-100">Требует внимания</h2>
      {!attention || attention.reasons.length === 0 ? (
        <p className="text-sm text-moss-400">Сайт не требует внимания</p>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm font-medium ${priorityClass(attention.priority)}`}>
            Приоритет: {priorityLabel(attention.priority)}
          </p>
          <ul className="space-y-2">
            {attention.reasons.map((reason) => {
              const action = reasonAction(reason.code, websiteId);
              return (
                <li
                  key={reason.code + reason.label}
                  className="rounded border border-ink-700/60 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-ink-50">{reason.label}</p>
                      <p className={`text-xs ${priorityClass(reason.priority)}`}>
                        {priorityLabel(reason.priority)}
                      </p>
                    </div>
                    {action ? (
                      action.href.startsWith('#') || action.href.startsWith('/') ? (
                        <Link href={action.href} className="text-moss-400 hover:text-moss-300">
                          {action.label}
                        </Link>
                      ) : null
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
