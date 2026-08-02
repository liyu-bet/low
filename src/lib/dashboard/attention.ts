import { toDateOnlyUtc, todayDateOnlyUtc } from '@/lib/dates/date-only';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveLaunchDate,
} from '@/lib/dates/effective';
import { isDsdOfflineStatus, isDsdOnlineStatus } from '@/lib/dsd/snapshot';
import type {
  AttentionFocus,
  AttentionIntegrationInput,
  AttentionItem,
  AttentionPriority,
  AttentionReason,
  AttentionReasonCode,
  AttentionWebsiteInput,
  DashboardFilters,
  DashboardSummary,
} from '@/lib/dashboard/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_RANK: Record<AttentionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const FOCUS_CODES: Record<Exclude<AttentionFocus, 'all'>, AttentionReasonCode[]> = {
  down: ['site_down', 'was_up_now_down'],
  no_gsc: ['no_gsc'],
  no_impressions: ['no_impressions'],
  no_clicks: ['no_clicks'],
  stale_work: ['stale_work'],
  expiring: ['domain_expiring'],
  sync_errors: ['dsd_integration_error', 'gsc_integration_error', 'gsc_lifecycle_error'],
};

export function daysBetweenUtc(from: Date, to: Date): number {
  return Math.floor((toDateOnlyUtc(to).getTime() - toDateOnlyUtc(from).getTime()) / DAY_MS);
}

function maxPriority(reasons: AttentionReason[]): AttentionPriority {
  let best: AttentionPriority = 'medium';
  for (const reason of reasons) {
    if (PRIORITY_RANK[reason.priority] < PRIORITY_RANK[best]) {
      best = reason.priority;
    }
  }
  return best;
}

function parseDomainExpiry(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isExcludedFromAttention(website: AttentionWebsiteInput): boolean {
  if (website.archivedAt) return true;
  if (website.status === 'ARCHIVED' || website.lifecycleStage === 'ARCHIVED') return true;
  if (website.lifecycleStage === 'IDEA') return true;
  const launchedAt = getEffectiveLaunchDate(website);
  if (!launchedAt) return true;
  return false;
}

function hasImportantDsdData(
  snapshot: AttentionIntegrationInput['dsdSnapshot'],
): boolean {
  if (!snapshot) return false;
  if (!snapshot.status.trim()) return false;
  return true;
}

/**
 * Compute attention reasons for one website. Pure — no DB access.
 * Returns null when the site should not appear on the attention list.
 */
export function evaluateWebsiteAttention(
  website: AttentionWebsiteInput,
  integration: AttentionIntegrationInput,
  now: Date = new Date(),
): AttentionItem | null {
  if (isExcludedFromAttention(website)) return null;

  const today = todayDateOnlyUtc(now);
  const launchedAt = getEffectiveLaunchDate(website)!;
  const firstImpressionAt = getEffectiveFirstImpressionDate(website);
  const firstClickAt = getEffectiveFirstClickDate(website);
  const reasons: AttentionReason[] = [];

  const snapshot = integration.dsdSnapshot;
  const isDown = snapshot ? isDsdOfflineStatus(snapshot.status) : false;
  const domainExpiresAt = parseDomainExpiry(snapshot?.domainExpiresAt ?? null);

  if (isDown) {
    reasons.push({
      code: 'site_down',
      priority: 'critical',
      label: 'Сайт недоступен',
      urgencyDays: 10_000,
    });
  }

  if (integration.dsdStatus === 'ERROR') {
    reasons.push({
      code: 'dsd_integration_error',
      priority: 'critical',
      label: 'Ошибка интеграции DSD',
      urgencyDays: 9_000,
    });
  }

  if (integration.hasGscError) {
    reasons.push({
      code: 'gsc_integration_error',
      priority: 'critical',
      label: 'Ошибка интеграции GSC',
      urgencyDays: 9_000,
    });
  }

  if (domainExpiresAt) {
    const daysLeft = daysBetweenUtc(today, domainExpiresAt);
    if (daysLeft <= 7) {
      reasons.push({
        code: 'domain_expiring',
        priority: 'critical',
        label:
          daysLeft < 0
            ? `Домен истёк ${Math.abs(daysLeft)} дн. назад`
            : daysLeft === 0
              ? 'Домен истекает сегодня'
              : `Домен истекает через ${daysLeft} ${pluralDays(daysLeft)}`,
        urgencyDays: 8_000 - daysLeft,
      });
    } else if (daysLeft <= 14) {
      reasons.push({
        code: 'domain_expiring',
        priority: 'high',
        label: `Домен истекает через ${daysLeft} ${pluralDays(daysLeft)}`,
        urgencyDays: 7_000 - daysLeft,
      });
    } else if (daysLeft <= 30) {
      reasons.push({
        code: 'domain_expiring',
        priority: 'medium',
        label: `Домен истекает через ${daysLeft} ${pluralDays(daysLeft)}`,
        urgencyDays: 6_000 - daysLeft,
      });
    }
  }

  if (!integration.hasGscLinked) {
    reasons.push({
      code: 'no_gsc',
      priority: 'high',
      label: 'Нет подключения GSC',
      urgencyDays: 5_000 + daysBetweenUtc(launchedAt, today),
    });
  }

  if (integration.hasLifecycleError) {
    reasons.push({
      code: 'gsc_lifecycle_error',
      priority: 'high',
      label: 'Ошибка GSC lifecycle',
      urgencyDays: 4_500,
    });
  }

  if (
    website.firstHealthyAt != null &&
    snapshot &&
    isDsdOfflineStatus(snapshot.status) &&
    !isDsdOnlineStatus(snapshot.status)
  ) {
    reasons.push({
      code: 'was_up_now_down',
      priority: 'high',
      label: 'Сайт был доступен, сейчас недоступен',
      urgencyDays: 4_000,
    });
  }

  if (!firstImpressionAt) {
    const daysSinceLaunch = daysBetweenUtc(launchedAt, today);
    if (daysSinceLaunch >= 14) {
      reasons.push({
        code: 'no_impressions',
        priority: 'medium',
        label: `Нет показов ${daysSinceLaunch} ${pluralDays(daysSinceLaunch)}`,
        urgencyDays: daysSinceLaunch,
      });
    }
  } else if (!firstClickAt) {
    const daysSinceImpressions = daysBetweenUtc(firstImpressionAt, today);
    if (daysSinceImpressions >= 30) {
      reasons.push({
        code: 'no_clicks',
        priority: 'medium',
        label: `Нет кликов ${daysSinceImpressions} ${pluralDays(daysSinceImpressions)}`,
        urgencyDays: daysSinceImpressions,
      });
    }
  }

  const workReference = website.lastWorkAt ?? launchedAt;
  const daysSinceWork = daysBetweenUtc(workReference, today);
  if (daysSinceWork > 30) {
    reasons.push({
      code: 'stale_work',
      priority: 'medium',
      label: `Работы не проводились ${daysSinceWork} ${pluralDays(daysSinceWork)}`,
      urgencyDays: daysSinceWork,
    });
  }

  const missingDsd =
    integration.dsdStatus == null ||
    integration.dsdStatus === 'UNLINKED' ||
    integration.dsdStatus === 'PENDING' ||
    (integration.dsdStatus === 'LINKED' && !hasImportantDsdData(snapshot));

  if (missingDsd && integration.dsdStatus !== 'ERROR') {
    reasons.push({
      code: 'missing_dsd_data',
      priority: 'medium',
      label: 'Отсутствуют важные данные DSD',
      urgencyDays: 100,
    });
  }

  if (reasons.length === 0) return null;

  const priority = maxPriority(reasons);
  const urgencyDays = Math.max(...reasons.map((r) => r.urgencyDays));

  return {
    websiteId: website.id,
    domain: website.domain,
    name: website.name,
    status: website.status,
    lifecycleStage: website.lifecycleStage,
    group: website.group,
    priority,
    reasons: sortReasons(reasons),
    lastWorkAt: website.lastWorkAt,
    launchedAt,
    firstImpressionAt,
    firstClickAt,
    domainExpiresAt,
    dsdStatusLabel: formatDsdStatusLabel(integration),
    gscStatusLabel: formatGscStatusLabel(integration),
    urgencyDays,
  };
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

function sortReasons(reasons: AttentionReason[]): AttentionReason[] {
  return [...reasons].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return b.urgencyDays - a.urgencyDays;
  });
}

