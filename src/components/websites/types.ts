import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import type { GscPerformancePeriod } from '@/lib/gsc/performance';
import type { MilestoneRailItem } from '@/lib/websites/milestones';
import type { AvailabilityDot } from '@/lib/websites/workspace';

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

export type WebsiteCardVariant = 'default' | 'favorite' | 'recommended';

export function isRowArchived(row: WebsiteWorkspaceClientRow): boolean {
  return (
    row.archivedAt != null || row.status === 'ARCHIVED' || row.lifecycleStage === 'ARCHIVED'
  );
}
