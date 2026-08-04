import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WebsitePerformanceSummary } from '@/lib/gsc/performance';
import {
  performanceFromIntegrationExternalData,
  pickRecommendationCandidates,
  type RecommendationCandidate,
} from './recommendations';

const NOW = new Date('2026-08-04T10:00:00.000Z');

function perf(overrides: Partial<WebsitePerformanceSummary> = {}): WebsitePerformanceSummary {
  return {
    sourcePropertyId: 'prop_1',
    sourceSiteUrl: 'sc-domain:example.com',
    period: 'latest_available_day',
    impressions: 100,
    clicks: 10,
    dataDate: '2026-08-02',
    periodStart: '2026-08-02',
    periodEnd: '2026-08-02',
    generatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function candidate(overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return {
    id: 'w1',
    domain: 'example.com',
    archivedAt: null,
    status: 'ACTIVE',
    lifecycleStage: 'GROWING',
    isFavorite: false,
    performance: perf(),
    ...overrides,
  };
}

describe('pickRecommendationCandidates', () => {
  it('excludes favorites, archived sites, and sites without performance', () => {
    const sites: RecommendationCandidate[] = [
      candidate({ id: 'fav', isFavorite: true }),
      candidate({ id: 'archived', archivedAt: new Date() }),
      candidate({ id: 'archived-status', status: 'ARCHIVED' }),
      candidate({ id: 'archived-stage', lifecycleStage: 'ARCHIVED' }),
      candidate({ id: 'no-perf', performance: null }),
      candidate({ id: 'ok' }),
    ];
    const result = pickRecommendationCandidates(sites, NOW);
    assert.deepEqual(
      result.map((r) => r.websiteId),
      ['ok'],
    );
  });

  it('excludes sites with zero impressions and zero clicks', () => {
    const sites: RecommendationCandidate[] = [
      candidate({ id: 'zero', performance: perf({ impressions: 0, clicks: 0 }) }),
      candidate({ id: 'nonzero', performance: perf({ impressions: 5, clicks: 0 }) }),
    ];
    const result = pickRecommendationCandidates(sites, NOW);
    assert.deepEqual(
      result.map((r) => r.websiteId),
      ['nonzero'],
    );
  });

  it('excludes sites whose performance is stale', () => {
    const sites: RecommendationCandidate[] = [
      candidate({
        id: 'stale',
        performance: perf({ generatedAt: '2026-01-01T00:00:00.000Z' }),
      }),
      candidate({ id: 'fresh' }),
    ];
    const result = pickRecommendationCandidates(sites, NOW);
    assert.deepEqual(
      result.map((r) => r.websiteId),
      ['fresh'],
    );
  });

  it('sorts by clicks desc, then impressions desc, then domain', () => {
    const sites: RecommendationCandidate[] = [
      candidate({ id: 'b', domain: 'b.com', performance: perf({ clicks: 5, impressions: 50 }) }),
      candidate({ id: 'a', domain: 'a.com', performance: perf({ clicks: 5, impressions: 50 }) }),
      candidate({ id: 'top', domain: 'top.com', performance: perf({ clicks: 20, impressions: 30 }) }),
    ];
    const result = pickRecommendationCandidates(sites, NOW);
    assert.deepEqual(
      result.map((r) => r.websiteId),
      ['top', 'a', 'b'],
    );
  });

  it('respects the limit', () => {
    const sites: RecommendationCandidate[] = Array.from({ length: 5 }, (_, i) =>
      candidate({ id: `w${i}`, domain: `w${i}.com` }),
    );
    const result = pickRecommendationCandidates(sites, NOW, 2);
    assert.equal(result.length, 2);
  });
});

function baseSnapshot(performance?: Record<string, unknown>) {
  return {
    siteUrl: 'sc-domain:example.com',
    propertyType: 'domain',
    permissionLevel: 'siteOwner',
    label: null,
    isSelected: true,
    gscFirstSeenAt: '2026-01-01T00:00:00.000Z',
    gscUpdatedAt: '2026-01-01T00:00:00.000Z',
    connection: { id: 'conn_1', email: 'owner@example.com', name: 'Owner' },
    ...(performance ? { performance } : {}),
  };
}

describe('performanceFromIntegrationExternalData', () => {
  it('returns null for malformed externalData', () => {
    assert.equal(performanceFromIntegrationExternalData(null, NOW), null);
    assert.equal(performanceFromIntegrationExternalData({}, NOW), null);
    assert.equal(performanceFromIntegrationExternalData('not-json'), null);
  });

  it('returns null when performance is missing or stale', () => {
    assert.equal(performanceFromIntegrationExternalData(baseSnapshot(), NOW), null);

    const withStalePerf = baseSnapshot({
      propertyId: 'prop_1',
      siteUrl: 'sc-domain:example.com',
      period: 'latest_available_day',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-01',
      dataDate: '2026-01-01',
      impressions: 10,
      clicks: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(performanceFromIntegrationExternalData(withStalePerf, NOW), null);
  });

  it('extracts a usable performance summary', () => {
    const externalData = baseSnapshot({
      propertyId: 'prop_1',
      siteUrl: 'sc-domain:example.com',
      period: 'latest_available_day',
      periodStart: '2026-08-02',
      periodEnd: '2026-08-02',
      dataDate: '2026-08-02',
      impressions: 100,
      clicks: 10,
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
    const summary = performanceFromIntegrationExternalData(externalData, NOW);
    assert.ok(summary);
    assert.equal(summary?.impressions, 100);
    assert.equal(summary?.clicks, 10);
    assert.equal(summary?.sourcePropertyId, 'prop_1');
  });
});