function formatDsdStatusLabel(integration: AttentionIntegrationInput): string {
  if (integration.dsdStatus === 'ERROR') return 'Ошибка';
  if (!integration.dsdStatus || integration.dsdStatus === 'UNLINKED') return 'Нет связи';
  if (integration.dsdStatus === 'PENDING') return 'Ожидание';
  if (integration.dsdSnapshot) {
    return integration.dsdSnapshot.status;
  }
  return integration.dsdStatus;
}

function formatGscStatusLabel(integration: AttentionIntegrationInput): string {
  if (integration.hasGscError) return 'Ошибка';
  if (integration.hasGscLinked) return 'Связан';
  return 'Нет связи';
}

export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    if (b.urgencyDays !== a.urgencyDays) return b.urgencyDays - a.urgencyDays;
    return a.domain.localeCompare(b.domain, 'ru');
  });
}

export function itemMatchesFocus(item: AttentionItem, focus: AttentionFocus): boolean {
  if (focus === 'all') return true;
  const codes = FOCUS_CODES[focus];
  return item.reasons.some((r) => codes.includes(r.code));
}

export function filterAttentionItems(
  items: AttentionItem[],
  filters: DashboardFilters,
): AttentionItem[] {
  const q = filters.q.trim().toLowerCase();
  return items.filter((item) => {
    if (!itemMatchesFocus(item, filters.focus)) return false;
    if (filters.group && (item.group ?? '') !== filters.group) return false;
    if (filters.stage && item.lifecycleStage !== filters.stage) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (q) {
      const hay = `${item.domain} ${item.name ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function buildDashboardSummary(
  totalActive: number,
  items: AttentionItem[],
): DashboardSummary {
  return {
    totalActive,
    needsAttention: items.length,
    down: items.filter((i) => itemMatchesFocus(i, 'down')).length,
    noGsc: items.filter((i) => itemMatchesFocus(i, 'no_gsc')).length,
    noImpressions: items.filter((i) => itemMatchesFocus(i, 'no_impressions')).length,
    noClicks: items.filter((i) => itemMatchesFocus(i, 'no_clicks')).length,
    staleWork: items.filter((i) => itemMatchesFocus(i, 'stale_work')).length,
    expiring: items.filter((i) => itemMatchesFocus(i, 'expiring')).length,
    syncErrors: items.filter((i) => itemMatchesFocus(i, 'sync_errors')).length,
  };
}

export function parseLifecycleErrorPropertyIds(metadata: unknown): Set<string> {
  const ids = new Set<string>();
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ids;
  const errors = (metadata as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return ids;
  for (const entry of errors) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const propertyId = (entry as { propertyId?: unknown }).propertyId;
    if (typeof propertyId === 'string' && propertyId) ids.add(propertyId);
  }
  return ids;
}

export { PRIORITY_RANK, FOCUS_CODES };
