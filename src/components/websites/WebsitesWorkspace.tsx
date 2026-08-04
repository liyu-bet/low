'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import { WebsiteSections } from '@/components/websites/WebsiteSections';
import type {
  WebsiteWorkspaceClientRow,
  WebsiteWorkspaceRecommendation,
} from '@/components/websites/types';
import { WebsitesBulkPanel } from '@/components/WebsitesBulkPanel';
import type { WebsiteTableRow } from '@/components/WebsitesTable';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';
import {
  partitionWebsiteSections,
  sectionTotalCount,
  type PartitionMode,
} from '@/lib/websites/website-sections';

export type {
  WebsiteWorkspaceClientRow,
  WebsiteWorkspacePerformance,
  WebsiteWorkspaceRecommendation,
} from '@/components/websites/types';

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

export function WebsitesWorkspace({
  rows,
  groups,
  includeArchived,
  canManage = true,
  recommendations,
}: {
  rows: WebsiteWorkspaceClientRow[];
  groups: string[];
  includeArchived: boolean;
  canManage?: boolean;
  /** Reserved for future personalization; favorites are always scoped server-side to the session. */
  userId?: string;
  recommendations: WebsiteWorkspaceRecommendation[];
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
  const [notice, setNotice] = useState<string | null>(null);

  const hasActiveFilters = Boolean(
    deferredQuery.trim() || groupFilter || statusFilter || stageFilter,
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!matchesQuery(row, deferredQuery)) return false;
      if (groupFilter && row.group !== groupFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (stageFilter && row.lifecycleStage !== stageFilter) return false;
      return true;
    });
  }, [rows, deferredQuery, groupFilter, statusFilter, stageFilter]);

  const mode: PartitionMode = includeArchived
    ? 'archived'
    : hasActiveFilters
      ? 'search'
      : 'default';

  const recommendedIds = useMemo(
    () => new Set(recommendations.map((item) => item.websiteId)),
    [recommendations],
  );

  const sections = useMemo(() => {
    const partitioned = partitionWebsiteSections(filtered, recommendedIds, mode);
    if (mode === 'search') {
      return {
        ...partitioned,
        regular: [...partitioned.regular].sort((a, b) =>
          a.domain.localeCompare(b.domain, 'ru'),
        ),
      };
    }
    if (mode === 'default' && partitioned.recommendations.length > 1) {
      const rank = new Map(recommendations.map((item, index) => [item.websiteId, index]));
      return {
        ...partitioned,
        recommendations: [...partitioned.recommendations].sort(
          (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999),
        ),
      };
    }
    return partitioned;
  }, [filtered, recommendedIds, mode, recommendations]);

  const shownCount = sectionTotalCount(sections);

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

  function handleNotice(message: string) {
    setNotice(message);
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
        {canManage ? (
          <Link href="/websites/new" className="btn-primary shrink-0">
            Добавить сайт
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn-secondary shrink-0"
        >
          Фильтры
        </button>
        {canManage ? (
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
        ) : null}
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
              {(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as WebsiteStatus[]).map((s) => (
                <option key={s} value={s}>
                  {labelWebsiteStatus(s)}
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
        Показано {shownCount} из {rows.length}
      </p>

      {notice ? (
        <p className="rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2 text-sm text-ink-100" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <WebsiteSections
        mode={mode}
        favorites={sections.favorites}
        recommendations={sections.recommendations}
        regular={sections.regular}
        isAdmin={canManage}
        inlineTaskFor={inlineTaskFor}
        onToggleInline={(id) => setInlineTaskFor((current) => (current === id ? null : id))}
        bulkMode={bulkMode}
        selected={selected}
        onToggleSelect={toggleSelect}
        onNotice={handleNotice}
      />
    </div>
  );
}
