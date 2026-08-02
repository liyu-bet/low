import type { EventCategory, EventSource, LifecycleStage, WebsiteStatus } from '@prisma/client';

export type AttentionPriority = 'critical' | 'high' | 'medium';

export type AttentionReasonCode =
  | 'site_down'
  | 'dsd_integration_error'
  | 'gsc_integration_error'
  | 'domain_expiring'
  | 'no_gsc'
  | 'gsc_lifecycle_error'
  | 'was_up_now_down'
  | 'no_impressions'
  | 'no_clicks'
  | 'stale_work'
  | 'missing_dsd_data'
  | 'overdue_tasks';

export type AttentionFocus =
  | 'all'
  | 'down'
  | 'no_gsc'
  | 'no_impressions'
  | 'no_clicks'
  | 'stale_work'
  | 'expiring'
  | 'sync_errors'
  | 'overdue_tasks';

export type AttentionReason = {
  code: AttentionReasonCode;
  priority: AttentionPriority;
  label: string;
  /** Higher = more overdue / urgent within the same priority. */
  urgencyDays: number;
};

export type AttentionWebsiteInput = {
  id: string;
  domain: string;
  name: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
  archivedAt: Date | null;
  launchedAt: Date | null;
  launchedAtManual: Date | null;
  firstHealthyAt: Date | null;
  firstImpressionAt: Date | null;
  firstImpressionAtManual: Date | null;
  firstClickAt: Date | null;
  firstClickAtManual: Date | null;
  lastWorkAt: Date | null;
};

export type AttentionIntegrationInput = {
  dsdStatus: string | null;
  dsdSyncError: string | null;
  dsdSnapshot: {
    status: string;
    lastPingMs: number;
    isDnsValid: boolean;
    domainExpiresAt: string | null;
    server: { id: string; name: string; ip: string; status: string } | null;
  } | null;
  hasGscLinked: boolean;
  hasGscError: boolean;
  gscStatuses: string[];
  /** True when last GSC lifecycle SyncRun reported an error for this site's property. */
  hasLifecycleError: boolean;
};

export type AttentionOverdueTasksInput = {
  count: number;
  /** TaskPriority values of overdue open tasks. */
  priorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>;
};

export type AttentionItem = {
  websiteId: string;
  domain: string;
  name: string | null;
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  group: string | null;
  priority: AttentionPriority;
  reasons: AttentionReason[];
  lastWorkAt: Date | null;
  launchedAt: Date | null;
  firstImpressionAt: Date | null;
  firstClickAt: Date | null;
  domainExpiresAt: Date | null;
  dsdStatusLabel: string;
  gscStatusLabel: string;
  urgencyDays: number;
};

export type DashboardSummary = {
  totalActive: number;
  needsAttention: number;
  down: number;
  noGsc: number;
  noImpressions: number;
  noClicks: number;
  staleWork: number;
  expiring: number;
  syncErrors: number;
  overdueTasks: number;
  tasksDueToday: number;
};

export type DashboardRecentEvent = {
  id: string;
  occurredAt: Date;
  title: string;
  category: EventCategory;
  source: EventSource;
  eventType: string;
  websiteId: string;
  domain: string;
  highlight:
    | 'down'
    | 'recovered'
    | 'first_impression'
    | 'first_click'
    | 'work'
    | 'date_change'
    | null;
};

export type LifecycleWarning = {
  status: string;
  errorCount: number;
  message: string;
} | null;

export type DashboardFilters = {
  focus: AttentionFocus;
  q: string;
  group: string;
  stage: string;
  priority: '' | AttentionPriority;
};

import type { DashboardTaskItem } from '@/lib/tasks/types';

export type DashboardData = {
  summary: DashboardSummary;
  items: AttentionItem[];
  filteredItems: AttentionItem[];
  recentEvents: DashboardRecentEvent[];
  lifecycleWarning: LifecycleWarning;
  groups: string[];
  filters: DashboardFilters;
  upcomingTasks: DashboardTaskItem[];
};
