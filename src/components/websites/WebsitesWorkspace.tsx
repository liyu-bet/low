'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useActionState,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFormStatus } from 'react-dom';
import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import {
  archiveWebsiteFromListAction,
  restoreWebsiteFromListAction,
  type WebsiteListActionState,
} from '@/app/(app)/websites/actions';
import { preserveScroll } from '@/components/ui/ActionMenu';
import { QuickWebsiteTaskForm } from '@/components/tasks/QuickWebsiteTaskForm';
import { MilestoneProgressDots } from '@/components/websites/WebsiteMilestoneRail';
import { WebsiteFavoriteStar } from '@/components/websites/WebsiteFavoriteStar';
import { WebsitesBulkPanel } from '@/components/WebsitesBulkPanel';
import type { WebsiteTableRow } from '@/components/WebsitesTable';
import { formatPerformancePeriodLabel, type GscPerformancePeriod } from '@/lib/gsc/performance';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';
import { cn } from '@/lib/ui/cn';
import type { MilestoneRailItem } from '@/lib/websites/milestones';
import type { AvailabilityDot } from '@/lib/websites/workspace';
import { shouldShowWebsiteName } from '@/lib/auth/actor-label';

function IconOpen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M14 3h7v7M21 3l-9 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRestore({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 12a9 9 0 1 0 3-6.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3 4v5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type WebsiteWorkspacePerformance = {
  sourcePropertyId: string;
  sourceSiteUrl: string;
  period: GscPerformancePeriod;
  impressions: number;
  clicks: number;
  dataDate: string | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
};

export type WebsiteWorkspaceRecommendation = {
  websiteId: string;
  domain: string;
  clicks: number;
  impressions: number;
  period: GscPerformancePeriod;
  dataDate: string | null;
  periodLabel: string;
};

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
  isFavorite: boolean;
  favoriteCreatedAt: string | null;
  performance: WebsiteWorkspacePerformance | null;
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

function ConfirmSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-danger">
      {pending ? pendingLabel : label}
    </button>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  formAction,
  onCancel,
  error,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
  error?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onCancel();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm space-y-3 rounded-card border border-ink-700 bg-white p-4 shadow-card"
      >
        <h3 className="text-base font-semibold text-ink-50">{title}</h3>
        <p className="text-sm text-ink-200">{description}</p>
        <form action={formAction} className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Отмена
          </button>
          <ConfirmSubmit label={confirmLabel} pendingLabel={pendingLabel} />
        </form>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

function isRowArchived(row: WebsiteWorkspaceClientRow): boolean {
  return (
    row.archivedAt != null || row.status === 'ARCHIVED' || row.lifecycleStage === 'ARCHIVED'
  );
}

function RestoreIconSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={pending ? 'Возвращаем…' : 'Вернуть в LOW'}
      title="Вернуть в LOW"
      className="icon-btn text-moss-700 hover:border-moss-500 hover:bg-moss-50"
    >
      <IconRestore />
    </button>
  );
}

