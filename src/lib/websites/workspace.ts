import { IntegrationSystem, type LifecycleStage, type WebsiteStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { isDsdOfflineStatus, isDsdOnlineStatus, parseDsdExternalSnapshot } from '@/lib/dsd/snapshot';
import { formatDueRelative, sortOpenTasks } from '@/lib/tasks/classify';
import {
  buildWebsiteMilestones,
  nextMilestoneLabel,
  type MilestoneItem,
} from '@/lib/websites/milestones';

export type AvailabilityDot = 'up' | 'down' | 'unknown';

export type WebsiteWorkspaceRow = {
  id: string;
  domain: string;
  name: string | null;
  primaryUrl: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
  tags: string[];
  createdAt: Date;
  launchedAt: Date | null;
  launchedAtManual: Date | null;
  firstHealthyAt: Date | null;
  gscFirstSeenAt: Date | null;
  gscAddedAtManual: Date | null;
  firstImpressionAt: Date | null;
  firstImpressionAtManual: Date | null;
  firstClickAt: Date | null;
  firstClickAtManual: Date | null;
  archivedAt: Date | null;
  availability: AvailabilityDot;
  milestones: MilestoneItem[];
  nextStageLabel: string;
  openTasksCount: number;
  nearestTask: {
    id: string;
    title: string;
    dueRelative: string;
  } | null;
};

export type WebsitesWorkspaceData = {
  rows: WebsiteWorkspaceRow[];
  groups: string[];
  includeArchived: boolean;
};

function availabilityFromDsd(externalData: unknown): AvailabilityDot {
  const snapshot = parseDsdExternalSnapshot(externalData);
  if (!snapshot) return 'unknown';
  if (isDsdOnlineStatus(snapshot.status)) return 'up';
  if (isDsdOfflineStatus(snapshot.status)) return 'down';
  return 'unknown';
}

export async function getWebsitesWorkspace(
  options: { includeArchived?: boolean } = {},
  now: Date = new Date(),
): Promise<WebsitesWorkspaceData> {
  const includeArchived = Boolean(options.includeArchived);

  const [websites, openTasks] = await Promise.all([
    prisma.website.findMany({
      where: includeArchived
        ? undefined
        : {
            archivedAt: null,
            status: { not: 'ARCHIVED' },
            lifecycleStage: { not: 'ARCHIVED' },
          },
      include: {
        integrations: {
          where: { system: IntegrationSystem.DSD },
          select: { externalData: true, status: true },
          take: 1,
        },
      },
      orderBy: { domain: 'asc' },
    }),
    prisma.websiteTask.findMany({
      where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: {
        id: true,
        websiteId: true,
        title: true,
        priority: true,
        status: true,
        dueAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const tasksByWebsite = new Map<string, typeof openTasks>();
  for (const task of openTasks) {
    const list = tasksByWebsite.get(task.websiteId) ?? [];
    list.push(task);
    tasksByWebsite.set(task.websiteId, list);
  }

  const rows: WebsiteWorkspaceRow[] = websites.map((site) => {
    const dsd = site.integrations[0] ?? null;
    const milestones = buildWebsiteMilestones(site);
    const siteTasks = tasksByWebsite.get(site.id) ?? [];
    const sorted = sortOpenTasks(siteTasks, now);
    const nearest = sorted[0] ?? null;

    return {
      id: site.id,
      domain: site.domain,
      name: site.name,
      primaryUrl: site.primaryUrl,
      status: site.status,
      lifecycleStage: site.lifecycleStage,
      group: site.group,
      tags: site.tags,
      createdAt: site.createdAt,
      launchedAt: site.launchedAt,
      launchedAtManual: site.launchedAtManual,
      firstHealthyAt: site.firstHealthyAt,
      gscFirstSeenAt: site.gscFirstSeenAt,
      gscAddedAtManual: site.gscAddedAtManual,
      firstImpressionAt: site.firstImpressionAt,
      firstImpressionAtManual: site.firstImpressionAtManual,
      firstClickAt: site.firstClickAt,
      firstClickAtManual: site.firstClickAtManual,
      archivedAt: site.archivedAt,
      availability: dsd ? availabilityFromDsd(dsd.externalData) : 'unknown',
      milestones,
      nextStageLabel: nextMilestoneLabel(milestones),
      openTasksCount: siteTasks.length,
      nearestTask: nearest
        ? {
            id: nearest.id,
            title: nearest.title,
            dueRelative: formatDueRelative(nearest.dueAt, now),
          }
        : null,
    };
  });

  const groups = [
    ...new Set(rows.map((r) => r.group?.trim()).filter((g): g is string => Boolean(g))),
  ].sort((a, b) => a.localeCompare(b, 'ru'));

  return { rows, groups, includeArchived };
}
