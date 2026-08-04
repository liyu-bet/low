'use client';

import Link from 'next/link';
import { QuickWebsiteTaskForm } from '@/components/tasks/QuickWebsiteTaskForm';
import { WebsiteCardActions } from '@/components/websites/WebsiteCardActions';
import { WebsiteFavoriteStar } from '@/components/websites/WebsiteFavoriteStar';
import { MilestoneProgressDots } from '@/components/websites/WebsiteMilestoneRail';
import {
  isRowArchived,
  type WebsiteCardVariant,
  type WebsiteWorkspaceClientRow,
  type WebsiteWorkspacePerformance,
} from '@/components/websites/types';
import { shouldShowWebsiteName } from '@/lib/auth/actor-label';
import { formatPerformanceDataDateLabel, formatPerformancePeriodLabel } from '@/lib/gsc/performance';
import { cn } from '@/lib/ui/cn';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';
import type { AvailabilityDot } from '@/lib/websites/workspace';

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

function PerformanceLine({
  performance,
  recommended,
}: {
  performance: WebsiteWorkspacePerformance;
  recommended?: boolean;
}) {
  if (recommended) {
    const dataLabel = formatPerformanceDataDateLabel(performance.dataDate);
    return (
      <div className="space-y-0.5 text-xs text-ink-200">
        <p>
          {performance.clicks} кликов · {performance.impressions} показов
        </p>
        {dataLabel ? <p>{dataLabel}</p> : null}
      </div>
    );
  }

  const label = formatPerformancePeriodLabel(performance);
  return (
    <p className="text-xs text-ink-200">
      {label}: показы {performance.impressions} · клики {performance.clicks}
    </p>
  );
}

export function WebsiteCard({
  row,
  isAdmin,
  inlineOpen,
  onToggleInline,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  variant = 'default',
  onNotice,
}: {
  row: WebsiteWorkspaceClientRow;
  isAdmin: boolean;
  inlineOpen: boolean;
  onToggleInline: () => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  variant?: WebsiteCardVariant;
  onNotice?: (message: string) => void;
}) {
  const archived = isRowArchived(row);
  const resolvedVariant: WebsiteCardVariant =
    variant === 'default' && row.isFavorite ? 'favorite' : variant;

  return (
    <li
      data-website-id={row.id}
      data-card-variant={resolvedVariant}
      className={cn(
        'rounded-[10px] border bg-white p-4',
        resolvedVariant === 'favorite' &&
          'border-l-4 border-l-amber-400 border-ink-700 bg-amber-50/30',
        resolvedVariant === 'recommended' && 'border-moss-500/35 bg-moss-50/35',
        resolvedVariant === 'default' && 'border-ink-700',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {bulkMode ? (
            <label className="inline-flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`Выбрать ${row.domain}`}
                className="h-4 w-4 shrink-0 accent-moss-500"
              />
              Выбрать
            </label>
          ) : null}

          {resolvedVariant === 'favorite' ? (
            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Избранное
            </span>
          ) : null}
          {resolvedVariant === 'recommended' ? (
            <span className="inline-block rounded-full bg-moss-100 px-2 py-0.5 text-[11px] font-medium text-moss-700">
              Рекомендуем
            </span>
          ) : null}

          <div className="flex min-w-0 items-start gap-2">
            <AvailabilityDotView value={row.availability} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/websites/${row.id}`}
                  aria-label={`Открыть профиль ${row.domain}`}
                  className="break-anywhere min-w-0 text-base font-semibold text-ink-50 hover:text-moss-700"
                >
                  {row.domain}
                </Link>
                <WebsiteFavoriteStar
                  websiteId={row.id}
                  isFavorite={row.isFavorite}
                  disabled={archived && !row.isFavorite}
                />
              </div>
              <p className="mt-0.5 text-xs text-ink-200">
                {labelWebsiteStatus(row.status)} · {labelLifecycleStage(row.lifecycleStage)}
                {row.group ? ` · ${row.group}` : ''}
              </p>
            </div>
          </div>

          {shouldShowWebsiteName({
            domain: row.domain,
            normalizedDomain: row.normalizedDomain,
            name: row.name,
          }) ? (
            <p className="text-sm text-ink-200">{row.name}</p>
          ) : null}

          <MilestoneProgressDots items={row.milestones} />

          {row.performance ? (
            <PerformanceLine
              performance={row.performance}
              recommended={resolvedVariant === 'recommended'}
            />
          ) : null}

          <p className="text-xs text-ink-200">
            {row.nearestTask
              ? `${row.nearestTask.title} (${row.nearestTask.dueRelative})`
              : row.openTasksCount > 0
                ? `Открытых задач: ${row.openTasksCount}`
                : 'Нет открытых задач'}
          </p>
        </div>

        <div className="shrink-0 sm:pt-0.5">
          <WebsiteCardActions
            row={row}
            archived={archived}
            isAdmin={isAdmin}
            inlineOpen={inlineOpen}
            onToggleInline={onToggleInline}
            onNotice={onNotice}
          />
        </div>
      </div>

      {inlineOpen ? (
        <div className="pt-3">
          <QuickWebsiteTaskForm websiteId={row.id} compact autoFocus onCancel={onToggleInline} />
        </div>
      ) : null}
    </li>
  );
}
