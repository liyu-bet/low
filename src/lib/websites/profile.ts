import {
  IntegrationSystem,
  type Website,
  type WebsiteEvent,
  type WebsiteIntegration,
} from '@prisma/client';
import { resolveDisplayActorLabel } from '@/lib/auth/actor-label';
import { GSC_LIFECYCLE_SYNC_JOB_TYPE } from '@/lib/constants';
import { evaluateWebsiteAttention, parseLifecycleErrorPropertyIds } from '@/lib/dashboard/attention';
import type { AttentionItem } from '@/lib/dashboard/types';
import { prisma } from '@/lib/db/prisma';
import { isDsdOfflineStatus, isDsdOnlineStatus, parseDsdExternalSnapshot } from '@/lib/dsd/snapshot';
import type { EventListQuery } from '@/lib/events/query';
import {
  getWebsiteEventStats,
  queryWebsiteEvents,
  type WebsiteEventStats,
} from '@/lib/events/service';
import { classifyTaskDue, isOpenTaskStatus, sortOpenTasks } from '@/lib/tasks/classify';
import { getWebsiteTasksBlock } from '@/lib/tasks/service';
import type { TaskListItem, WebsiteTasksBlockData } from '@/lib/tasks/types';
import {
  buildLifecycleChain,
  buildLifecycleIntervals,
  resolveWebsiteOpenUrl,
  type LifecycleChainItem,
  type LifecycleInterval,
} from '@/lib/websites/lifecycle';
import {
  buildWebsiteLifeTree,
  limitManualActivity,
  type WebsiteLifeNode,
} from '@/lib/websites/life-tree';
import {
  buildWebsiteMilestones,
  nextMilestoneLabel,
  type MilestoneItem,
} from '@/lib/websites/milestones';
import { WebsiteNotFoundError, getWebsiteById } from '@/lib/websites/service';

export type DsdAvailabilityLabel = 'Работает' | 'Недоступен' | 'Неизвестно' | 'Нет связи с DSD';

export type WebsiteProfileOverview = {
  openUrl: string;
  dsdAvailability: DsdAvailabilityLabel;
  gscLinkedCount: number;
  openTasksCount: number;
  lastWorkAt: Date | null;
  domainExpiresAt: Date | null;
  serverName: string | null;
  dsdStatusRaw: string | null;
};

export type WebsiteProfileData = {
  website: Website;
  overview: WebsiteProfileOverview;
  attention: AttentionItem | null;
  lifecycleChain: LifecycleChainItem[];
  intervals: LifecycleInterval[];
  milestones: MilestoneItem[];
  nextStageLabel: string;
  lifeTree: {
    manual: WebsiteLifeNode[];
    automatic: WebsiteLifeNode[];
    manualTotal: number;
    hasMoreManual: boolean;
  };
  tasks: WebsiteTasksBlockData & {
    overdue: TaskListItem[];
    today: TaskListItem[];
    upcoming: TaskListItem[];
    noDue: TaskListItem[];
  };
  dsdIntegration: WebsiteIntegration | null;
  gscIntegrations: WebsiteIntegration[];
  eventStats: WebsiteEventStats;
  events: WebsiteEvent[];
  eventsTotal: number;
  eventsQuery: EventListQuery;
  eventsPageSize: number;
};

function dsdAvailability(
  integration: WebsiteIntegration | null,
): { label: DsdAvailabilityLabel; statusRaw: string | null; domainExpiresAt: Date | null; serverName: string | null } {
  if (!integration) {
    return {
      label: 'Нет связи с DSD',
      statusRaw: null,
      domainExpiresAt: null,
      serverName: null,
    };
  }
  const snapshot = parseDsdExternalSnapshot(integration.externalData);
  if (!snapshot) {
    return {
      label: 'Неизвестно',
      statusRaw: null,
      domainExpiresAt: null,
      serverName: null,
    };
  }
  let label: DsdAvailabilityLabel = 'Неизвестно';
  if (isDsdOnlineStatus(snapshot.status)) label = 'Работает';
  else if (isDsdOfflineStatus(snapshot.status)) label = 'Недоступен';

  const domainExpiresAt = snapshot.domainExpiresAt
    ? new Date(snapshot.domainExpiresAt)
    : null;

  return {
    label,
    statusRaw: snapshot.status,
    domainExpiresAt:
      domainExpiresAt && !Number.isNaN(domainExpiresAt.getTime()) ? domainExpiresAt : null,
    serverName: snapshot.server?.name ?? null,
  };
}

