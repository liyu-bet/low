import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatPerformancePeriodLabel,
  GSC_PERFORMANCE_MAX_AGE_MS,
  isPerformanceUsable,
  parseGscPerformanceSnapshot,
  toPerformanceSummary,
  type GscPerformanceSnapshot,
} from './performance';

function snapshot(overrides: Partial<GscPerformanceSnapshot> = {}): GscPerformanceSnapshot {
  return {
    propertyId: 'prop_1',
    siteUrl: 'sc-domain:example.com',
    period: 'latest_available_day',
    periodStart: '2026-08-02',
    periodEnd: '2026-08-02',
    dataDate: '2026-08-02',
    impressions: 100,
    clicks: 10,
    generatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('parseGscPerformanceSnapshot', () => {
  it('accepts a valid snapshot', () => {
    const parsed = parseGscPerformanceSnapshot(snapshot());
    assert.ok(parsed);
    assert.equal(parsed?.propertyId, 'prop_1');
  });

  it('accepts an ISO generatedAt string without a timezone offset', () => {
    const parsed = parseGscPerformanceSnapshot(
      snapshot({ generatedAt: '2026-08-03T00:00:00' }),
    );
    assert.ok(parsed);
  });

  it('rejects clicks greater than impressions', () => {
    assert.equal(
      parseGscPerformanceSnapshot(snapshot({ impressions: 5, clicks: 10 })),
      null,
    );
  });

  it('rejects periodStart after periodEnd', () => {
    assert.equal(
      parseGscPerformanceSnapshot(
        snapshot({ periodStart: '2026-08-05', periodEnd: '2026-08-01' }),
      ),
      null,
    );
  });

  it('rejects malformed input', () => {
    assert.equal(parseGscPerformanceSnapshot(null), null);
    assert.equal(parseGscPerformanceSnapshot({}), null);
    assert.equal(parseGscPerformanceSnapshot('nonsense'), null);
  });
});

describe('isPerformanceUsable', () => {
  const now = new Date('2026-08-04T10:00:00.000Z');

  it('is usable when fresh and within calendar bounds', () => {
    assert.equal(isPerformanceUsable(snapshot(), now), true);
  });

  it('is stale beyond the max age window', () => {
    const stale = snapshot({
      generatedAt: new Date(now.getTime() - GSC_PERFORMANCE_MAX_AGE_MS - 1000).toISOString(),
    });
    assert.equal(isPerformanceUsable(stale, now), false);
  });

  it('rejects a periodEnd in the future', () => {
    const future = snapshot({ periodEnd: '2026-08-06', periodStart: '2026-08-06' });
    assert.equal(isPerformanceUsable(future, now), false);
  });

  it('rejects an unparsable generatedAt', () => {
    const bad = snapshot({ generatedAt: 'not-a-date' });
    assert.equal(isPerformanceUsable(bad, now), false);
  });

  it('rejects clicks greater than impressions defensively', () => {
    // Bypass schema validation to check the runtime guard directly.
    const bad = { ...snapshot(), impressions: 1, clicks: 5 };
    assert.equal(isPerformanceUsable(bad, now), false);
  });
});

describe('formatPerformancePeriodLabel', () => {
  it('labels rolling_24h windows', () => {
    assert.equal(
      formatPerformancePeriodLabel({ period: 'rolling_24h', dataDate: null }),
      'За последние 24 часа',
    );
  });

  it('labels latest_available_day with a formatted date', () => {
    const label = formatPerformancePeriodLabel({
      period: 'latest_available_day',
      dataDate: '2026-08-02',
    });
    assert.match(label, /За последние доступные сутки/);
    assert.match(label, /августа/);
  });

  it('labels latest_available_day without a date fallback', () => {
    assert.equal(
      formatPerformancePeriodLabel({ period: 'latest_available_day', dataDate: null }),
      'За последние доступные сутки',
    );
  });
});

describe('toPerformanceSummary', () => {
  it('maps a snapshot to a WebsitePerformanceSummary', () => {
    const summary = toPerformanceSummary(snapshot());
    assert.deepEqual(summary, {
      sourcePropertyId: 'prop_1',
      sourceSiteUrl: 'sc-domain:example.com',
      period: 'latest_available_day',
      impressions: 100,
      clicks: 10,
      dataDate: '2026-08-02',
      periodStart: '2026-08-02',
      periodEnd: '2026-08-02',
      generatedAt: '2026-08-03T00:00:00.000Z',
    });
  });
});
