'use client';

import { useCallback, useState } from 'react';
import type { Website } from '@prisma/client';
import {
  clearDateOverrideAction,
  setDateOverrideAction,
} from '@/app/(app)/websites/[id]/dates/actions';
import { DateOverrideForm } from '@/components/DateOverrideForm';
import { formatDateOnlyRu } from '@/lib/dates/date-only';
import {
  DATE_FIELD_CONFIG,
  DATE_OVERRIDE_FIELDS,
  READ_ONLY_DATE_FIELDS,
  type DateOverrideField,
} from '@/lib/dates/fields';
import { provenanceLabelRu, resolveDateProvenance } from '@/lib/dates/effective';

export function KeyDatesSection({ website }: { website: Website }) {
  const [editing, setEditing] = useState<DateOverrideField | null>(null);
  const closeEditor = useCallback(() => setEditing(null), []);

  const setAction = setDateOverrideAction.bind(null, website.id);
  const clearAction = clearDateOverrideAction.bind(null, website.id);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-sand-100">Ключевые даты</h2>
        <p className="mt-1 text-sm text-ink-200">
          Итоговое значение, источник и возможность ручной корректировки с записью в журнал.
        </p>
      </div>

      <div className="space-y-3">
        {DATE_OVERRIDE_FIELDS.map((field) => {
          const config = DATE_FIELD_CONFIG[field];
          const automatic = website[config.automaticKey] as Date | null;
          const manual = website[config.manualKey] as Date | null;
          const effective = config.getEffective(website);
          const provenance = resolveDateProvenance(automatic, manual);
          const isEditing = editing === field;

          return (
            <div
              key={field}
              className="rounded border border-ink-700/60 bg-ink-950/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-200">{config.label}</div>
                  <div className="mt-1 text-base text-sand-100">{formatDateOnlyRu(effective)}</div>
                  <div className="mt-1 text-xs text-moss-400">{provenanceLabelRu(provenance)}</div>
                </div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(field)}
                    className="rounded border border-ink-700 px-3 py-1.5 text-sm text-ink-100 hover:border-moss-500"
                  >
                    Изменить
                  </button>
                ) : null}
              </div>

              <dl className="mt-3 grid gap-2 text-xs text-ink-200 sm:grid-cols-2">
                <div>
                  <dt>Автоматическое значение</dt>
                  <dd className="text-ink-100">{formatDateOnlyRu(automatic)}</dd>
                </div>
                <div>
                  <dt>Ручная корректировка</dt>
                  <dd className="text-ink-100">{formatDateOnlyRu(manual)}</dd>
                </div>
              </dl>

              {isEditing ? (
                <DateOverrideForm
                  field={field}
                  currentManual={manual}
                  setAction={setAction}
                  clearAction={clearAction}
                  onDone={closeEditor}
                />
              ) : null}
            </div>
          );
        })}

        {READ_ONLY_DATE_FIELDS.map((item) => {
          const value = website[item.key];
          return (
            <div
              key={item.key}
              className="rounded border border-ink-700/60 bg-ink-950/40 px-4 py-3"
            >
              <div className="text-xs uppercase tracking-wide text-ink-200">{item.label}</div>
              <div className="mt-1 text-base text-sand-100">{formatDateOnlyRu(value)}</div>
              <div className="mt-1 text-xs text-ink-200">
                {value ? 'автоматически · только чтение' : 'нет данных · только чтение'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
