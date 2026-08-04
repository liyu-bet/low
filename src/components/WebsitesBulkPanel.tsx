'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  bulkAddTagsAction,
  bulkArchiveWebsitesAction,
  bulkCreateTasksAction,
  bulkRecordWorkAction,
  bulkRemoveTagsAction,
  bulkSetGroupAction,
  bulkSetLifecycleStageAction,
  bulkSetStatusAction,
  type BulkActionState,
} from '@/app/(app)/websites/bulk-actions';
import type { WebsiteTableRow } from '@/components/WebsitesTable';
import { dateOnlyToInputValue, todayDateOnlyUtc } from '@/lib/dates/date-only';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveGscAddedDate,
  getEffectiveLaunchDate,
} from '@/lib/dates/effective';
import { buildCsvWithBom, csvFilenameForDate } from '@/lib/websites/csv';
import {
  LIFECYCLE_STAGE_LABELS,
  TASK_PRIORITY_LABELS,
  WEBSITE_STATUS_LABELS,
} from '@/lib/ui/labels';
import {
  BULK_EDITABLE_STAGES,
  BULK_EDITABLE_STATUSES,
  BULK_WORK_CATEGORIES,
} from '@/lib/validations/bulk';
import { TaskPriority } from '@prisma/client';

type ActionKey =
  | 'group'
  | 'add_tags'
  | 'remove_tags'
  | 'status'
  | 'stage'
  | 'tasks'
  | 'work'
  | 'archive'
  | 'csv';

function PendingButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Message({ state }: { state: BulkActionState }) {
  if (state.error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p className="rounded border border-moss-500/40 bg-moss-50 px-3 py-2 text-sm text-moss-600">
        {state.message}
      </p>
    );
  }
  return null;
}

