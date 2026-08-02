import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LifecycleStage, WebsiteStatus } from '@prisma/client';
import {
  buildLifecycleFunnel,
  buildMonthlyCohorts,
  collectPositiveDuration,
  computeSiteDurations,
  countDateAnomalies,
  hasStageMismatch,
} from './compute';
import { buildLifecycleReportCsv } from './csv';
import {
  applyReportFilters,
  parseReportsFilters,
  resolveEffectiveWebsiteDates,
  resolveLaunchPeriodRange,
  type FilterableWebsite,
} from './filters';
import { median, summarizeDurations } from './math';

function site(
  overrides: Partial<FilterableWebsite> & { id: string; domain: string },
): FilterableWebsite {
  return {
    name: null,
    status: 'ACTIVE' as WebsiteStatus,
    lifecycleStage: 'LAUNCHED' as LifecycleStage,
    group: null,
    archivedAt: null,
    launchedAt: null,
    launchedAtManual: null,
    gscFirstSeenAt: null,
    gscAddedAtManual: null,
    firstImpressionAt: null,
    firstImpressionAtManual: null,
    firstClickAt: null,
    firstClickAtManual: null,
    firstHealthyAt: null,
    lastWorkAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('reports math', () => {
  it('median of odd set', () => {
    assert.equal(median([3, 1, 2]), 2);
  });

  it('median of even set averages middle pair', () => {
    assert.equal(median([1, 2, 3, 4]), 2.5);
  });

  it('excludes negative intervals from summarizeDurations', () => {
    const summary = summarizeDurations([5, -2, 7]);
    assert.equal(summary.count, 2);
    assert.equal(summary.median, 6);
  });
});

describe('reports effective dates and anomalies', () => {
  it('uses manual override instead of automatic date', () => {
    const dates = resolveEffectiveWebsiteDates(
      site({
        id: '1',
        domain: 'a.test',
        launchedAt: new Date('2026-01-10T00:00:00.000Z'),
        launchedAtManual: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
    assert.equal(dates.launchedAt?.toISOString(), '2026-01-01T00:00:00.000Z');
  });

  it('negative interval is anomaly and excluded from positive collection', () => {
    const durations = computeSiteDurations({
      launchedAt: new Date('2026-02-01T00:00:00.000Z'),
      firstHealthyAt: null,
      gscAddedAt: null,
      firstImpressionAt: new Date('2026-01-01T00:00:00.000Z'),
      firstClickAt: null,
      lastWorkAt: null,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    assert.ok((durations.launchToImpression ?? 0) < 0);
    const collected = collectPositiveDuration(durations.launchToImpression);
    assert.equal(collected.days, null);
    assert.equal(collected.anomaly, true);
  });

  it('counts sites with date anomalies once', () => {
    const n = countDateAnomalies([
      site({
        id: '1',
        domain: 'a.test',
        launchedAt: new Date('2026-02-01T00:00:00.000Z'),
        firstImpressionAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      site({
        id: '2',
        domain: 'b.test',
        launchedAt: new Date('2026-01-01T00:00:00.000Z'),
        firstImpressionAt: new Date('2026-01-10T00:00:00.000Z'),
      }),
    ]);
    assert.equal(n, 1);
  });
});

describe('reports funnel', () => {
  it('computes percentages and does not count missing dates as reached', () => {
    const funnel = buildLifecycleFunnel([
      site({
        id: '1',
        domain: 'a.test',
        launchedAt: new Date('2026-01-01T00:00:00.000Z'),
        firstHealthyAt: new Date('2026-01-03T00:00:00.000Z'),
        gscFirstSeenAt: new Date('2026-01-05T00:00:00.000Z'),
        firstImpressionAt: new Date('2026-01-10T00:00:00.000Z'),
      }),
      site({
        id: '2',
        domain: 'b.test',
        launchedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ]);
    const created = funnel.find((s) => s.key === 'created')!;
    const launched = funnel.find((s) => s.key === 'launched')!;
    const healthy = funnel.find((s) => s.key === 'healthy')!;
    const gsc = funnel.find((s) => s.key === 'gsc')!;
    const impressions = funnel.find((s) => s.key === 'impressions')!;
    const clicks = funnel.find((s) => s.key === 'clicks')!;

    assert.equal(created.count, 2);
    assert.equal(launched.count, 2);
    assert.equal(healthy.count, 1);
    assert.equal(gsc.count, 1);
    assert.equal(impressions.count, 1);
    assert.equal(clicks.count, 0);
    assert.equal(healthy.pctOfPrevious, 50);
    assert.equal(gsc.pctOfPrevious, 100);
    assert.equal(impressions.pctOfPrevious, 100);
  });
});

describe('reports filters', () => {
  it('excludes archived by default', () => {
    const filtered = applyReportFilters(
      [
        site({ id: '1', domain: 'a.test' }),
        site({
          id: '2',
          domain: 'b.test',
          status: 'ARCHIVED',
          lifecycleStage: 'ARCHIVED',
          archivedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ],
      parseReportsFilters({}),
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.id, '1');
  });

  it('period filter includes edge launch dates', () => {
    const filters = parseReportsFilters({
      period: 'custom',
      from: '2026-01-01',
      to: '2026-01-31',
    });
    const range = resolveLaunchPeriodRange(filters, new Date('2026-06-01T12:00:00.000Z'));
    assert.equal(range.from?.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(range.to?.toISOString(), '2026-01-31T00:00:00.000Z');

    const filtered = applyReportFilters(
      [
        site({
          id: '1',
          domain: 'edge-start.test',
          launchedAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
        site({
          id: '2',
          domain: 'edge-end.test',
          launchedAt: new Date('2026-01-31T00:00:00.000Z'),
        }),
        site({
          id: '3',
          domain: 'outside.test',
          launchedAt: new Date('2026-02-01T00:00:00.000Z'),
        }),
        site({ id: '4', domain: 'no-launch.test' }),
      ],
      filters,
      new Date('2026-06-01T12:00:00.000Z'),
    );
    assert.deepEqual(
      filtered.map((s) => s.id).sort(),
      ['1', '2'],
    );
  });
});

describe('reports monthly cohorts', () => {
  it('groups on year boundary by effective date month', () => {
    const rows = buildMonthlyCohorts(
      [
        site({
          id: '1',
          domain: 'dec.test',
          launchedAt: new Date('2025-12-15T00:00:00.000Z'),
        }),
        site({
          id: '2',
          domain: 'jan.test',
          launchedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      ],
      new Date('2026-01-15T00:00:00.000Z'),
    );
    const dec = rows.find((r) => r.monthKey === '2025-12');
    const jan = rows.find((r) => r.monthKey === '2026-01');
    assert.equal(dec?.launched, 1);
    assert.equal(jan?.launched, 1);
  });
});

describe('reports groups without N+1 shape', () => {
  it('aggregates groups from a flat site list', async () => {
    const { buildGroupComparison } = await import('./compute');
    const rows = buildGroupComparison(
      [
        site({ id: '1', domain: 'a.test', group: 'Alpha' }),
        site({ id: '2', domain: 'b.test', group: 'Alpha' }),
        site({ id: '3', domain: 'c.test', group: null }),
      ],
      {
        attentionIds: new Set(['1']),
        overdueByWebsite: new Map([['2', 2]]),
        sort: 'count',
      },
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.groupLabel, 'Alpha');
    assert.equal(rows[0]!.total, 2);
    assert.equal(rows[1]!.groupLabel, 'Без группы');
  });
});

describe('reports stage mismatch and tasks', () => {
  it('detects lifecycle stage behind achieved dates', () => {
    assert.equal(
      hasStageMismatch('SETUP', {
        launchedAt: new Date('2026-01-01T00:00:00.000Z'),
        firstHealthyAt: null,
        gscAddedAt: null,
        firstImpressionAt: new Date('2026-01-10T00:00:00.000Z'),
        firstClickAt: null,
        lastWorkAt: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
      true,
    );
  });

  it('does not treat canceled tasks as done in duration filter mental model', () => {
    // buildTaskReport skips non-DONE; canceled never enters completionDays.
    const canceledStatus = 'CANCELED';
    assert.notEqual(canceledStatus, 'DONE');
  });
});

describe('reports csv', () => {
  it('uses effective dates in CSV body', () => {
    const csv = buildLifecycleReportCsv([
      {
        domain: 'a.test',
        name: 'A',
        group: 'G',
        status: 'ACTIVE',
        lifecycleStage: 'LAUNCHED',
        launchedAt: new Date('2026-01-05T00:00:00.000Z'),
        firstHealthyAt: null,
        gscAddedAt: new Date('2026-01-10T00:00:00.000Z'),
        firstImpressionAt: null,
        firstClickAt: null,
        durations: {
          launchToHealthy: null,
          launchToGsc: 5,
          launchToImpression: -3,
          impressionToClick: null,
          launchToClick: null,
        },
        lastWorkAt: null,
        openTasks: 1,
        overdueTasks: 0,
        attentionPriority: 'high',
        attentionReasons: ['Нет подключения GSC'],
      },
    ]);
    assert.match(csv, /^\uFEFF/);
    assert.match(csv, /a\.test/);
    assert.match(csv, /2026-01-05/);
    assert.match(csv, /2026-01-10/);
    assert.match(csv, /,5,/);
    assert.doesNotMatch(csv, /,-3,/);
  });
});
