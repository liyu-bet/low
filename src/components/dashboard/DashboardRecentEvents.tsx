import Link from 'next/link';
import type { DashboardRecentEvent } from '@/lib/dashboard/types';
import { formatDateTimeRu, labelEventCategory, labelEventSource } from '@/lib/ui/labels';

function highlightClass(highlight: DashboardRecentEvent['highlight']): string {
  switch (highlight) {
    case 'down':
      return 'border-red-500/40 bg-red-500/10';
    case 'recovered':
      return 'border-moss-500/40 bg-moss-500/10';
    case 'first_impression':
    case 'first_click':
      return 'border-moss-500/30 bg-moss-500/5';
    case 'work':
      return 'border-sand-100/20 bg-sand-100/5';
    case 'date_change':
      return 'border-amber-200/30 bg-amber-200/5';
    default:
      return 'border-ink-700/60 bg-ink-950/40';
  }
}

function highlightLabel(highlight: DashboardRecentEvent['highlight']): string | null {
  switch (highlight) {
    case 'down':
      return 'Падение';
    case 'recovered':
      return 'Восстановление';
    case 'first_impression':
      return 'Первые показы';
    case 'first_click':
      return 'Первый клик';
    case 'work':
      return 'Работа';
    case 'date_change':
      return 'Ключевая дата';
    default:
      return null;
  }
}

export function DashboardRecentEvents({ events }: { events: DashboardRecentEvent[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl text-sand-100">Последние события</h2>
        <p className="mt-1 text-sm text-ink-200">20 последних записей журнала.</p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-ink-200">Событий пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const badge = highlightLabel(event.highlight);
            return (
              <li
                key={event.id}
                className={`rounded border px-3 py-3 text-sm ${highlightClass(event.highlight)}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-200">
                  <time>{formatDateTimeRu(event.occurredAt)}</time>
                  <span>·</span>
                  <Link href={`/websites/${event.websiteId}`} className="text-moss-400 hover:text-moss-300">
                    {event.domain}
                  </Link>
                  {badge ? (
                    <>
                      <span>·</span>
                      <span className="text-ink-100">{badge}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-1 text-ink-50">{event.title}</p>
                <p className="mt-1 text-xs text-ink-200">
                  {labelEventCategory(event.category)} · {labelEventSource(event.source)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
