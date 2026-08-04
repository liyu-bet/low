import type { WebsitePerformanceSummary } from '@/lib/gsc/performance';
import {
  FAVORITE_RECOMMENDATION_LIMIT,
  formatPerformancePeriodLabel,
  isPerformanceUsable,
  parseGscPerformanceSnapshot,
  toPerformanceSummary,
  type WebsiteFavoriteRecommendation,
} from '@/lib/gsc/performance';
import { parseGscExternalSnapshotWithPerformance } from '@/lib/gsc/snapshot-performance';

export type RecommendationCandidate = {
  id: string;
  domain: string;
  archivedAt: Date | null;
  status: string;
  lifecycleStage: string;
  isFavorite: boolean;
  performance: WebsitePerformanceSummary | null;
};

export function pickRecommendationCandidates(
  sites: RecommendationCandidate[],
  now: Date = new Date(),
  limit = FAVORITE_RECOMMENDATION_LIMIT,
): WebsiteFavoriteRecommendation[] {
  const eligible = sites.filter((site) => {
    if (site.isFavorite) return false;
    if (site.archivedAt != null || site.status === 'ARCHIVED' || site.lifecycleStage === 'ARCHIVED') {
      return false;
    }
    if (!site.performance) return false;
    const snapshot = parseGscPerformanceSnapshot({
      propertyId: site.performance.sourcePropertyId,
      siteUrl: site.performance.sourceSiteUrl,
      period: site.performance.period,
      periodStart: site.performance.periodStart,
      periodEnd: site.performance.periodEnd,
      dataDate: site.performance.dataDate,
      impressions: site.performance.impressions,
      clicks: site.performance.clicks,
      generatedAt: site.performance.generatedAt,
    });
    if (!snapshot || !isPerformanceUsable(snapshot, now)) return false;
    return site.performance.impressions > 0 || site.performance.clicks > 0;
  });

  eligible.sort((a, b) => {
    const clicksDiff = (b.performance?.clicks ?? 0) - (a.performance?.clicks ?? 0);
    if (clicksDiff !== 0) return clicksDiff;
    const impressionsDiff =
      (b.performance?.impressions ?? 0) - (a.performance?.impressions ?? 0);
    if (impressionsDiff !== 0) return impressionsDiff;
    return a.domain.localeCompare(b.domain, 'ru');
  });

  return eligible.slice(0, limit).map((site) => ({
    websiteId: site.id,
    domain: site.domain,
    clicks: site.performance!.clicks,
    impressions: site.performance!.impressions,
    period: site.performance!.period,
    dataDate: site.performance!.dataDate,
    periodLabel: formatPerformancePeriodLabel(site.performance!),
  }));
}

export function performanceFromIntegrationExternalData(
  externalData: unknown,
  now: Date = new Date(),
): WebsitePerformanceSummary | null {
  const snapshot = parseGscExternalSnapshotWithPerformance(externalData);
  if (!snapshot?.performance) return null;
  if (!isPerformanceUsable(snapshot.performance, now)) return null;
  return toPerformanceSummary(snapshot.performance);
}
