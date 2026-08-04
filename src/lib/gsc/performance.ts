import { z } from 'zod';

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const GSC_PERFORMANCE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const FAVORITE_RECOMMENDATION_LIMIT = 3;

export const gscPerformancePeriodSchema = z.enum(['rolling_24h', 'latest_available_day']);

/** Normalized LOW performance snapshot (stored inside GSC externalData.performance). */
export const gscPerformanceSnapshotSchema = z
  .object({
    propertyId: z.string().min(1),
    siteUrl: z.string().min(1),
    period: gscPerformancePeriodSchema,
    periodStart: ymdSchema,
    periodEnd: ymdSchema,
    dataDate: ymdSchema.nullable(),
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    generatedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  })
  .superRefine((value, ctx) => {
    if (value.periodStart > value.periodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'periodStart must be <= periodEnd',
        path: ['periodStart'],
      });
    }
    if (value.clicks > value.impressions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'clicks must be <= impressions',
        path: ['clicks'],
      });
    }
  });

/** Upstream M2M response (latest_available_day from GSC). */
export const gscPerformanceResponseSchema = gscPerformanceSnapshotSchema;

export type GscPerformanceSnapshot = z.infer<typeof gscPerformanceSnapshotSchema>;
export type GscPerformancePeriod = z.infer<typeof gscPerformancePeriodSchema>;

export type WebsitePerformanceSummary = {
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

export type WebsiteFavoriteRecommendation = {
  websiteId: string;
  domain: string;
  clicks: number;
  impressions: number;
  period: GscPerformancePeriod;
  dataDate: string | null;
  periodLabel: string;
};

export function parseGscPerformanceSnapshot(raw: unknown): GscPerformanceSnapshot | null {
  const parsed = gscPerformanceSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function isPerformanceUsable(
  snapshot: GscPerformanceSnapshot,
  now: Date = new Date(),
  maxAgeMs: number = GSC_PERFORMANCE_MAX_AGE_MS,
): boolean {
  const generatedAt = Date.parse(snapshot.generatedAt);
  if (!Number.isFinite(generatedAt)) return false;
  if (now.getTime() - generatedAt > maxAgeMs) return false;

  const periodEnd = Date.parse(`${snapshot.periodEnd}T00:00:00.000Z`);
  if (!Number.isFinite(periodEnd)) return false;
  // Allow natural GSC lag; reject clearly future calendar ends.
  const tomorrowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  if (periodEnd >= tomorrowUtc) return false;

  if (snapshot.impressions < 0 || snapshot.clicks < 0) return false;
  if (snapshot.clicks > snapshot.impressions) return false;
  return true;
}

export function formatPerformancePeriodLabel(summary: {
  period: GscPerformancePeriod;
  dataDate: string | null;
}): string {
  if (summary.period === 'rolling_24h') {
    return 'За последние 24 часа';
  }
  if (summary.dataDate) {
    const [y, m, d] = summary.dataDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const formatted = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
    return `За последние доступные сутки · ${formatted}`;
  }
  return 'За последние доступные сутки';
}

export function toPerformanceSummary(
  snapshot: GscPerformanceSnapshot,
): WebsitePerformanceSummary {
  return {
    sourcePropertyId: snapshot.propertyId,
    sourceSiteUrl: snapshot.siteUrl,
    period: snapshot.period,
    impressions: snapshot.impressions,
    clicks: snapshot.clicks,
    dataDate: snapshot.dataDate,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    generatedAt: snapshot.generatedAt,
  };
}
