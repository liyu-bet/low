'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import { WebsitesBulkPanel } from '@/components/WebsitesBulkPanel';
import {
  formatDateRu,
  labelLifecycleStage,
  labelWebsiteStatus,
} from '@/lib/ui/labels';

export type WebsiteTableRow = {
  id: string;
  domain: string;
  normalizedDomain: string;
  name: string | null;
  primaryUrl: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
  tags: string[];
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
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SortKey = 'domain' | 'name' | 'status' | 'lifecycleStage' | 'group' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'domain', label: 'Домен' },
  { key: 'name', label: 'Название' },
  { key: 'status', label: 'Статус' },
  { key: 'lifecycleStage', label: 'Этап' },
  { key: 'group', label: 'Группа' },
  { key: 'updatedAt', label: 'Обновлён' },
];

function sortValue(row: WebsiteTableRow, key: SortKey): string | number {
  switch (key) {
    case 'domain':
      return row.normalizedDomain.toLowerCase();
    case 'name':
      return (row.name ?? '').toLowerCase();
    case 'status':
      return labelWebsiteStatus(row.status).toLowerCase();
    case 'lifecycleStage':
      return labelLifecycleStage(row.lifecycleStage).toLowerCase();
    case 'group':
      return (row.group ?? '').toLowerCase();
    case 'updatedAt':
      return new Date(row.updatedAt).getTime();
  }
}

function matchesQuery(row: WebsiteTableRow, query: string): boolean {
  if (!query) return true;
  const haystack = [
    row.domain,
    row.normalizedDomain,
    row.name ?? '',
    row.group ?? '',
    row.tags.join(' '),
    labelWebsiteStatus(row.status),
    labelLifecycleStage(row.lifecycleStage),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((token) => haystack.includes(token));
}

function SortMark({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <span className="ml-1 text-ink-700">↕</span>;
  }
  return <span className="ml-1 text-moss-600">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function WebsitesTable({ websites }: { websites: WebsiteTableRow[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const websitesById = useMemo(() => {
    const map = new Map<string, WebsiteTableRow>();
    for (const row of websites) map.set(row.id, row);
    return map;
  }, [websites]);

  const filteredSorted = useMemo(() => {
    const filtered = websites.filter((row) => matchesQuery(row, deferredQuery));
    const multiplier = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * multiplier;
      if (av > bv) return 1 * multiplier;
      return a.normalizedDomain.localeCompare(b.normalizedDomain) * multiplier;
    });
  }, [websites, deferredQuery, sortKey, sortDir]);

  const visibleIds = useMemo(() => filteredSorted.map((row) => row.id), [filteredSorted]);
  const selectedVisibleCount = selectedIds.filter((id) => visibleIds.includes(id)).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const hiddenSelectedCount = selectedIds.filter((id) => !visibleIds.includes(id)).length;

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'updatedAt' ? 'desc' : 'asc');
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function pruneHiddenFromSelection() {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }

  if (websites.length === 0) {
    return (
      <p className="rounded border border-dashed border-ink-700 px-4 py-10 text-center text-ink-200">
        Сайтов пока нет. Добавьте первый домен, чтобы начать журнал.
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-28">
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="websites-search">
          Поиск сайтов
        </label>
        <input
          id="websites-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по домену, названию, группе…"
          autoComplete="off"
          className="w-full max-w-md rounded border border-ink-700 bg-white px-3 py-2 text-sm text-ink-50 placeholder:text-ink-400 focus:border-moss-500 focus:outline-none"
        />
        <span className="text-sm text-ink-200">
          {filteredSorted.length === websites.length
            ? `${websites.length}`
            : `${filteredSorted.length} из ${websites.length}`}
        </span>
        {selectedIds.length > 0 ? (
          <span className="text-sm text-sand-100">Выбрано: {selectedIds.length}</span>
        ) : null}
        {selectedIds.length > 0 ? (
          <button
            type="button"
            onClick={clearSelection}
            className="rounded border border-ink-700 px-2.5 py-1.5 text-sm text-ink-100 hover:border-moss-500"
          >
            Снять выделение
          </button>
        ) : null}
        {hiddenSelectedCount > 0 ? (
          <button
            type="button"
            onClick={pruneHiddenFromSelection}
            className="rounded border border-ink-700 px-2.5 py-1.5 text-sm text-ink-200 hover:border-moss-500"
          >
            Убрать скрытые фильтром ({hiddenSelectedCount})
          </button>
        ) : null}
      </div>

      {filteredSorted.length === 0 ? (
        <p className="rounded border border-dashed border-ink-700 px-4 py-8 text-center text-ink-200">
          Ничего не найдено по запросу «{query.trim()}».
        </p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {filteredSorted.map((site) => {
              const selected = selectedIds.includes(site.id);
              return (
                <li
                  key={site.id}
                  className={`rounded border border-ink-700 bg-white p-3 ${
                    selected ? 'border-moss-600/60 bg-moss-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleOne(site.id)}
                      aria-label={`Выбрать ${site.domain}`}
                      className="mt-1 h-4 w-4 accent-moss-500"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/websites/${site.id}`}
                        className="break-all font-medium text-sand-100 hover:underline"
                      >
                        {site.domain}
                      </Link>
                      <div className="mt-1 text-sm text-ink-100">{site.name ?? '—'}</div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-200">
                        <span>{labelWebsiteStatus(site.status)}</span>
                        <span>{labelLifecycleStage(site.lifecycleStage)}</span>
                        <span>{site.group ?? 'Без группы'}</span>
                        <span>{formatDateRu(new Date(site.updatedAt))}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto rounded border border-ink-700 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink-900 text-ink-200">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="Выбрать все показанные"
                        className="h-4 w-4 accent-moss-500"
                      />
                      <span className="sr-only">Выбрать все показанные</span>
                    </label>
                  </th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className="inline-flex items-center hover:text-sand-100"
                      >
                        {column.label}
                        <SortMark active={sortKey === column.key} dir={sortDir} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((site) => {
                  const selected = selectedIds.includes(site.id);
                  return (
                    <tr
                      key={site.id}
                      className={`border-t border-ink-700 hover:bg-ink-900 ${
                        selected ? 'bg-moss-50' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOne(site.id)}
                          aria-label={`Выбрать ${site.domain}`}
                          className="h-4 w-4 accent-moss-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/websites/${site.id}`}
                          className="font-medium text-sand-100 hover:underline"
                        >
                          {site.domain}
                        </Link>
                        <div className="text-xs text-ink-200">{site.normalizedDomain}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-100">{site.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-100">{labelWebsiteStatus(site.status)}</td>
                      <td className="px-4 py-3 text-ink-100">
                        {labelLifecycleStage(site.lifecycleStage)}
                      </td>
                      <td className="px-4 py-3 text-ink-100">{site.group ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-200">
                        {formatDateRu(new Date(site.updatedAt))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <WebsitesBulkPanel
        selectedIds={selectedIds}
        websitesById={websitesById}
        onClearSelection={clearSelection}
        onSuccessClear={clearSelection}
      />
    </div>
  );
}