function downloadSelectedCsv(rows: WebsiteTableRow[]) {
  const header = [
    'domain',
    'name',
    'primaryUrl',
    'status',
    'lifecycleStage',
    'group',
    'tags',
    'launchedAt',
    'firstHealthyAt',
    'gscFirstSeenAt',
    'firstImpressionAt',
    'firstClickAt',
    'lastWorkAt',
    'createdAt',
    'updatedAt',
  ];
  const body = rows.map((row) => {
    const effective = {
      launchedAt: row.launchedAt ? new Date(row.launchedAt) : null,
      launchedAtManual: row.launchedAtManual ? new Date(row.launchedAtManual) : null,
      gscFirstSeenAt: row.gscFirstSeenAt ? new Date(row.gscFirstSeenAt) : null,
      gscAddedAtManual: row.gscAddedAtManual ? new Date(row.gscAddedAtManual) : null,
      firstImpressionAt: row.firstImpressionAt ? new Date(row.firstImpressionAt) : null,
      firstImpressionAtManual: row.firstImpressionAtManual
        ? new Date(row.firstImpressionAtManual)
        : null,
      firstClickAt: row.firstClickAt ? new Date(row.firstClickAt) : null,
      firstClickAtManual: row.firstClickAtManual ? new Date(row.firstClickAtManual) : null,
    };
    return [
      row.domain,
      row.name ?? '',
      row.primaryUrl ?? '',
      row.status,
      row.lifecycleStage,
      row.group ?? '',
      row.tags.join('; '),
      dateOnlyToInputValue(getEffectiveLaunchDate(effective)),
      dateOnlyToInputValue(row.firstHealthyAt ? new Date(row.firstHealthyAt) : null),
      dateOnlyToInputValue(getEffectiveGscAddedDate(effective)),
      dateOnlyToInputValue(getEffectiveFirstImpressionDate(effective)),
      dateOnlyToInputValue(getEffectiveFirstClickDate(effective)),
      dateOnlyToInputValue(row.lastWorkAt ? new Date(row.lastWorkAt) : null),
      dateOnlyToInputValue(new Date(row.createdAt)),
      dateOnlyToInputValue(new Date(row.updatedAt)),
    ];
  });
  const csv = buildCsvWithBom([header, ...body]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFilenameForDate();
  a.click();
  URL.revokeObjectURL(url);
}

export function WebsitesBulkPanel({
  selectedIds,
  websitesById,
  onClearSelection,
  onSuccessClear,
}: {
  selectedIds: string[];
  websitesById: Map<string, WebsiteTableRow>;
  onClearSelection: () => void;
  onSuccessClear: () => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState<ActionKey | null>(null);
  const websiteIdsJson = useMemo(() => JSON.stringify(selectedIds), [selectedIds]);
  const selectedRows = useMemo(
    () => selectedIds.map((id) => websitesById.get(id)).filter(Boolean) as WebsiteTableRow[],
    [selectedIds, websitesById],
  );
  const eligibleForTasks = selectedRows.filter(
    (row) => !row.archivedAt && row.status !== 'ARCHIVED',
  ).length;
  const [bulkOperationId, setBulkOperationId] = useState('bulk_pending');
  useEffect(() => {
    setBulkOperationId(
      `bulk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    );
  }, [action, websiteIdsJson]);

  const [groupState, groupAction] = useActionState(bulkSetGroupAction, {} as BulkActionState);
  const [addTagsState, addTagsAction] = useActionState(bulkAddTagsAction, {} as BulkActionState);
  const [removeTagsState, removeTagsAction] = useActionState(
    bulkRemoveTagsAction,
    {} as BulkActionState,
  );
  const [statusState, statusAction] = useActionState(bulkSetStatusAction, {} as BulkActionState);
  const [stageState, stageAction] = useActionState(
    bulkSetLifecycleStageAction,
    {} as BulkActionState,
  );
  const [tasksState, tasksAction] = useActionState(bulkCreateTasksAction, {} as BulkActionState);
  const [workState, workAction] = useActionState(bulkRecordWorkAction, {} as BulkActionState);
  const [archiveState, archiveAction] = useActionState(
    bulkArchiveWebsitesAction,
    {} as BulkActionState,
  );

  const states = [
    groupState,
    addTagsState,
    removeTagsState,
    statusState,
    stageState,
    tasksState,
    workState,
    archiveState,
  ];

  useEffect(() => {
    const success = states.find((s) => s.ok && s.clearSelection);
    if (success) {
      onSuccessClear();
      router.refresh();
      setAction(null);
    } else if (states.some((s) => s.ok)) {
      router.refresh();
    }
    // intentionally only react to latest state snapshots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupState, addTagsState, removeTagsState, statusState, stageState, tasksState, workState, archiveState]);

  if (selectedIds.length === 0) return null;

  const fieldClass =
    'mt-1 w-full rounded border border-ink-700 bg-white px-3 py-2 text-sm text-ink-50';
  const btnSecondary =
    'rounded border border-ink-700 px-3 py-1.5 text-sm text-ink-100 hover:border-moss-500';
  const btnPrimary =
    'rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600 disabled:opacity-60';

  return (
    <div className="sticky bottom-3 z-20 rounded border border-moss-500/40 bg-ink-950/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sand-100">
          Выбрано: <span className="text-2xl font-semibold">{selectedIds.length}</span>
        </p>
        <button type="button" onClick={onClearSelection} className={btnSecondary}>
          Снять выделение
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ['group', 'Назначить группу'],
            ['add_tags', 'Добавить теги'],
            ['remove_tags', 'Удалить теги'],
            ['status', 'Изменить статус'],
            ['stage', 'Изменить этап'],
            ['tasks', 'Создать задачу'],
            ['work', 'Записать работу'],
            ['archive', 'Архивировать'],
            ['csv', 'Экспортировать CSV'],
          ] as Array<[ActionKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === 'csv') {
                downloadSelectedCsv(selectedRows);
                return;
              }
              setAction((prev) => (prev === key ? null : key));
            }}
            className={`${btnSecondary} ${action === key ? 'border-moss-500 text-sand-100' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {action === 'group' ? (
          <form action={groupAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <label className="block text-sm text-ink-200">
              Группа (оставьте пустым, чтобы очистить)
              <input name="group" className={fieldClass} />
            </label>
            <PendingButton label="Применить группу" pendingLabel="Сохранение…" className={btnPrimary} />
            <Message state={groupState} />
          </form>
        ) : null}

        {action === 'add_tags' ? (
          <form action={addTagsAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <label className="block text-sm text-ink-200">
              Теги через запятую
              <input name="tags" required className={fieldClass} placeholder="seo, content" />
            </label>
            <PendingButton label="Добавить теги" pendingLabel="Сохранение…" className={btnPrimary} />
            <Message state={addTagsState} />
          </form>
        ) : null}

        {action === 'remove_tags' ? (
          <form action={removeTagsAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <label className="block text-sm text-ink-200">
              Удалить теги через запятую
              <input name="tags" required className={fieldClass} />
            </label>
            <PendingButton label="Удалить теги" pendingLabel="Сохранение…" className={btnPrimary} />
            <Message state={removeTagsState} />
          </form>
        ) : null}

        {action === 'status' ? (
          <form action={statusAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <label className="block text-sm text-ink-200">
              Новый статус
              <select name="status" defaultValue="ACTIVE" className={fieldClass}>
                {BULK_EDITABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WEBSITE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <PendingButton label="Изменить статус" pendingLabel="Сохранение…" className={btnPrimary} />
            <Message state={statusState} />
          </form>
        ) : null}

        {action === 'stage' ? (
          <form action={stageAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <label className="block text-sm text-ink-200">
              Новый этап
              <select name="lifecycleStage" defaultValue="SETUP" className={fieldClass}>
                {BULK_EDITABLE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {LIFECYCLE_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </label>
            <PendingButton label="Изменить этап" pendingLabel="Сохранение…" className={btnPrimary} />
            <Message state={stageState} />
          </form>
        ) : null}

        {action === 'tasks' ? (
          <form action={tasksAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <p className="text-sm text-ink-200">Будет создано задач: {eligibleForTasks}</p>
            <label className="block text-sm text-ink-200">
              Название
              <input name="title" required maxLength={200} className={fieldClass} />
            </label>
            <label className="block text-sm text-ink-200">
              Описание
              <textarea name="description" rows={2} className={fieldClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-ink-200">
                Приоритет
                <select name="priority" defaultValue={TaskPriority.MEDIUM} className={fieldClass}>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-ink-200">
                Срок
                <input name="dueAt" type="date" className={fieldClass} />
              </label>
            </div>
            <PendingButton label="Создать задачи" pendingLabel="Создание…" className={btnPrimary} />
            <Message state={tasksState} />
          </form>
        ) : null}

        {action === 'work' ? (
          <form action={workAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <input type="hidden" name="bulkOperationId" value={bulkOperationId} />
            <label className="block text-sm text-ink-200">
              Название работы
              <input name="title" required maxLength={200} className={fieldClass} />
            </label>
            <label className="block text-sm text-ink-200">
              Описание
              <textarea name="description" rows={2} className={fieldClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-ink-200">
                Категория
                <select name="category" defaultValue="NOTE" className={fieldClass}>
                  {BULK_WORK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category === 'TECHNICAL'
                        ? 'Техническое'
                        : category === 'SEO'
                          ? 'SEO'
                          : category === 'CONTENT'
                            ? 'Контент'
                            : 'Заметка'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-ink-200">
                Дата
                <input
                  name="occurredAt"
                  type="date"
                  defaultValue={dateOnlyToInputValue(todayDateOnlyUtc())}
                  className={fieldClass}
                />
              </label>
            </div>
            <PendingButton label="Записать работу" pendingLabel="Сохранение…" className={btnPrimary} />
            <Message state={workState} />
          </form>
        ) : null}

        {action === 'archive' ? (
          <form action={archiveAction} className="space-y-3">
            <input type="hidden" name="websiteIds" value={websiteIdsJson} />
            <p className="text-sm text-red-700">
              Архивировать {selectedIds.length} сайтов? Отменить это действие через интерфейс пока
              нельзя.
            </p>
            <label className="block text-sm text-ink-200">
              Введите слово АРХИВИРОВАТЬ
              <input name="confirmation" required className={fieldClass} autoComplete="off" />
            </label>
            <PendingButton
              label="Архивировать"
              pendingLabel="Архивация…"
              className="rounded border border-red-500/50 px-3 py-2 text-sm text-red-700 hover:bg-red-500/10 disabled:opacity-60"
            />
            <Message state={archiveState} />
          </form>
        ) : null}

        {states.some((s) => s.error && !s.ok) && !action ? (
          <Message state={states.find((s) => s.error)!} />
        ) : null}
      </div>
    </div>
  );
}
