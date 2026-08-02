import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import type { AttentionPriority } from '@/lib/dashboard/types';
import type { DurationSummary } from '@/lib/reports/math';

export type LaunchPeriodPreset =
  | '30'
  | '90'
  | 'year'
  | 'prev_year'
  | 'all'
  | 'custom';

export type GroupSortMode =
  | 'count'
  | 'impressions_share'
  | 'clicks_share'
  | 'speed_to_impressions';

export type ReportsFilters = {
  period: LaunchPeriodPreset;
  from: string;
  to: string;
  group: string;
  status: string;
  stage: string;
  includeArchived: boolean;
  groupSort: GroupSortMode;
};

export type ReportWebsiteDates = {
  launchedAt: Date | null;
  firstHealthyAt: Date | null;
  gscAddedAt: Date | null;
  firstImpressionAt: Date | null;
  firstClickAt: Date | null;
  lastWorkAt: Date | null;
  createdAt: Date;
};

export type ReportSiteDurations = {
  launchToHealthy: number | null;
  launchToGsc: number | null;
  launchToImpression: number | null;
  impressionToClick: number | null;
  launchToClick: number | null;
};

export type ReportsSummary = {
  total: number;
  active: number;
  launched: number;
  withGsc: number;
  withImpressions: number;
  withClicks: number;
  archived: number;
  needsAttention: number;
  openTasks: number;
  overdueTasks: number;
  dateAnomalies: number;
};

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  pctOfPrevious: number | null;
  pctOfTotal: number;
  remaining: number;
};

export type DurationMetricKey =
  | 'launch_to_healthy'
  | 'launch_to_gsc'
  | 'launch_to_impressions'
  | 'impressions_to_click'
  | 'launch_to_click';

export type DurationMetricRow = {
  key: DurationMetricKey;
  label: string;
  summary: DurationSummary;
};

export type StageCountRow = {
  stage: LifecycleStage;
  label: string;
  count: number;
  pct: number;
  href: string;
};

export type MonthlyCohortRow = {
  monthKey: string;
  label: string;
  launched: number;
  gsc: number;
  impressions: number;
  clicks: number;
};

export type GroupComparisonRow = {
  groupKey: string;
  groupLabel: string;
  total: number;
  launched: number;
  gsc: number;
  impressions: number;
  clicks: number;
  impressionsShare: number;
  clicksShare: number;
  medianLaunchToImpressions: number | null;
  medianImpressionsToClick: number | null;
  needsAttention: number;
  overdueTasks: number;
};

export type StuckCategoryKey =
  | 'no_gsc'
  | 'no_impressions'
  | 'no_clicks'
  | 'stale_work'
  | 'overdue_tasks'
  | 'stage_mismatch';

export type StuckSitePreview = {
  websiteId: string;
  domain: string;
  group: string | null;
  days: number;
  href: string;
};

export type StuckCategory = {
  key: StuckCategoryKey;
  label: string;
  count: number;
  sites: StuckSitePreview[];
  showAllHref: string;
};

export type WorkActivityMonth = {
  monthKey: string;
  label: string;
  manual: number;
  taskCompleted: number;
  technical: number;
  seo: number;
  content: number;
  notes: number;
  automatic: number;
  sitesWorked: number;
};

export type TaskReportSummary = {
  open: number;
  inProgress: number;
  overdue: number;
  doneLast30Days: number;
  meanCompletionDays: number | null;
  medianCompletionDays: number | null;
};

export type ReportsData = {
  filters: ReportsFilters;
  groups: string[];
  summary: ReportsSummary;
  funnel: FunnelStep[];
  durations: DurationMetricRow[];
  stages: StageCountRow[];
  monthly: MonthlyCohortRow[];
  groupsComparison: GroupComparisonRow[];
  stuck: StuckCategory[];
  activity: WorkActivityMonth[];
  tasks: TaskReportSummary;
  exportHref: string;
};

export type ReportCsvSite = {
  domain: string;
  name: string | null;
  group: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  launchedAt: Date | null;
  firstHealthyAt: Date | null;
  gscAddedAt: Date | null;
  firstImpressionAt: Date | null;
  firstClickAt: Date | null;
  durations: ReportSiteDurations;
  lastWorkAt: Date | null;
  openTasks: number;
  overdueTasks: number;
  attentionPriority: AttentionPriority | null;
  attentionReasons: string[];
};