export async function getWebsiteProfile(
  websiteId: string,
  searchParams: Record<string, string | string[] | undefined> = {},
  now: Date = new Date(),
): Promise<WebsiteProfileData> {
  const website = await getWebsiteById(websiteId);

  const [
    tasksBlock,
    dsdIntegration,
    gscIntegrations,
    eventStats,
    eventPage,
    latestLifecycle,
    openTasks,
    lifeTreeTasks,
    lifeTreeEvents,
  ] = await Promise.all([
      getWebsiteTasksBlock(websiteId, now),
      prisma.websiteIntegration.findFirst({
        where: { websiteId, system: IntegrationSystem.DSD },
      }),
      prisma.websiteIntegration.findMany({
        where: { websiteId, system: IntegrationSystem.GSC },
        orderBy: { createdAt: 'asc' },
      }),
      getWebsiteEventStats(websiteId, now),
      queryWebsiteEvents(websiteId, searchParams, now),
      prisma.syncRun.findFirst({
        where: { jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE },
        orderBy: { startedAt: 'desc' },
        select: { metadata: true },
      }),
      prisma.websiteTask.findMany({
        where: {
          websiteId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
        select: { priority: true, dueAt: true, status: true },
      }),
      prisma.websiteTask.findMany({
        where: { websiteId, status: 'DONE' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueAt: true,
          completedAt: true,
          createdAt: true,
          createdBy: true,
          createdByUser: { select: { name: true, email: true } },
          assignedToUser: { select: { name: true, email: true } },
          completedByUser: { select: { name: true, email: true } },
        },
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
        take: 40,
      }),
      prisma.websiteEvent.findMany({
        where: { websiteId, source: 'MANUAL' },
        select: {
          id: true,
          eventType: true,
          category: true,
          title: true,
          description: true,
          source: true,
          occurredAt: true,
          createdBy: true,
          createdByUser: { select: { name: true, email: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 80,
      }),
    ]);

  const lifecycleErrorPropertyIds = parseLifecycleErrorPropertyIds(latestLifecycle?.metadata);
  const snapshot = dsdIntegration
    ? parseDsdExternalSnapshot(dsdIntegration.externalData)
    : null;

  const overdueOpen = openTasks.filter((t) => {
    if (!isOpenTaskStatus(t.status)) return false;
    return classifyTaskDue(t.dueAt, now) === 'overdue';
  });

  const attention = evaluateWebsiteAttention(
    website,
    {
      dsdStatus: dsdIntegration?.status ?? null,
      dsdSyncError: dsdIntegration?.syncError ?? null,
      dsdSnapshot: snapshot,
      hasGscLinked: gscIntegrations.some((g) => g.status === 'LINKED'),
      hasGscError: gscIntegrations.some((g) => g.status === 'ERROR'),
      gscStatuses: gscIntegrations.map((g) => g.status),
      hasLifecycleError: gscIntegrations.some(
        (g) => g.externalEntityId != null && lifecycleErrorPropertyIds.has(g.externalEntityId),
      ),
    },
    now,
    overdueOpen.length > 0
      ? {
          count: overdueOpen.length,
          priorities: overdueOpen.map((t) => t.priority),
        }
      : null,
  );

  const dsd = dsdAvailability(dsdIntegration);
  const openSorted = sortOpenTasks(tasksBlock.openTasks, now);
  const milestones = buildWebsiteMilestones(website);
  const activity = buildWebsiteLifeTree({
    website,
    tasks: lifeTreeTasks.map((task) => ({
      ...task,
      actorLabel: resolveDisplayActorLabel({
        user: task.completedByUser ?? task.createdByUser,
        legacy: task.createdBy,
      }),
    })),
    events: lifeTreeEvents.map((event) => ({
      ...event,
      actorLabel: resolveDisplayActorLabel({
        user: event.createdByUser,
        legacy: event.createdBy,
      }),
    })),
  });
  const manualLimited = limitManualActivity(activity.manual, 15);

  return {
    website,
    overview: {
      openUrl: resolveWebsiteOpenUrl(website.primaryUrl, website.domain),
      dsdAvailability: dsd.label,
      gscLinkedCount: gscIntegrations.filter((g) => g.status === 'LINKED').length,
      openTasksCount: openSorted.length,
      lastWorkAt: website.lastWorkAt,
      domainExpiresAt: dsd.domainExpiresAt,
      serverName: dsd.serverName,
      dsdStatusRaw: dsd.statusRaw,
    },
    attention,
    lifecycleChain: buildLifecycleChain(website),
    intervals: buildLifecycleIntervals(website, now),
    milestones,
    nextStageLabel: nextMilestoneLabel(milestones),
    lifeTree: {
      manual: manualLimited.items,
      automatic: activity.automatic,
      manualTotal: manualLimited.total,
      hasMoreManual: manualLimited.hasMore,
    },
    tasks: {
      ...tasksBlock,
      openTasks: openSorted,
      overdue: openSorted.filter((t) => t.dueBucket === 'overdue'),
      today: openSorted.filter((t) => t.dueBucket === 'today'),
      upcoming: openSorted.filter((t) => t.dueBucket === 'upcoming'),
      noDue: openSorted.filter((t) => t.dueBucket === 'none'),
    },
    dsdIntegration,
    gscIntegrations,
    eventStats,
    events: eventPage.events,
    eventsTotal: eventPage.total,
    eventsQuery: eventPage.query,
    eventsPageSize: eventPage.pageSize,
  };
}

export function isWebsiteProfileNotFoundError(
  error: unknown,
): error is WebsiteNotFoundError {
  return error instanceof WebsiteNotFoundError;
}