function SiteActions({
  row,
  archived,
  isAdmin,
  inlineOpen,
  onToggleInline,
}: {
  row: WebsiteWorkspaceClientRow;
  archived: boolean;
  isAdmin: boolean;
  inlineOpen: boolean;
  onToggleInline: () => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const archiveBound = archiveWebsiteFromListAction.bind(null, row.id);
  const restoreBound = restoreWebsiteFromListAction.bind(null, row.id);
  const [archiveState, archiveAction] = useActionState(
    archiveBound,
    {} as WebsiteListActionState,
  );
  const [restoreState, restoreAction] = useActionState(
    restoreBound,
    {} as WebsiteListActionState,
  );

  useEffect(() => {
    if (archiveState.ok) {
      setConfirmOpen(false);
      preserveScroll(() => router.refresh());
    }
  }, [archiveState, router]);

  useEffect(() => {
    if (restoreState.ok) {
      preserveScroll(() => router.refresh());
    }
  }, [restoreState, router]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/websites/${row.id}`}
          aria-label="Открыть"
          title="Открыть"
          className="icon-btn"
        >
          <IconOpen />
        </Link>
        {!archived ? (
          <button
            type="button"
            onClick={onToggleInline}
            aria-pressed={inlineOpen}
            aria-label={inlineOpen ? 'Скрыть форму задачи' : 'Добавить задачу'}
            title={inlineOpen ? 'Скрыть' : 'Добавить задачу'}
            className={cn(
              'icon-btn',
              inlineOpen
                ? 'border-moss-500 bg-moss-50 text-moss-700'
                : 'border-moss-500/40 bg-moss-500 text-white hover:bg-moss-600 hover:border-moss-600',
            )}
          >
            <IconPlus />
          </button>
        ) : null}
        {isAdmin ? (
          archived ? (
            <form action={restoreAction} className="inline-flex">
              <RestoreIconSubmit />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Убрать из LOW"
              title="Убрать из LOW"
              className="icon-btn text-red-700 hover:border-red-300 hover:bg-red-50"
            >
              <IconTrash />
            </button>
          )
        ) : null}
      </div>
      {restoreState.error ? (
        <p className="text-xs text-red-700" role="status">
          {restoreState.error}
        </p>
      ) : null}
      {confirmOpen ? (
        <ConfirmDialog
          title="Убрать сайт из LOW?"
          description={`«${row.domain}» будет перемещён в архив. Задачи и события сохранятся — сайт можно вернуть в любой момент.`}
          confirmLabel="Убрать из LOW"
          pendingLabel="Убираем…"
          formAction={archiveAction}
          onCancel={() => setConfirmOpen(false)}
          error={archiveState.error}
        />
      ) : null}
    </>
  );
}

function PerformanceLine({ performance }: { performance: WebsiteWorkspacePerformance }) {
  const label = formatPerformancePeriodLabel(performance);
  return (
    <p className="text-xs text-ink-200">
      {label}: показы {performance.impressions.toLocaleString('ru-RU')} · клики{' '}
      {performance.clicks.toLocaleString('ru-RU')}
    </p>
  );
}

function WebsiteCard({
  row,
  isAdmin,
  inlineOpen,
  onToggleInline,
  bulkMode = false,
  selected = false,
  onToggleSelect,
}: {
  row: WebsiteWorkspaceClientRow;
  isAdmin: boolean;
  inlineOpen: boolean;
  onToggleInline: () => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const archived = isRowArchived(row);
  return (
    <li
      className={cn(
        'rounded-[10px] border bg-white p-4',
        row.isFavorite ? 'border-l-4 border-l-amber-400 border-ink-700 bg-amber-50/30' : 'border-ink-700',
      )}
    >
      <div className="flex items-start gap-3">
        {bulkMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Выбрать ${row.domain}`}
            className="mt-2.5 h-4 w-4 shrink-0 accent-moss-500"
          />
        ) : null}
        <WebsiteFavoriteStar
          websiteId={row.id}
          isFavorite={row.isFavorite}
          disabled={archived && !row.isFavorite}
        />
        <div className="min-w-0 flex-1 space-y-2">
          {row.isFavorite ? (
            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Избранное
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <AvailabilityDotView value={row.availability} />
            <Link
              href={`/websites/${row.id}`}
              className="break-anywhere text-base font-semibold text-ink-50 hover:text-moss-700"
            >
              {row.domain}
            </Link>
            <span className="text-xs text-ink-200">
              {labelWebsiteStatus(row.status)} · {labelLifecycleStage(row.lifecycleStage)}
              {row.group ? ` · ${row.group}` : ''}
            </span>
          </div>
          {shouldShowWebsiteName({
            domain: row.domain,
            normalizedDomain: row.normalizedDomain,
            name: row.name,
          }) ? (
            <p className="text-sm text-ink-200">{row.name}</p>
          ) : null}
          <MilestoneProgressDots items={row.milestones} />
          {row.performance ? <PerformanceLine performance={row.performance} /> : null}
          <p className="text-xs text-ink-200">
            {row.nearestTask
              ? `${row.nearestTask.title} (${row.nearestTask.dueRelative})`
              : row.openTasksCount > 0
                ? `Открытых задач: ${row.openTasksCount}`
                : 'Нет открытых задач'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SiteActions
              row={row}
              archived={archived}
              isAdmin={isAdmin}
              inlineOpen={inlineOpen}
              onToggleInline={onToggleInline}
            />
          </div>
          {inlineOpen ? (
            <div className="pt-1">
              <QuickWebsiteTaskForm websiteId={row.id} compact autoFocus onCancel={onToggleInline} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function RecommendationCard({ item }: { item: WebsiteWorkspaceRecommendation }) {
  return (
    <li className="rounded-[10px] border border-moss-500/40 bg-moss-50/40 p-4">
      <div className="flex items-start gap-3">
        <WebsiteFavoriteStar websiteId={item.websiteId} isFavorite={false} />
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/websites/${item.websiteId}`}
            className="break-anywhere text-base font-semibold text-ink-50 hover:text-moss-700"
          >
            {item.domain}
          </Link>
          <p className="text-xs text-ink-200">{item.periodLabel}</p>
          <p className="text-sm text-ink-100">
            Показы: {item.impressions.toLocaleString('ru-RU')} · Клики:{' '}
            {item.clicks.toLocaleString('ru-RU')}
          </p>
        </div>
      </div>
    </li>
  );
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

  // Rows arrive favorites → recommended → rest from the server and filtering preserves that
  // relative order. Once a search/filter narrows the list the recommended bucket is hidden,
  // so the remainder falls back to a plain alphabetical order.
  const favoriteRows = useMemo(() => filtered.filter((row) => row.isFavorite), [filtered]);
  const recommendedIds = useMemo(
    () => new Set(recommendations.map((item) => item.websiteId)),
    [recommendations],
  );
  const otherRows = useMemo(() => {
    const rest = filtered.filter((row) => {
      if (row.isFavorite) return false;
      // When the recommendations bucket is visible, do not duplicate those sites below.
      if (!hasActiveFilters && !includeArchived && recommendedIds.has(row.id)) return false;
      return true;
    });
    if (!hasActiveFilters) return rest;
    return [...rest].sort((a, b) => a.domain.localeCompare(b.domain, 'ru'));
  }, [filtered, hasActiveFilters, includeArchived, recommendedIds]);

  const showRecommendations = !includeArchived && !hasActiveFilters && recommendations.length > 0;

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

      {favoriteRows.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
            Избранное · {favoriteRows.length}
          </h2>
          <ul className="space-y-3">
            {favoriteRows.map((row) => (
              <WebsiteCard
                key={row.id}
                row={row}
                isAdmin={canManage}
                inlineOpen={inlineTaskFor === row.id}
                onToggleInline={() =>
                  setInlineTaskFor((id) => (id === row.id ? null : row.id))
                }
                bulkMode={bulkMode}
                selected={selected.has(row.id)}
                onToggleSelect={() => toggleSelect(row.id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {showRecommendations ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
            Рекомендуем добавить
          </h2>
          <ul className="space-y-3">
            {recommendations.map((item) => (
              <RecommendationCard key={item.websiteId} item={item} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        {favoriteRows.length > 0 || showRecommendations ? (
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
            Все сайты
          </h2>
        ) : null}
        {otherRows.length === 0 && favoriteRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-200">Сайты не найдены.</p>
        ) : (
          <ul className="space-y-3">
            {otherRows.map((row) => (
              <WebsiteCard
                key={row.id}
                row={row}
                isAdmin={canManage}
                inlineOpen={inlineTaskFor === row.id}
                onToggleInline={() =>
                  setInlineTaskFor((id) => (id === row.id ? null : row.id))
                }
                bulkMode={bulkMode}
                selected={selected.has(row.id)}
                onToggleSelect={() => toggleSelect(row.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
