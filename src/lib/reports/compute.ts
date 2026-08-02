import type { LifecycleStage } from '@prisma/client';
import { daysBetweenUtc, todayDateOnlyUtc } from '@/lib/dates/date-only';
import { differenceInCalendarDays, summarizeDurations } from '@/lib/reports/math';
import {
  resolveEffectiveWebsiteDates,
  type FilterableWebsite,
} from '@/lib/reports/filters';
import type {
  DurationMetricRow,
  FunnelStep,
  GroupComparisonRow,
  GroupSortMode,
  MonthlyCohortRow,
  ReportSiteDurations,
  ReportWebsiteDates,
  StageCountRow,
  StuckCategory,
  StuckSitePreview,
} from '@/lib/reports/types';
import { LIFECYCLE_STAGE_LABELS } from '@/lib/ui/labels';

const STAGE_ORDER: LifecycleStage[] = [
  'IDEA',
  'SETUP',
  'LAUNCHED',
  'INDEXING',
  'GROWING',
  'MATURE',
  'DECLINING',
  'ARCHIVED',
];

export function computeSiteDurations(dates: ReportWebsiteDates): ReportSiteDurations {
  const pair = (from: Date | null, to: Date | null): number | null => {
    if (!from || !to) return null;
    const days = differenceInCalendarDays(from, to);
    return days;
  };

  return {
    launchToHealthy: pair(dates.launchedAt, dates.firstHealthyAt),
    launchToGsc: pair(dates.launchedAt, dates.gscAddedAt),
    launchToImpression: pair(dates.launchedAt, dates.firstImpressionAt),
    impressionToClick: pair(dates.firstImpressionAt, dates.firstClickAt),
    launchToClick: pair(dates.launchedAt, dates.firstClickAt),
  };
}

/** Positive durations only; negative contribute to anomaly count. */
export function collectPositiveDuration(
  value: number | null,
): { days: number | null; anomaly: boolean } {
  if (value == null) return { days: null, anomaly: false };
  if (value < 0) return { days: null, anomaly: true };
  return { days: value, anomaly: false };
}

