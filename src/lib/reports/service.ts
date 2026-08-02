import {
  IntegrationSystem,
  type EventCategory,
  type EventSource,
  type TaskPriority,
  type TaskStatus,
} from '@prisma/client';
import { EVENT_TYPE_TASK_COMPLETED, GSC_LIFECYCLE_SYNC_JOB_TYPE } from '@/lib/constants';
import {
  evaluateWebsiteAttention,
  parseLifecycleErrorPropertyIds,
} from '@/lib/dashboard/attention';
import type { AttentionIntegrationInput, AttentionWebsiteInput } from '@/lib/dashboard/types';
import { prisma } from '@/lib/db/prisma';
import { parseDsdExternalSnapshot } from '@/lib/dsd/snapshot';
import { daysBetweenUtc } from '@/lib/dates/date-only';
import {
  buildDurationMetrics,
  buildGroupComparison,
  buildLifecycleFunnel,
  buildMonthlyCohorts,
  buildStageDistribution,
  buildStuckCategories,
  computeSiteDurations,
  countDateAnomalies,
  lastTwelveMonthKeys,
} from '@/lib/reports/compute';
import {
  applyReportFilters,
  buildReportsExportHref,
  parseReportsFilters,
  resolveEffectiveWebsiteDates,
} from '@/lib/reports/filters';
import { summarizeDurations } from '@/lib/reports/math';
import {
  buildLifecycleReportCsv,
  REPORT_CSV_MAX_SITES,
  reportCsvFilename,
} from '@/lib/reports/csv';
import type {
  ReportCsvSite,
  ReportsData,
  ReportsSummary,
  TaskReportSummary,
  WorkActivityMonth,
} from '@/lib/reports/types';
import { classifyTaskDue, isOpenTaskStatus } from '@/lib/tasks/classify';

type LoadedWebsite = AttentionWebsiteInput & {
  domain: string;
  name: string | null;
  gscFirstSeenAt: Date | null;
  gscAddedAtManual: Date | null;
  createdAt: Date;
  primaryUrl: string | null;
  integrations: Array<{
    system: IntegrationSystem;
    status: string;
    syncError: string | null;
    externalEntityId: string | null;
    externalData: unknown;
  }>;
};

function monthKeyUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabelRu(key: string): string {
  const [ys, ms] = key.split('-');
  const date = new Date(Date.UTC(Number(ys), Number(ms) - 1, 1));
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function buildIntegrationInput(
  website: LoadedWebsite,
  lifecycleErrorIds: Set<string>,
): AttentionIntegrationInput {
  const dsd = website.integrations.find((i) => i.system === IntegrationSystem.DSD) ?? null;
  const gscList = website.integrations.filter((i) => i.system === IntegrationSystem.GSC);
  const snapshot = dsd ? parseDsdExternalSnapshot(dsd.externalData) : null;

  return {
    dsdStatus: dsd?.status ?? null,
    dsdSyncError: dsd?.syncError ?? null,
    dsdSnapshot: snapshot,
    hasGscLinked: gscList.some((g) => g.status === 'LINKED'),
    hasGscError: gscList.some((g) => g.status === 'ERROR'),
    gscStatuses: gscList.map((g) => g.status),
    hasLifecycleError: gscList.some(
      (g) => g.externalEntityId != null && lifecycleErrorIds.has(g.externalEntityId),
    ),
  };
}

async function loadLifecycleErrorIds(): Promise<Set<string>> {
  const run = await prisma.syncRun.findFirst({
    where: { jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE },
    orderBy: { startedAt: 'desc' },
    select: { metadata: true },
  });
  return parseLifecycleErrorPropertyIds(run?.metadata);
}

function emptyActivityMonths(now: Date): WorkActivityMonth[] {
  return lastTwelveMonthKeys(now).map((monthKey) => ({
    monthKey,
    label: monthLabelRu(monthKey),
    manual: 0,
    taskCompleted: 0,
    technical: 0,
    seo: 0,
    content: 0,
    notes: 0,
    automatic: 0,
    sitesWorked: 0,
  }));
}

function aggregateActivity(
  events: Array<{
    occurredAt: Date;
    category: EventCategory;
    source: EventSource;
    eventType: string;
    websiteId: string;
  }>,
  now: Date,
): WorkActivityMonth[] {
  const months = emptyActivityMonths(now);
  const byKey = new Map(months.map((m) => [m.monthKey, m]));
  const sitesByMonth = new Map<string, Set<string>>();

  for (const event of events) {
    const key = monthKeyUtc(event.occurredAt);
    const row = byKey.get(key);
    if (!row) continue;

    const isAuto = event.source === 'DSD' || event.source === 'GSC';
    if (isAuto) {
      row.automatic += 1;
      continue;
    }

    if (event.eventType === EVENT_TYPE_TASK_COMPLETED) {
      row.taskCompleted += 1;
    } else if (event.source === 'MANUAL') {
      row.manual += 1;
    }

    if (event.category === 'TECHNICAL') row.technical += 1;
    else if (event.category === 'SEO') row.seo += 1;
    else if (event.category === 'CONTENT') row.content += 1;
    else if (event.category === 'NOTE') row.notes += 1;

    let set = sitesByMonth.get(key);
    if (!set) {
      set = new Set();
      sitesByMonth.set(key, set);
    }
    set.add(event.websiteId);
  }

  for (const [key, set] of sitesByMonth) {
    const row = byKey.get(key);
    if (row) row.sitesWorked = set.size;
  }

  return months;
}

function buildTaskReport(
  tasks: Array<{
    status: TaskStatus;
    dueAt: Date | null;
    createdAt: Date;
    completedAt: Date | null;
    websiteId: string;
  }>,
  filteredIds: Set<string>,
  now: Date,
): TaskReportSummary {
  const relevant = tasks.filter((t) => filteredIds.has(t.websiteId));
  let open = 0;
  let inProgress = 0;
  let overdue = 0;
  let doneLast30Days = 0;
  const completionDays: number[] = [];
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const task of relevant) {
    if (isOpenTaskStatus(task.status)) {
      open += 1;
      if (task.status === 'IN_PROGRESS') inProgress += 1;
      if (classifyTaskDue(task.dueAt, now) === 'overdue') overdue += 1;
    }
    if (task.status === 'DONE' && task.completedAt && task.completedAt >= since) {
      doneLast30Days += 1;
    }
    if (task.status === 'DONE' && task.completedAt) {
      const days = daysBetweenUtc(task.createdAt, task.completedAt);
      if (days >= 0) completionDays.push(days);
    }
  }

  const summary = summarizeDurations(completionDays);
  return {
    open,
    inProgress,
    overdue,
    doneLast30Days,
    meanCompletionDays: summary.mean,
    medianCompletionDays: summary.median,
  };
}

