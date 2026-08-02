import type { Prisma, WebsiteEvent } from '@prisma/client';
import {
  EVENT_TYPE_DATE_OVERRIDE_CLEARED,
  EVENT_TYPE_DATE_OVERRIDE_SET,
  EVENT_TYPE_DATE_OVERRIDE_UPDATED,
} from '@/lib/constants';
import type { DateOverrideMetadata } from '@/lib/dates/overrides';
import {
  formatDateRu,
  formatDateTimeRu,
  labelEventCategory,
  labelEventSource,
} from '@/lib/ui/labels';

const OVERRIDE_TYPES = new Set([
  EVENT_TYPE_DATE_OVERRIDE_SET,
  EVENT_TYPE_DATE_OVERRIDE_UPDATED,
  EVENT_TYPE_DATE_OVERRIDE_CLEARED,
]);

function asOverrideMetadata(value: Prisma.JsonValue | null): DateOverrideMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.field !== 'string' || typeof record.fieldLabel !== 'string') return null;
  return {
    field: record.field as DateOverrideMetadata['field'],
    fieldLabel: record.fieldLabel,
    automaticValue: typeof record.automaticValue === 'string' ? record.automaticValue : null,
    previousManualValue:
      typeof record.previousManualValue === 'string' ? record.previousManualValue : null,
    newManualValue: typeof record.newManualValue === 'string' ? record.newManualValue : null,
    previousEffectiveValue:
      typeof record.previousEffectiveValue === 'string' ? record.previousEffectiveValue : null,
    newEffectiveValue:
      typeof record.newEffectiveValue === 'string' ? record.newEffectiveValue : null,
    reason: typeof record.reason === 'string' ? record.reason : '',
  };
}

export function EventTimeline({ events }: { events: WebsiteEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-200">
        Пока нет событий. Добавьте первое вручную ниже.
      </p>
    );
  }

  return (
    <ol className="space-y-4 border-l border-ink-700 pl-5">
      {events.map((event) => {
        const amount =
          event.amountMinor != null && event.currency
            ? `${(event.amountMinor / 100).toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} ${event.currency}`
            : null;
        const quantity =
          event.quantity != null && event.unit
            ? `${event.quantity.toLocaleString('ru-RU')} ${event.unit}`
            : null;

        const overrideMeta = OVERRIDE_TYPES.has(event.eventType)
          ? asOverrideMetadata(event.metadata)
          : null;

        return (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-moss-500" />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-200">
              <time dateTime={event.occurredAt.toISOString()}>
                {OVERRIDE_TYPES.has(event.eventType)
                  ? `Выполнено: ${formatDateTimeRu(event.occurredAt)}`
                  : `Дата факта: ${formatDateRu(event.occurredAt)}`}
              </time>
              <span>·</span>
              <span className="rounded border border-ink-700 px-1.5 py-0.5 text-ink-100">
                {labelEventSource(event.source)}
              </span>
              <span>·</span>
              <span>{labelEventCategory(event.category)}</span>
              <span>·</span>
              <span className="font-mono text-[11px] text-ink-200">{event.eventType}</span>
            </div>
            <div className="mt-1 text-sm font-medium text-sand-100">{event.title}</div>
            {event.description ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-200">{event.description}</p>
            ) : null}

            {overrideMeta ? (
              <div className="mt-2 space-y-1 rounded border border-ink-700/50 bg-ink-900/40 px-3 py-2 text-xs text-ink-200">
                <div>
                  Поле: <span className="text-ink-100">{overrideMeta.fieldLabel}</span>
                </div>
                <div>
                  Было (итог):{' '}
                  <span className="text-ink-100">
                    {overrideMeta.previousEffectiveValue ?? '—'}
                  </span>
                </div>
                <div>
                  Стало (итог):{' '}
                  <span className="text-ink-100">{overrideMeta.newEffectiveValue ?? '—'}</span>
                </div>
                <div className="text-[11px] text-ink-200">
                  Дата выполнения коррекции выше · историческая дата факта не подменяется в
                  журнале.
                </div>
              </div>
            ) : null}

            {(amount || quantity) && (
              <div className="mt-1 text-xs text-moss-400">
                {[amount, quantity].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="mt-1 text-[11px] text-ink-200">
              Записано: {formatDateTimeRu(event.recordedAt)}
              {event.createdBy ? ` · ${event.createdBy}` : ''}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