export function countDateAnomalies(sites: FilterableWebsite[]): number {
  let count = 0;
  for (const site of sites) {
    const dates = resolveEffectiveWebsiteDates(site);
    const durations = computeSiteDurations(dates);
    for (const value of Object.values(durations)) {
      if (value != null && value < 0) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

export function buildLifecycleFunnel(sites: FilterableWebsite[]): FunnelStep[] {
  const total = sites.length;
  const datesList = sites.map((s) => resolveEffectiveWebsiteDates(s));

  const stepsDef: Array<{ key: string; label: string; test: (d: ReportWebsiteDates) => boolean }> = [
    { key: 'created', label: 'Созданы в LOW', test: () => true },
    { key: 'launched', label: 'Запущены', test: (d) => d.launchedAt != null },
    { key: 'healthy', label: 'Стали доступны', test: (d) => d.firstHealthyAt != null },
    { key: 'gsc', label: 'Добавлены в GSC', test: (d) => d.gscAddedAt != null },
    { key: 'impressions', label: 'Получили показы', test: (d) => d.firstImpressionAt != null },
    { key: 'clicks', label: 'Получили клики', test: (d) => d.firstClickAt != null },
  ];

  let previousCount = total;
  return stepsDef.map((step, index) => {
    const count = datesList.filter(step.test).length;
    const pctOfPrevious =
      index === 0 || previousCount === 0 ? null : Math.round((count / previousCount) * 1000) / 10;
    const pctOfTotal = total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
    const remaining = Math.max(0, total - count);
    const row: FunnelStep = {
      key: step.key,
      label: step.label,
      count,
      pctOfPrevious: index === 0 ? null : pctOfPrevious,
      pctOfTotal,
      remaining: index === 0 ? 0 : remaining,
    };
    previousCount = count;
    return row;
  });
}

export function buildDurationMetrics(sites: FilterableWebsite[]): DurationMetricRow[] {
  const buckets: Record<string, number[]> = {
    launch_to_healthy: [],
    launch_to_gsc: [],
    launch_to_impressions: [],
    impressions_to_click: [],
    launch_to_click: [],
  };

  for (const site of sites) {
    const durations = computeSiteDurations(resolveEffectiveWebsiteDates(site));
    const push = (key: string, value: number | null) => {
      const { days } = collectPositiveDuration(value);
      if (days != null) buckets[key]!.push(days);
    };
    push('launch_to_healthy', durations.launchToHealthy);
    push('launch_to_gsc', durations.launchToGsc);
    push('launch_to_impressions', durations.launchToImpression);
    push('impressions_to_click', durations.impressionToClick);
    push('launch_to_click', durations.launchToClick);
  }

  return [
    {
      key: 'launch_to_healthy',
      label: 'Запуск → healthy',
      summary: summarizeDurations(buckets.launch_to_healthy!),
    },
    {
      key: 'launch_to_gsc',
      label: 'Запуск → GSC',
      summary: summarizeDurations(buckets.launch_to_gsc!),
    },
    {
      key: 'launch_to_impressions',
      label: 'Запуск → первые показы',
      summary: summarizeDurations(buckets.launch_to_impressions!),
    },
    {
      key: 'impressions_to_click',
      label: 'Первые показы → первый клик',
      summary: summarizeDurations(buckets.impressions_to_click!),
    },
    {
      key: 'launch_to_click',
      label: 'Запуск → первый клик',
      summary: summarizeDurations(buckets.launch_to_click!),
    },
  ];
}

export function buildStageDistribution(
  sites: FilterableWebsite[],
  includeArchived: boolean,
): StageCountRow[] {
  const total = sites.length;
  const counts = new Map<LifecycleStage, number>();
  for (const stage of STAGE_ORDER) counts.set(stage, 0);
  for (const site of sites) {
    counts.set(site.lifecycleStage, (counts.get(site.lifecycleStage) ?? 0) + 1);
  }

  return STAGE_ORDER.filter((stage) => includeArchived || stage !== 'ARCHIVED')
    .map((stage) => {
      const count = counts.get(stage) ?? 0;
      return {
        stage,
        label: LIFECYCLE_STAGE_LABELS[stage],
        count,
        pct: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
        href: `/websites`,
      };
    })
    .filter((row) => includeArchived || row.stage !== 'ARCHIVED' || row.count > 0);
}

function monthKeyUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabelRu(key: string): string {
  const [ys, ms] = key.split('-');
  const date = new Date(Date.UTC(Number(ys), Number(ms) - 1, 1));
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Last 12 calendar months ending at `now` (inclusive current month). */
export function lastTwelveMonthKeys(now: Date = new Date()): string[] {
  const today = todayDateOnlyUtc(now);
  const keys: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    keys.push(monthKeyUtc(d));
  }
  return keys;
}

export function buildMonthlyCohorts(
  sites: FilterableWebsite[],
  now: Date = new Date(),
): MonthlyCohortRow[] {
  const keys = lastTwelveMonthKeys(now);
  const map = new Map<string, MonthlyCohortRow>();
  for (const key of keys) {
    map.set(key, {
      monthKey: key,
      label: monthLabelRu(key),
      launched: 0,
      gsc: 0,
      impressions: 0,
      clicks: 0,
    });
  }

  for (const site of sites) {
    const dates = resolveEffectiveWebsiteDates(site);
    if (dates.launchedAt) {
      const key = monthKeyUtc(dates.launchedAt);
      const row = map.get(key);
      if (row) row.launched += 1;
    }
    if (dates.gscAddedAt) {
      const key = monthKeyUtc(dates.gscAddedAt);
      const row = map.get(key);
      if (row) row.gsc += 1;
    }
    if (dates.firstImpressionAt) {
      const key = monthKeyUtc(dates.firstImpressionAt);
      const row = map.get(key);
      if (row) row.impressions += 1;
    }
    if (dates.firstClickAt) {
      const key = monthKeyUtc(dates.firstClickAt);
      const row = map.get(key);
      if (row) row.clicks += 1;
    }
  }

  return keys.map((key) => map.get(key)!);
}

export function buildGroupComparison(
  sites: FilterableWebsite[],
  options: {
    attentionIds: Set<string>;
    overdueByWebsite: Map<string, number>;
    sort: GroupSortMode;
  },
): GroupComparisonRow[] {
  type Acc = {
    sites: FilterableWebsite[];
    attention: number;
    overdue: number;
  };
  const groups = new Map<string, Acc>();

  for (const site of sites) {
    const key = site.group?.trim() ? site.group.trim() : '__none__';
    let acc = groups.get(key);
    if (!acc) {
      acc = { sites: [], attention: 0, overdue: 0 };
      groups.set(key, acc);
    }
    acc.sites.push(site);
    if (options.attentionIds.has(site.id)) acc.attention += 1;
    acc.overdue += options.overdueByWebsite.get(site.id) ?? 0;
  }

  const rows: GroupComparisonRow[] = [];
  for (const [groupKey, acc] of groups) {
    const total = acc.sites.length;
    let launched = 0;
    let gsc = 0;
    let impressions = 0;
    let clicks = 0;
    const launchToImp: number[] = [];
    const impToClick: number[] = [];

    for (const site of acc.sites) {
      const dates = resolveEffectiveWebsiteDates(site);
      const durations = computeSiteDurations(dates);
      if (dates.launchedAt) launched += 1;
      if (dates.gscAddedAt) gsc += 1;
      if (dates.firstImpressionAt) impressions += 1;
      if (dates.firstClickAt) clicks += 1;
      const a = collectPositiveDuration(durations.launchToImpression);
      if (a.days != null) launchToImp.push(a.days);
      const b = collectPositiveDuration(durations.impressionToClick);
      if (b.days != null) impToClick.push(b.days);
    }

    rows.push({
      groupKey,
      groupLabel: groupKey === '__none__' ? 'Без группы' : groupKey,
      total,
      launched,
      gsc,
      impressions,
      clicks,
      impressionsShare: total === 0 ? 0 : Math.round((impressions / total) * 1000) / 10,
      clicksShare: total === 0 ? 0 : Math.round((clicks / total) * 1000) / 10,
      medianLaunchToImpressions: summarizeDurations(launchToImp).median,
      medianImpressionsToClick: summarizeDurations(impToClick).median,
      needsAttention: acc.attention,
      overdueTasks: acc.overdue,
    });
  }

  rows.sort((a, b) => {
    switch (options.sort) {
      case 'impressions_share':
        if (b.impressionsShare !== a.impressionsShare) return b.impressionsShare - a.impressionsShare;
        break;
      case 'clicks_share':
        if (b.clicksShare !== a.clicksShare) return b.clicksShare - a.clicksShare;
        break;
      case 'speed_to_impressions': {
        const av = a.medianLaunchToImpressions;
        const bv = b.medianLaunchToImpressions;
        if (av == null && bv == null) break;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av !== bv) return av - bv;
        break;
      }
      case 'count':
      default:
        if (b.total !== a.total) return b.total - a.total;
        break;
    }
    return a.groupLabel.localeCompare(b.groupLabel, 'ru');
  });

  return rows;
}

function stageIndex(stage: LifecycleStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/** Minimum stage implied by achieved dates. */
export function expectedMinStage(dates: ReportWebsiteDates): LifecycleStage | null {
  if (dates.firstClickAt) return 'GROWING';
  if (dates.firstImpressionAt) return 'INDEXING';
  if (dates.gscAddedAt) return 'INDEXING';
  if (dates.launchedAt) return 'LAUNCHED';
  return null;
}

export function hasStageMismatch(
  stage: LifecycleStage,
  dates: ReportWebsiteDates,
): boolean {
  if (stage === 'ARCHIVED') return false;
  const expected = expectedMinStage(dates);
  if (!expected) return false;
  return stageIndex(stage) < stageIndex(expected);
}

export function buildStuckCategories(
  sites: FilterableWebsite[],
  options: {
    overdueByWebsite: Map<string, number>;
    now?: Date;
  },
): StuckCategory[] {
  const now = options.now ?? new Date();
  const today = todayDateOnlyUtc(now);

  const take = (
    key: StuckCategory['key'],
    label: string,
    showAllHref: string,
    matched: Array<{ site: FilterableWebsite; days: number }>,
  ): StuckCategory => {
    matched.sort((a, b) => b.days - a.days);
    const sitesPreview: StuckSitePreview[] = matched.slice(0, 10).map(({ site, days }) => ({
      websiteId: site.id,
      domain: site.domain,
      group: site.group,
      days,
      href: `/websites/${site.id}`,
    }));
    return {
      key,
      label,
      count: matched.length,
      sites: sitesPreview,
      showAllHref,
    };
  };

  const noGsc: Array<{ site: FilterableWebsite; days: number }> = [];
  const noImp: Array<{ site: FilterableWebsite; days: number }> = [];
  const noClick: Array<{ site: FilterableWebsite; days: number }> = [];
  const stale: Array<{ site: FilterableWebsite; days: number }> = [];
  const overdue: Array<{ site: FilterableWebsite; days: number }> = [];
  const mismatch: Array<{ site: FilterableWebsite; days: number }> = [];

  for (const site of sites) {
    const dates = resolveEffectiveWebsiteDates(site);
    if (dates.launchedAt && !dates.gscAddedAt) {
      const days = daysBetweenUtc(dates.launchedAt, today);
      if (days > 14) noGsc.push({ site, days });
    }
    if (dates.gscAddedAt && !dates.firstImpressionAt) {
      const days = daysBetweenUtc(dates.gscAddedAt, today);
      if (days > 14) noImp.push({ site, days });
    }
    if (dates.firstImpressionAt && !dates.firstClickAt) {
      const days = daysBetweenUtc(dates.firstImpressionAt, today);
      if (days > 30) noClick.push({ site, days });
    }
    const workRef = dates.lastWorkAt ?? dates.launchedAt;
    if (workRef) {
      const days = daysBetweenUtc(workRef, today);
      if (days > 30) stale.push({ site, days });
    }
    const overdueCount = options.overdueByWebsite.get(site.id) ?? 0;
    if (overdueCount > 0) overdue.push({ site, days: overdueCount });
    if (hasStageMismatch(site.lifecycleStage, dates)) {
      const days = dates.launchedAt ? daysBetweenUtc(dates.launchedAt, today) : 0;
      mismatch.push({ site, days });
    }
  }

  return [
    take('no_gsc', 'Запущены более 14 дней, но нет GSC', '/dashboard?focus=no_gsc', noGsc),
    take(
      'no_impressions',
      'GSC подключён более 14 дней, но нет показов',
      '/dashboard?focus=no_impressions',
      noImp,
    ),
    take(
      'no_clicks',
      'Показы более 30 дней, но нет кликов',
      '/dashboard?focus=no_clicks',
      noClick,
    ),
    take('stale_work', 'Нет работы более 30 дней', '/dashboard?focus=stale_work', stale),
    take('overdue_tasks', 'Есть просроченные задачи', '/tasks?focus=overdue', overdue),
    take(
      'stage_mismatch',
      'Этап не соответствует достигнутым датам',
      '/dashboard',
      mismatch,
    ),
  ];
}