export async function getReportsData(
  searchParams: Record<string, string | string[] | undefined> = {},
  now: Date = new Date(),
): Promise<ReportsData> {
  const filters = parseReportsFilters(searchParams);

  const twelveMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );

  const [websites, openTasks, doneTasks, activityEvents, lifecycleErrorIds] = await Promise.all([
    prisma.website.findMany({
      select: {
        id: true,
        domain: true,
        name: true,
        status: true,
        lifecycleStage: true,
        group: true,
        archivedAt: true,
        launchedAt: true,
        launchedAtManual: true,
        firstHealthyAt: true,
        gscFirstSeenAt: true,
        gscAddedAtManual: true,
        firstImpressionAt: true,
        firstImpressionAtManual: true,
        firstClickAt: true,
        firstClickAtManual: true,
        lastWorkAt: true,
        createdAt: true,
        primaryUrl: true,
        integrations: {
          select: {
            system: true,
            status: true,
            syncError: true,
            externalEntityId: true,
            externalData: true,
          },
        },
      },
      orderBy: { domain: 'asc' },
    }),
    prisma.websiteTask.findMany({
      where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: {
        id: true,
        websiteId: true,
        status: true,
        priority: true,
        dueAt: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.websiteTask.findMany({
      where: {
        status: 'DONE',
        completedAt: { not: null },
      },
      select: {
        websiteId: true,
        status: true,
        dueAt: true,
        createdAt: true,
        completedAt: true,
      },
      take: 20_000,
      orderBy: { completedAt: 'desc' },
    }),
    prisma.websiteEvent.findMany({
      where: { occurredAt: { gte: twelveMonthsAgo } },
      select: {
        occurredAt: true,
        category: true,
        source: true,
        eventType: true,
        websiteId: true,
      },
    }),
    loadLifecycleErrorIds(),
  ]);

  const allLoaded = websites as LoadedWebsite[];
  const filtered = applyReportFilters(allLoaded, filters, now);
  const filteredIds = new Set(filtered.map((w) => w.id));

  const overdueByWebsite = new Map<string, number>();
  const overduePriorities = new Map<string, TaskPriority[]>();
  for (const task of openTasks) {
    if (!filteredIds.has(task.websiteId)) continue;
    if (classifyTaskDue(task.dueAt, now) !== 'overdue') continue;
    overdueByWebsite.set(task.websiteId, (overdueByWebsite.get(task.websiteId) ?? 0) + 1);
    const list = overduePriorities.get(task.websiteId) ?? [];
    list.push(task.priority);
    overduePriorities.set(task.websiteId, list);
  }

  const attentionIds = new Set<string>();
  let needsAttention = 0;
  for (const site of filtered) {
    const overdueCount = overdueByWebsite.get(site.id) ?? 0;
    const item = evaluateWebsiteAttention(
      site,
      buildIntegrationInput(site, lifecycleErrorIds),
      now,
      overdueCount > 0
        ? { count: overdueCount, priorities: overduePriorities.get(site.id) ?? [] }
        : null,
    );
    if (item) {
      attentionIds.add(site.id);
      needsAttention += 1;
    }
  }

  let active = 0;
  let launched = 0;
  let withGsc = 0;
  let withImpressions = 0;
  let withClicks = 0;
  let archived = 0;
  for (const site of filtered) {
    if (site.status === 'ACTIVE') active += 1;
    if (site.archivedAt || site.status === 'ARCHIVED' || site.lifecycleStage === 'ARCHIVED') {
      archived += 1;
    }
    const dates = resolveEffectiveWebsiteDates(site);
    if (dates.launchedAt) launched += 1;
    if (dates.gscAddedAt) withGsc += 1;
    if (dates.firstImpressionAt) withImpressions += 1;
    if (dates.firstClickAt) withClicks += 1;
  }

  const openTaskCount = openTasks.filter((t) => filteredIds.has(t.websiteId)).length;
  const overdueTaskCount = [...overdueByWebsite.values()].reduce((a, b) => a + b, 0);

  const summary: ReportsSummary = {
    total: filtered.length,
    active,
    launched,
    withGsc,
    withImpressions,
    withClicks,
    archived,
    needsAttention,
    openTasks: openTaskCount,
    overdueTasks: overdueTaskCount,
    dateAnomalies: countDateAnomalies(filtered),
  };

  const groups = [
    ...new Set(
      allLoaded
        .map((w) => w.group?.trim())
        .filter((g): g is string => Boolean(g)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ru'));

  const activityFiltered = activityEvents.filter((e) => filteredIds.has(e.websiteId));
  const allTasksForReport = [
    ...openTasks.map((t) => ({
      status: t.status,
      dueAt: t.dueAt,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      websiteId: t.websiteId,
    })),
    ...doneTasks,
  ];

  return {
    filters,
    groups,
    summary,
    funnel: buildLifecycleFunnel(filtered),
    durations: buildDurationMetrics(filtered),
    stages: buildStageDistribution(filtered, filters.includeArchived),
    monthly: buildMonthlyCohorts(filtered, now),
    groupsComparison: buildGroupComparison(filtered, {
      attentionIds,
      overdueByWebsite,
      sort: filters.groupSort,
    }),
    stuck: buildStuckCategories(filtered, { overdueByWebsite, now }),
    activity: aggregateActivity(activityFiltered, now),
    tasks: buildTaskReport(allTasksForReport, filteredIds, now),
    exportHref: buildReportsExportHref(filters),
  };
}

export async function buildReportsCsvExport(
  searchParams: Record<string, string | string[] | undefined> = {},
  now: Date = new Date(),
): Promise<{ filename: string; body: string }> {
  const filters = parseReportsFilters(searchParams);

  const [websites, openTasks, lifecycleErrorIds] = await Promise.all([
    prisma.website.findMany({
      select: {
        id: true,
        domain: true,
        name: true,
        status: true,
        lifecycleStage: true,
        group: true,
        archivedAt: true,
        launchedAt: true,
        launchedAtManual: true,
        firstHealthyAt: true,
        gscFirstSeenAt: true,
        gscAddedAtManual: true,
        firstImpressionAt: true,
        firstImpressionAtManual: true,
        firstClickAt: true,
        firstClickAtManual: true,
        lastWorkAt: true,
        createdAt: true,
        primaryUrl: true,
        integrations: {
          select: {
            system: true,
            status: true,
            syncError: true,
            externalEntityId: true,
            externalData: true,
          },
        },
      },
      orderBy: { domain: 'asc' },
      take: REPORT_CSV_MAX_SITES + 500,
    }),
    prisma.websiteTask.findMany({
      where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: {
        websiteId: true,
        status: true,
        priority: true,
        dueAt: true,
      },
    }),
    loadLifecycleErrorIds(),
  ]);

  const filtered = applyReportFilters(websites as LoadedWebsite[], filters, now).slice(
    0,
    REPORT_CSV_MAX_SITES,
  );
  const filteredIds = new Set(filtered.map((w) => w.id));

  const openByWebsite = new Map<string, number>();
  const overdueByWebsite = new Map<string, number>();
  const overduePriorities = new Map<string, TaskPriority[]>();
  for (const task of openTasks) {
    if (!filteredIds.has(task.websiteId)) continue;
    openByWebsite.set(task.websiteId, (openByWebsite.get(task.websiteId) ?? 0) + 1);
    if (classifyTaskDue(task.dueAt, now) === 'overdue') {
      overdueByWebsite.set(task.websiteId, (overdueByWebsite.get(task.websiteId) ?? 0) + 1);
      const list = overduePriorities.get(task.websiteId) ?? [];
      list.push(task.priority);
      overduePriorities.set(task.websiteId, list);
    }
  }

  const rows: ReportCsvSite[] = filtered.map((site) => {
    const dates = resolveEffectiveWebsiteDates(site);
    const overdueCount = overdueByWebsite.get(site.id) ?? 0;
    const attention = evaluateWebsiteAttention(
      site,
      buildIntegrationInput(site as LoadedWebsite, lifecycleErrorIds),
      now,
      overdueCount > 0
        ? { count: overdueCount, priorities: overduePriorities.get(site.id) ?? [] }
        : null,
    );
    return {
      domain: site.domain,
      name: site.name,
      group: site.group,
      status: site.status,
      lifecycleStage: site.lifecycleStage,
      launchedAt: dates.launchedAt,
      firstHealthyAt: dates.firstHealthyAt,
      gscAddedAt: dates.gscAddedAt,
      firstImpressionAt: dates.firstImpressionAt,
      firstClickAt: dates.firstClickAt,
      durations: computeSiteDurations(dates),
      lastWorkAt: dates.lastWorkAt,
      openTasks: openByWebsite.get(site.id) ?? 0,
      overdueTasks: overdueCount,
      attentionPriority: attention?.priority ?? null,
      attentionReasons: attention?.reasons.map((r) => r.label) ?? [],
    };
  });

  return {
    filename: reportCsvFilename(now),
    body: buildLifecycleReportCsv(rows),
  };
}
