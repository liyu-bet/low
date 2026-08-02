import { dateOnlyToInputValue } from '@/lib/dates/date-only';
import { buildCsvWithBom } from '@/lib/websites/csv';
import { collectPositiveDuration, computeSiteDurations } from '@/lib/reports/compute';
import type { ReportCsvSite } from '@/lib/reports/types';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';

const CSV_HEADERS = [
  'domain',
  'name',
  'group',
  'status',
  'lifecycleStage',
  'launchedAt',
  'firstHealthyAt',
  'gscAddedAt',
  'firstImpressionAt',
  'firstClickAt',
  'launchToHealthyDays',
  'launchToGscDays',
  'launchToImpressionDays',
  'impressionToClickDays',
  'launchToClickDays',
  'lastWorkAt',
  'openTasks',
  'overdueTasks',
  'attentionPriority',
  'attentionReasons',
] as const;

export const REPORT_CSV_MAX_SITES = 10_000;

export function reportCsvFilename(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `low-lifecycle-report-${y}-${m}-${d}.csv`;
}

function fmtDate(value: Date | null): string {
  return value ? dateOnlyToInputValue(value) : '';
}

function fmtDays(value: number | null): string {
  const { days } = collectPositiveDuration(value);
  return days == null ? '' : String(days);
}

export function buildLifecycleReportCsv(sites: ReportCsvSite[]): string {
  const limited = sites.slice(0, REPORT_CSV_MAX_SITES);
  const rows: string[][] = [Array.from(CSV_HEADERS)];

  for (const site of limited) {
    const d = site.durations;
    rows.push([
      site.domain,
      site.name ?? '',
      site.group ?? '',
      labelWebsiteStatus(site.status),
      labelLifecycleStage(site.lifecycleStage),
      fmtDate(site.launchedAt),
      fmtDate(site.firstHealthyAt),
      fmtDate(site.gscAddedAt),
      fmtDate(site.firstImpressionAt),
      fmtDate(site.firstClickAt),
      fmtDays(d.launchToHealthy),
      fmtDays(d.launchToGsc),
      fmtDays(d.launchToImpression),
      fmtDays(d.impressionToClick),
      fmtDays(d.launchToClick),
      fmtDate(site.lastWorkAt),
      String(site.openTasks),
      String(site.overdueTasks),
      site.attentionPriority ?? '',
      site.attentionReasons.join('; '),
    ]);
  }

  return buildCsvWithBom(rows);
}

/** Helper for tests: durations from already-resolved effective dates. */
export function durationsForCsvFromEffective(dates: {
  launchedAt: Date | null;
  firstHealthyAt: Date | null;
  gscAddedAt: Date | null;
  firstImpressionAt: Date | null;
  firstClickAt: Date | null;
  lastWorkAt: Date | null;
  createdAt: Date;
}) {
  return computeSiteDurations(dates);
}
