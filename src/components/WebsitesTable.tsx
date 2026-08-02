'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
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
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
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
  return <span className="ml-1 text-moss-400">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function WebsitesTable({ websites }: { websites: WebsiteTableRow[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'updatedAt' ? 'desc' : 'asc');
  }

  if (websites.length === 0) {
    return (
      <p className="rounded border border-dashed border-ink-700 px-4 py-10 text-center text-ink-200">
        Сайтов пока нет. Добавьте первый домен, чтобы начать журнал.
      </p>
    );
  }

  return (
    <div className="space-y-3">
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
          className="w-full max-w-md rounded border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-400 focus:border-moss-500 focus:outline-none"
        />
        <span className="text-sm text-ink-200">
          {filteredSorted.length === websites.length
            ? `${websites.length}`
            : `${filteredSorted.length} из ${websites.length}`}
        </span>
      </div>

      {filteredSorted.length === 0 ? (
        <p className="rounded border border-dashed border-ink-700 px-4 py-8 text-center text-ink-200">
          Ничего не найдено по запросу «{query.trim()}».
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-ink-700/70">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-900/80 text-ink-200">
              <tr>
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
              {filteredSorted.map((site) => (
                <tr key={site.id} className="border-t border-ink-700/50 hover:bg-ink-900/40">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
