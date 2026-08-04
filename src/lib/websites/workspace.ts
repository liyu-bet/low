import { IntegrationSystem, type LifecycleStage, type WebsiteStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { isDsdOfflineStatus, isDsdOnlineStatus, parseDsdExternalSnapshot } from '@/lib/dsd/snapshot';
import type { WebsitePerformanceSummary, WebsiteFavoriteRecommendation } from '@/lib/gsc/performance';
import {
  parseGscExternalSnapshotWithPerformance,
  selectSourceGscProperty,
  type SelectableGscProperty,
} from '@/lib/gsc/snapshot-performance';
import { formatDueRelative, sortOpenTasks } from '@/lib/tasks/classify';
import {
  performanceFromIntegrationExternalData,
  pickRecommendationCandidates,
  type RecommendationCandidate,
} from '@/lib/websites/recommendations';
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
  isFavorite: boolean;
  favoriteCreatedAt: Date | null;
  performance: WebsitePerformanceSummary | null;
  /** Always null on the row itself — see `recommendations` on WebsitesWorkspaceData. */
  recommendation: WebsiteFavoriteRecommendation | null;
};

export type WebsitesWorkspaceData = {
  rows: WebsiteWorkspaceRow[];
  groups: string[];
  includeArchived: boolean;
  recommendations: WebsiteFavoriteRecommendation[];
};

function availabilityFromDsd(externalData: unknown): AvailabilityDot {
  const snapshot = parseDsdExternalSnapshot(externalData);
  if (!snapshot) return 'unknown';
  if (isDsdOnlineStatus(snapshot.status)) return 'up';
  if (isDsdOfflineStatus(snapshot.status)) return 'down';
  return 'unknown';
}

function toSelectableGscProperty(integration: {
  externalEntityId: string | null;
  externalData: unknown;
}): SelectableGscProperty | null {
  const snapshot = parseGscExternalSnapshotWithPerformance(integration.externalData);
  if (!snapshot || !integration.externalEntityId) return null;
  return {
    externalId: integration.externalEntityId,
    siteUrl: snapshot.siteUrl,
    isSelected: snapshot.isSelected,
    propertyType: snapshot.propertyType,
    externalData: integration.externalData,
  };
}

function resolveSitePerformance(
  gscIntegrations: Array<{ externalEntityId: string | null; externalData: unknown }>,
  primaryUrl: string | null,
  now: Date,
): WebsitePerformanceSummary | null {
  const selectable = gscIntegrations
    .map(toSelectableGscProperty)
    .filter((p): p is SelectableGscProperty => p != null);
  const chosen = selectSourceGscProperty(selectable, primaryUrl);
  if (!chosen) return null;
  return performanceFromIntegrationExternalData(chosen.externalData, now);
}

/**
 * Default row order: favorites (newest favorite first), then recommended
 * (in recommendation rank order), then everything else by domain.
 */
export function compareWorkspaceRows(
  a: WebsiteWorkspaceRow,
  b: WebsiteWorkspaceRow,
  recommendedRank: ReadonlyMap<string, number>,
): number {
  const bucketA = a.isFavorite ? 0 : recommendedRank.has(a.id) ? 1 : 2;
  const bucketB = b.isFavorite ? 0 : recommendedRank.has(b.id) ? 1 : 2;
  if (bucketA !== bucketB) return bucketA - bucketB;

  if (bucketA === 0) {
    const diff = (b.favoriteCreatedAt?.getTime() ?? 0) - (a.favoriteCreatedAt?.getTime() ?? 0);
    if (diff !== 0) return diff;
  }
  if (bucketA === 1) {
    const diff = recommendedRank.get(a.id)! - recommendedRank.get(b.id)!;
    if (diff !== 0) return diff;
  }
  return a.domain.localeCompare(b.domain, 'ru');
}

export async function getWebsitesWorkspace(
  options: { includeArchived?: boolean; userId: string },
  now: Date = new Date(),
): Promise<WebsitesWorkspaceData> {
  const includeArchived = Boolean(options.includeArchived);

  const [websites, openTasks, favorites] = await Promise.all([
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
          where: { system: { in: [IntegrationSystem.DSD, IntegrationSystem.GSC] } },
          select: {
            system: true,
            externalData: true,
            status: true,
            externalEntityId: true,
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
        title: true,
        priority: true,
        status: true,
        dueAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.websiteFavorite.findMany({
      where: { userId: options.userId },
      select: { websiteId: true, createdAt: true },
    }),
  ]);

  const tasksByWebsite = new Map<string, typeof openTasks>();
  for (const task of openTasks) {
    const list = tasksByWebsite.get(task.websiteId) ?? [];
    list.push(task);
    tasksByWebsite.set(task.websiteId, list);
  }

  const favoriteCreatedAtByWebsite = new Map(
    favorites.map((favorite) => [favorite.websiteId, favorite.createdAt]),
  );

  const rows: WebsiteWorkspaceRow[] = websites.map((site) => {
    const dsd = site.integrations.find((i) => i.system === IntegrationSystem.DSD) ?? null;
    const gscIntegrations = site.integrations.filter((i) => i.system === IntegrationSystem.GSC);
    const milestones = buildWebsiteMilestones(site);
    const siteTasks = tasksByWebsite.get(site.id) ?? [];
    const sorted = sortOpenTasks(siteTasks, now);
    const nearest = sorted[0] ?? null;
    const favoriteCreatedAt = favoriteCreatedAtByWebsite.get(site.id) ?? null;

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
      isFavorite: favoriteCreatedAt != null,
      favoriteCreatedAt,
      performance: resolveSitePerformance(gscIntegrations, site.primaryUrl, now),
      recommendation: null,
    };
  });

  const groups = [
    ...new Set(rows.map((r) => r.group?.trim()).filter((g): g is string => Boolean(g))),
  ].sort((a, b) => a.localeCompare(b, 'ru'));

  const recommendations = includeArchived
    ? []
    : pickRecommendationCandidates(
        rows.map(
          (row): RecommendationCandidate => ({
            id: row.id,
            domain: row.domain,
            archivedAt: row.archivedAt,
            status: row.status,
            lifecycleStage: row.lifecycleStage,
            isFavorite: row.isFavorite,
            performance: row.performance,
          }),
        ),
        now,
      );

  // Ranking must be known before sorting so recommended rows sit between
  // favorites and the rest.
  const recommendedRank = new Map(recommendations.map((item, index) => [item.websiteId, index]));
  rows.sort((a, b) => compareWorkspaceRows(a, b, recommendedRank));

  return { rows, groups, includeArchived, recommendations };
}
