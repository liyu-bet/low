import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import { DateOnlyError, parseDateOnly, todayDateOnlyUtc } from '@/lib/dates/date-only';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveGscAddedDate,
  getEffectiveLaunchDate,
  type EffectiveDateFields,
} from '@/lib/dates/effective';
import type {
  GroupSortMode,
  LaunchPeriodPreset,
  ReportWebsiteDates,
  ReportsFilters,
} from '@/lib/reports/types';
import { LIFECYCLE_STAGE_LABELS, WEBSITE_STATUS_LABELS } from '@/lib/ui/labels';

const PERIODS = new Set<LaunchPeriodPreset>(['30', '90', 'year', 'prev_year', 'all', 'custom']);
const GROUP_SORTS = new Set<GroupSortMode>([
  'count',
  'impressions_share',
  'clicks_share',
  'speed_to_impressions',
]);

function rawParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function parseReportsFilters(
  searchParams: Record<string, string | string[] | undefined> = {},
): ReportsFilters {
  const periodRaw = rawParam(searchParams, 'period');
  const groupSortRaw = rawParam(searchParams, 'groupSort');
  const status = rawParam(searchParams, 'status');
  const stage = rawParam(searchParams, 'stage');
  const archived = rawParam(searchParams, 'archived');

  return {
    period: PERIODS.has(periodRaw as LaunchPeriodPreset)
      ? (periodRaw as LaunchPeriodPreset)
      : 'all',
    from: rawParam(searchParams, 'from'),
    to: rawParam(searchParams, 'to'),
    group: rawParam(searchParams, 'group'),
    status: status in WEBSITE_STATUS_LABELS ? status : '',
    stage: stage in LIFECYCLE_STAGE_LABELS ? stage : '',
    includeArchived: archived === '1' || archived === 'true',
    groupSort: GROUP_SORTS.has(groupSortRaw as GroupSortMode)
      ? (groupSortRaw as GroupSortMode)
      : 'count',
  };
}

export function buildReportsQuery(filters: ReportsFilters): string {
  const params = new URLSearchParams();
  if (filters.period !== 'all') params.set('period', filters.period);
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.group) params.set('group', filters.group);
  if (filters.status) params.set('status', filters.status);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.includeArchived) params.set('archived', '1');
  if (filters.groupSort !== 'count') params.set('groupSort', filters.groupSort);
  const qs = params.toString();
  return qs ? `/reports?${qs}` : '/reports';
}

export function buildReportsExportHref(filters: ReportsFilters): string {
  const page = buildReportsQuery(filters);
  return page.replace('/reports', '/reports/export');
}

export type LaunchPeriodRange = {
  from: Date | null;
  to: Date | null;
};

/** Inclusive UTC date-only range for launch-period filter. null/null = all time. */
export function resolveLaunchPeriodRange(
  filters: ReportsFilters,
  now: Date = new Date(),
): LaunchPeriodRange {
  const today = todayDateOnlyUtc(now);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();

  switch (filters.period) {
    case '30': {
      const from = new Date(Date.UTC(y, m, d - 29));
      return { from, to: today };
    }
    case '90': {
      const from = new Date(Date.UTC(y, m, d - 89));
      return { from, to: today };
    }
    case 'year':
      return { from: new Date(Date.UTC(y, 0, 1)), to: today };
    case 'prev_year':
      return {
        from: new Date(Date.UTC(y - 1, 0, 1)),
        to: new Date(Date.UTC(y - 1, 11, 31)),
      };
    case 'custom': {
      let from: Date | null = null;
      let to: Date | null = null;
      try {
        if (filters.from.trim()) from = parseDateOnly(filters.from);
      } catch (error) {
        if (!(error instanceof DateOnlyError)) throw error;
      }
      try {
        if (filters.to.trim()) to = parseDateOnly(filters.to);
      } catch (error) {
        if (!(error instanceof DateOnlyError)) throw error;
      }
      return { from, to };
    }
    case 'all':
    default:
      return { from: null, to: null };
  }
}

export function isDateInInclusiveRange(
  date: Date,
  range: LaunchPeriodRange,
): boolean {
  const t = date.getTime();
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t > range.to.getTime()) return false;
  return true;
}

export function resolveEffectiveWebsiteDates(
  values: EffectiveDateFields & {
    firstHealthyAt?: Date | null;
    lastWorkAt?: Date | null;
    createdAt: Date;
  },
): ReportWebsiteDates {
  return {
    launchedAt: getEffectiveLaunchDate(values),
    firstHealthyAt: values.firstHealthyAt ?? null,
    gscAddedAt: getEffectiveGscAddedDate(values),
    firstImpressionAt: getEffectiveFirstImpressionDate(values),
    firstClickAt: getEffectiveFirstClickDate(values),
    lastWorkAt: values.lastWorkAt ?? null,
    createdAt: values.createdAt,
  };
}

export type FilterableWebsite = EffectiveDateFields & {
  id: string;
  domain: string;
  name?: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
  archivedAt: Date | null;
  firstHealthyAt?: Date | null;
  lastWorkAt?: Date | null;
  createdAt: Date;
};

export function isArchivedSite(site: {
  archivedAt: Date | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
}): boolean {
  return Boolean(
    site.archivedAt || site.status === 'ARCHIVED' || site.lifecycleStage === 'ARCHIVED',
  );
}

/**
 * Apply report filters in memory (after one DB load).
 * Launch period uses effective launch date; sites without launch are excluded
 * when a concrete period range is active.
 */
export function applyReportFilters<T extends FilterableWebsite>(
  websites: T[],
  filters: ReportsFilters,
  now: Date = new Date(),
): T[] {
  const range = resolveLaunchPeriodRange(filters, now);
  const periodActive = range.from != null || range.to != null;

  return websites.filter((site) => {
    if (!filters.includeArchived && isArchivedSite(site)) return false;
    if (filters.group) {
      if (filters.group === '__none__') {
        if (site.group?.trim()) return false;
      } else if ((site.group ?? '') !== filters.group) {
        return false;
      }
    }
    if (filters.status && site.status !== filters.status) return false;
    if (filters.stage && site.lifecycleStage !== filters.stage) return false;

    if (periodActive) {
      const launch = getEffectiveLaunchDate(site);
      if (!launch) return false;
      if (!isDateInInclusiveRange(launch, range)) return false;
    }

    return true;
  });
}
