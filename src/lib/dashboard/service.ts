import {
  IntegrationSystem,
  SyncRunStatus,
  type LifecycleStage,
  type WebsiteStatus,
} from '@prisma/client';
import {
  buildDashboardSummary,
  evaluateWebsiteAttention,
  filterAttentionItems,
  parseLifecycleErrorPropertyIds,
  sortAttentionItems,
} from '@/lib/dashboard/attention';
import type {
  AttentionFocus,
  AttentionIntegrationInput,
  AttentionPriority,
  DashboardData,
  DashboardFilters,
  DashboardRecentEvent,
  LifecycleWarning,
} from '@/lib/dashboard/types';
import {
  EVENT_TYPE_DATE_OVERRIDE_CLEARED,
  EVENT_TYPE_DATE_OVERRIDE_SET,
  EVENT_TYPE_DATE_OVERRIDE_UPDATED,
  EVENT_TYPE_GSC_FIRST_CLICK,
  EVENT_TYPE_GSC_FIRST_IMPRESSION,
  EVENT_TYPE_SITE_DOWN,
  EVENT_TYPE_SITE_RECOVERED,
  GSC_LIFECYCLE_SYNC_JOB_TYPE,
} from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { parseDsdExternalSnapshot } from '@/lib/dsd/snapshot';
import { listOpenTasksForDashboard } from '@/lib/tasks/service';

const VALID_FOCUS = new Set<AttentionFocus>([
  'all',
  'down',
  'no_gsc',
  'no_impressions',
  'no_clicks',
  'stale_work',
  'expiring',
  'sync_errors',
  'overdue_tasks',
]);

const VALID_PRIORITY = new Set<AttentionPriority>(['critical', 'high', 'medium']);

export function parseDashboardFilters(
  searchParams: Record<string, string | string[] | undefined>,
): DashboardFilters {
  const raw = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  };

  const focusRaw = raw('focus');
  const priorityRaw = raw('priority');

  return {
    focus: VALID_FOCUS.has(focusRaw as AttentionFocus)
      ? (focusRaw as AttentionFocus)
      : 'all',
    q: raw('q'),
    group: raw('group'),
    stage: raw('stage'),
    priority: VALID_PRIORITY.has(priorityRaw as AttentionPriority)
      ? (priorityRaw as AttentionPriority)
      : '',
  };
}

function eventHighlight(eventType: string, source: string): DashboardRecentEvent['highlight'] {
  if (eventType === EVENT_TYPE_SITE_DOWN) return 'down';
  if (eventType === EVENT_TYPE_SITE_RECOVERED) return 'recovered';
  if (eventType === EVENT_TYPE_GSC_FIRST_IMPRESSION) return 'first_impression';
  if (eventType === EVENT_TYPE_GSC_FIRST_CLICK) return 'first_click';
  if (eventType === 'work') return 'work';
  if (
    eventType === EVENT_TYPE_DATE_OVERRIDE_SET ||
    eventType === EVENT_TYPE_DATE_OVERRIDE_UPDATED ||
    eventType === EVENT_TYPE_DATE_OVERRIDE_CLEARED
  ) {
    return 'date_change';
  }
  if (source === 'MANUAL' && eventType === 'work') return 'work';
  return null;
}

function buildLifecycleWarning(
  run: {
    status: SyncRunStatus;
    errorCount: number;
    error: string | null;
  } | null,
): LifecycleWarning {
  if (!run) return null;
  if (run.status !== SyncRunStatus.PARTIAL && run.status !== SyncRunStatus.FAILED) {
    return null;
  }
  const count = run.errorCount;
  return {
    status: run.status,
    errorCount: count,
    message:
      count > 0
        ? `GSC lifecycle: ${count} объектов не обработаны`
        : run.error ?? 'GSC lifecycle: есть ошибки',
  };
}

export async function getDashboardData(
  searchParams: Record<string, string | string[] | undefined> = {},
  now: Date = new Date(),
): Promise<DashboardData> {
  const filters = parseDashboardFilters(searchParams);

  const [websites, recentEventRows, latestLifecycle, openTasks] = await Promise.all([
    prisma.website.findMany({
      where: {
        archivedAt: null,
        status: { not: 'ARCHIVED' },
        lifecycleStage: { not: 'ARCHIVED' },
      },
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
        firstImpressionAt: true,
        firstImpressionAtManual: true,
        firstClickAt: true,
        firstClickAtManual: true,
        lastWorkAt: true,
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
    prisma.websiteEvent.findMany({
      take: 20,
      orderBy: [{ occurredAt: 'desc' }, { recordedAt: 'desc' }],
      select: {
        id: true,
        occurredAt: true,
        title: true,
        category: true,
        source: true,
        eventType: true,
        websiteId: true,
        website: { select: { domain: true } },
      },
    }),
    prisma.syncRun.findFirst({
      where: { jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE },
      orderBy: { startedAt: 'desc' },
      select: {
        status: true,
        errorCount: true,
        error: true,
        metadata: true,
      },
    }),
    listOpenTasksForDashboard(now),
  ]);

  const lifecycleErrorPropertyIds = parseLifecycleErrorPropertyIds(latestLifecycle?.metadata);

  const items = sortAttentionItems(
    websites
      .map((website) => {
        const dsd = website.integrations.find((i) => i.system === IntegrationSystem.DSD);
        const gscList = website.integrations.filter((i) => i.system === IntegrationSystem.GSC);
        const snapshot = dsd ? parseDsdExternalSnapshot(dsd.externalData) : null;

        const integration: AttentionIntegrationInput = {
          dsdStatus: dsd?.status ?? null,
          dsdSyncError: dsd?.syncError ?? null,
          dsdSnapshot: snapshot,
          hasGscLinked: gscList.some((g) => g.status === 'LINKED'),
          hasGscError: gscList.some((g) => g.status === 'ERROR'),
          gscStatuses: gscList.map((g) => g.status),
          hasLifecycleError: gscList.some(
            (g) => g.externalEntityId != null && lifecycleErrorPropertyIds.has(g.externalEntityId),
          ),
        };

        const overdue = openTasks.overdueByWebsite.get(website.id) ?? null;

        return evaluateWebsiteAttention(website, integration, now, overdue);
      })
      .filter((item): item is NonNullable<typeof item> => item != null),
  );

  const filteredItems = filterAttentionItems(items, filters);
  const groups = [
    ...new Set(
      websites.map((w) => w.group).filter((g): g is string => Boolean(g && g.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ru'));

  const recentEvents: DashboardRecentEvent[] = recentEventRows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt,
    title: row.title,
    category: row.category,
    source: row.source,
    eventType: row.eventType,
    websiteId: row.websiteId,
    domain: row.website.domain,
    highlight: eventHighlight(row.eventType, row.source),
  }));

  return {
    summary: buildDashboardSummary(websites.length, items, openTasks.summary),
    items,
    filteredItems,
    recentEvents,
    lifecycleWarning: buildLifecycleWarning(latestLifecycle),
    groups,
    filters,
    upcomingTasks: openTasks.upcoming,
  };
}

export function buildDashboardQuery(filters: Partial<DashboardFilters>): string {
  const params = new URLSearchParams();
  if (filters.focus && filters.focus !== 'all') params.set('focus', filters.focus);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.group) params.set('group', filters.group);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : '/dashboard';
}

export type { LifecycleStage, WebsiteStatus };
