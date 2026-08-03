'use client';

import Link from 'next/link';
import { Fragment, useDeferredValue, useMemo, useState } from 'react';
import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import { QuickWebsiteTaskForm } from '@/components/tasks/QuickWebsiteTaskForm';
import { WebsiteMilestoneRail } from '@/components/websites/WebsiteMilestoneRail';
import { WebsitesBulkPanel } from '@/components/WebsitesBulkPanel';
import type { WebsiteTableRow } from '@/components/WebsitesTable';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';
import { cn } from '@/lib/ui/cn';
import type { MilestoneRailItem } from '@/lib/websites/milestones';
import type { AvailabilityDot } from '@/lib/websites/workspace';

export type WebsiteWorkspaceClientRow = {
  id: string;
  domain: string;
  name: string | null;
  primaryUrl: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
  tags: string[];
  archivedAt: string | null;
  availability: AvailabilityDot;
  milestones: MilestoneRailItem[];
  openTasksCount: number;
  nearestTask: { id: string; title: string; dueRelative: string } | null;
  // fields needed for bulk/csv compatibility
  normalizedDomain: string;
  launchedAt: string | null;
  launchedAtManual: string | null;
  firstHealthyAt: string | null;
  gscFirstSeenAt: string | null;
  gscAddedAtManual: string | null;
  firstImpressionAt: string | null;
  firstImpressionAtManual: string | null;
  firstClickAt: string | null;
  firstClickAtManual: string | null;
  lastWorkAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function AvailabilityDotView({ value }: { value: AvailabilityDot }) {
  const color =
    value === 'up' ? 'bg-moss-500' : value === 'down' ? 'bg-red-500' : 'bg-ink-400';
  const title =
    value === 'up' ? 'Работает' : value === 'down' ? 'Недоступен' : 'Нет данных';
  return (
    <span
      title={title}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', color)}
      aria-label={title}
    />
  );
}

function matchesQuery(row: WebsiteWorkspaceClientRow, query: string): boolean {
  if (!query) return true;
  const haystack = [row.domain, row.name ?? '', row.group ?? '', row.tags.join(' ')]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function SiteActions({
  row,
  inlineOpen,
  onToggleInline,
}: {
  row: WebsiteWorkspaceClientRow;
  inlineOpen: boolean;
  onToggleInline: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/websites/${row.id}`}
        className="rounded border border-ink-700 px-2.5 py-1.5 text-xs font-medium text-ink-100 hover:border-moss-500"
      >
        Открыть
      </Link>
      <button
        type="button"
        onClick={onToggleInline}
        className="rounded bg-moss-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-moss-600"
      >
        {inlineOpen ? 'Скрыть' : '+ Задача'}
      </button>
    </div>
  );
}

export function WebsitesWorkspace({
  rows,
  groups,
  includeArchived,
}: {
  rows: WebsiteWorkspaceClientRow[];
  groups: string[];
  includeArchived: boolean;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [inlineTaskFor, setInlineTaskFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!matchesQuery(row, deferredQuery)) return false;
      if (groupFilter && row.group !== groupFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (stageFilter && row.lifecycleStage !== stageFilter) return false;
      return true;
    });
  }, [rows, deferredQuery, groupFilter, statusFilter, stageFilter]);

  const websitesById = useMemo(() => {
    const map = new Map<string, WebsiteTableRow>();
    for (const row of rows) {
      map.set(row.id, row as unknown as WebsiteTableRow);
    }
    return map;
  }, [rows]);

  const selectedIds = useMemo(() => [...selected], [selected]);

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по домену, названию, группе, тегам…"
          className="min-w-0 flex-1 rounded-lg border-2 border-ink-600 bg-white px-4 py-3 text-base text-ink-50 placeholder:text-ink-200 focus:border-moss-500 focus:outline-none sm:min-w-[16rem]"
        />
        <Link href="/websites/new" className="btn-primary shrink-0">
          Добавить сайт
        </Link>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn-secondary shrink-0"
        >
          Фильтры
        </button>
        <button
          type="button"
          onClick={() => {
            setBulkMode((v) => !v);
            setSelected(new Set());
          }}
          className="btn-secondary shrink-0"
        >
          {bulkMode ? 'Отмена выбора' : 'Выбрать'}
        </button>
      </div>

      {filtersOpen ? (
        <div className="flex flex-wrap gap-3 rounded-card border border-ink-700 bg-white p-3">
          <label className="text-sm text-ink-200">
            Группа
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="ml-2 rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
            >
              <option value="">Все</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-200">
            Статус
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ml-2 rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
            >
              <option value="">Все</option>
              {Object.entries(
                Object.fromEntries(
                  (['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as WebsiteStatus[]).map((s) => [
                    s,
                    labelWebsiteStatus(s),
                  ]),
                ),
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-200">
            Этап
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="ml-2 rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
            >
              <option value="">Все</option>
              {(
                [
                  'IDEA',
                  'SETUP',
                  'LAUNCHED',
                  'INDEXING',
                  'GROWING',
                  'MATURE',
                  'DECLINING',
                  'ARCHIVED',
                ] as LifecycleStage[]
              ).map((s) => (
                <option key={s} value={s}>
                  {labelLifecycleStage(s)}
                </option>
              ))}
            </select>
          </label>
          <Link
            href={includeArchived ? '/websites' : '/websites?archived=1'}
            className="self-end text-sm text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline"
          >
            {includeArchived ? 'Скрыть архив' : 'Показать архив'}
          </Link>
        </div>
      ) : null}

      {bulkMode ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selected.size === filtered.length}
              onChange={toggleAll}
            />
            Выбрано: {selected.size}
          </label>
          {selectedIds.length > 0 ? (
            <WebsitesBulkPanel
              selectedIds={selectedIds}
              websitesById={websitesById}
              onClearSelection={clearSelection}
              onSuccessClear={clearSelection}
            />
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-ink-200">
        Показано {filtered.length} из {rows.length}
      </p>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <li key={row.id} className="rounded-card border border-ink-700 bg-white p-4">
            <div className="flex items-start gap-2">
              {bulkMode ? (
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggleSelect(row.id)}
                  className="mt-1"
                />
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <AvailabilityDotView value={row.availability} />
                  <Link
                    href={`/websites/${row.id}`}
                    className="truncate text-base font-semibold text-ink-50 hover:text-moss-700"
                  >
                    {row.domain}
                  </Link>
                </div>
                {row.name ? <p className="text-sm text-ink-200">{row.name}</p> : null}
                <p className="text-xs text-ink-200">
                  {row.group ? `${row.group} · ` : ''}
                  {labelLifecycleStage(row.lifecycleStage)}
                </p>
                <WebsiteMilestoneRail items={row.milestones} />
                <p className="text-xs text-ink-200">
                  Открытых задач: {row.openTasksCount}
                  {row.nearestTask ? ` · ${row.nearestTask.title} (${row.nearestTask.dueRelative})` : ''}
                </p>
                <SiteActions
                  row={row}
                  inlineOpen={inlineTaskFor === row.id}
                  onToggleInline={() =>
                    setInlineTaskFor((id) => (id === row.id ? null : row.id))
                  }
                />
                {inlineTaskFor === row.id ? (
                  <div className="pt-1">
                    <QuickWebsiteTaskForm
                      websiteId={row.id}
                      compact
                      autoFocus
                      onCancel={() => setInlineTaskFor(null)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table-like list */}
      <div className="hidden overflow-x-auto rounded-card border border-ink-700 md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-ink-700 bg-ink-950/40 text-xs uppercase tracking-wide text-ink-200">
            <tr>
              {bulkMode ? <th className="w-10 px-3 py-2" /> : null}
              <th className="px-3 py-2 font-medium">Сайт</th>
              <th className="px-3 py-2 font-medium">Этап</th>
              <th className="min-w-[16rem] px-3 py-2 font-medium">Путь</th>
              <th className="px-3 py-2 font-medium">Задачи</th>
              <th className="px-3 py-2 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Fragment key={row.id}>
                <tr className="border-b border-ink-800/80 align-top">
                  {bulkMode ? (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <AvailabilityDotView value={row.availability} />
                      <div className="min-w-0">
                        <Link
                          href={`/websites/${row.id}`}
                          className="font-semibold text-ink-50 hover:text-moss-700"
                        >
                          {row.domain}
                        </Link>
                        {row.name ? (
                          <p className="truncate text-xs text-ink-200">{row.name}</p>
                        ) : null}
                        {row.group ? (
                          <p className="text-xs text-ink-200">{row.group}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-ink-100">
                    {labelLifecycleStage(row.lifecycleStage)}
                  </td>
                  <td className="px-3 py-3">
                    <WebsiteMilestoneRail items={row.milestones} />
                  </td>
                  <td className="px-3 py-3 text-ink-200">
                    <p className="font-medium text-ink-100">{row.openTasksCount}</p>
                    {row.nearestTask ? (
                      <p className="mt-0.5 line-clamp-2 text-xs">
                        {row.nearestTask.title}
                        <span className="text-ink-200"> · {row.nearestTask.dueRelative}</span>
                      </p>
                    ) : (
                      <p className="text-xs">Нет открытых</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <SiteActions
                      row={row}
                      inlineOpen={inlineTaskFor === row.id}
                      onToggleInline={() =>
                        setInlineTaskFor((id) => (id === row.id ? null : row.id))
                      }
                    />
                  </td>
                </tr>
                {inlineTaskFor === row.id ? (
                  <tr className="border-b border-ink-800/80 bg-ink-950/20">
                    <td colSpan={bulkMode ? 6 : 5} className="px-3 py-3">
                      <QuickWebsiteTaskForm
                        websiteId={row.id}
                        compact
                        autoFocus
                        onCancel={() => setInlineTaskFor(null)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-200">Сайты не найдены.</p>
      ) : null}
    </div>
  );
}
