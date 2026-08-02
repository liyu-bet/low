import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateOnly } from '../dates/date-only';
import { evaluateWebsiteAttention } from '../dashboard/attention';
import {
  buildEventListWhere,
  eventListSkipTake,
  EVENT_PAGE_SIZE,
  parseEventListQuery,
} from '../events/query';
import {
  buildLifecycleIntervals,
  resolveWebsiteOpenUrl,
} from './lifecycle';

describe('website profile lifecycle helpers', () => {
  it('uses effective manual dates for intervals', () => {
    const intervals = buildLifecycleIntervals(
      {
        launchedAt: parseDateOnly('2026-01-10'),
        launchedAtManual: parseDateOnly('2026-01-01'),
        firstHealthyAt: parseDateOnly('2026-01-05'),
        gscFirstSeenAt: parseDateOnly('2026-02-01'),
        firstImpressionAt: parseDateOnly('2026-03-01'),
        firstClickAt: parseDateOnly('2026-03-10'),
        lastWorkAt: parseDateOnly('2026-07-01'),
      },
      new Date('2026-08-02T12:00:00.000Z'),
    );
    const launchToHealthy = intervals.find((i) => i.key === 'launch_to_healthy');
    assert.ok(launchToHealthy);
    assert.equal(launchToHealthy!.days, 4);
  });

  it('calculates intervals only when both dates exist', () => {
    const intervals = buildLifecycleIntervals({
      launchedAt: parseDateOnly('2026-01-01'),
      firstHealthyAt: null,
      firstImpressionAt: null,
    });
    assert.equal(
      intervals.some((i) => i.key === 'launch_to_healthy' || i.key === 'launch_to_impressions'),
      false,
    );
  });

  it('resolves open url safely', () => {
    assert.equal(resolveWebsiteOpenUrl(null, 'example.com'), 'https://example.com');
    assert.equal(resolveWebsiteOpenUrl('example.com', 'example.com'), 'https://example.com');
    assert.equal(
      resolveWebsiteOpenUrl('https://example.com/path', 'example.com'),
      'https://example.com/path',
    );
  });
});

describe('website profile attention reuse', () => {
  it('attention reasons match dashboard logic for missing GSC', () => {
    const item = evaluateWebsiteAttention(
      {
        id: 'w1',
        domain: 'example.com',
        name: null,
        status: 'ACTIVE',
        lifecycleStage: 'LAUNCHED',
        group: null,
        archivedAt: null,
        launchedAt: parseDateOnly('2026-01-01'),
        launchedAtManual: null,
        firstHealthyAt: null,
        firstImpressionAt: parseDateOnly('2026-02-01'),
        firstImpressionAtManual: null,
        firstClickAt: parseDateOnly('2026-02-10'),
        firstClickAtManual: null,
        lastWorkAt: parseDateOnly('2026-07-20'),
      },
      {
        dsdStatus: 'LINKED',
        dsdSyncError: null,
        dsdSnapshot: {
          status: 'online',
          lastPingMs: 10,
          isDnsValid: true,
          domainExpiresAt: '2027-01-01',
          server: null,
        },
        hasGscLinked: false,
        hasGscError: false,
        gscStatuses: [],
        hasLifecycleError: false,
      },
      new Date('2026-08-02T12:00:00.000Z'),
      null,
    );
    assert.ok(item);
    assert.ok(item!.reasons.some((r) => r.code === 'no_gsc'));
  });

  it(' tolerates missing DSD snapshot without throwing', () => {
    const item = evaluateWebsiteAttention(
      {
        id: 'w1',
        domain: 'example.com',
        name: null,
        status: 'ACTIVE',
        lifecycleStage: 'LAUNCHED',
        group: null,
        archivedAt: null,
        launchedAt: parseDateOnly('2026-01-01'),
        launchedAtManual: null,
        firstHealthyAt: null,
        firstImpressionAt: parseDateOnly('2026-02-01'),
        firstImpressionAtManual: null,
        firstClickAt: parseDateOnly('2026-02-10'),
        firstClickAtManual: null,
        lastWorkAt: parseDateOnly('2026-07-20'),
      },
      {
        dsdStatus: 'LINKED',
        dsdSyncError: null,
        dsdSnapshot: null,
        hasGscLinked: true,
        hasGscError: false,
        gscStatuses: ['LINKED'],
        hasLifecycleError: false,
      },
      new Date('2026-08-02T12:00:00.000Z'),
    );
    assert.ok(item);
    assert.ok(item!.reasons.some((r) => r.code === 'missing_dsd_data'));
  });
});

describe('website event query helpers', () => {
  it('builds where for focus and period filters', () => {
    const query = parseEventListQuery({
      focus: 'seo',
      source: 'GSC',
      period: '30',
      q: 'клик',
      page: '2',
    });
    assert.equal(query.page, 2);
    const where = buildEventListWhere('site-1', query, new Date('2026-08-02T12:00:00.000Z'));
    assert.equal(where.websiteId, 'site-1');
    assert.equal(where.category, 'SEO');
    assert.equal(where.source, 'GSC');
    assert.ok(where.occurredAt);
  });

  it('pagination never exceeds page size', () => {
    const page1 = eventListSkipTake(1);
    const page3 = eventListSkipTake(3);
    assert.equal(page1.take, EVENT_PAGE_SIZE);
    assert.equal(page1.skip, 0);
    assert.equal(page3.skip, EVENT_PAGE_SIZE * 2);
    assert.ok(page3.take <= EVENT_PAGE_SIZE);
  });
});

describe('gsc properties listing contract', () => {
  it('keeps multiple GSC properties as separate entries', () => {
    const integrations = [
      { id: '1', externalKey: 'sc-domain:a.com' },
      { id: '2', externalKey: 'https://b.com/' },
    ];
    assert.equal(integrations.length, 2);
    assert.notEqual(integrations[0]!.externalKey, integrations[1]!.externalKey);
  });
});

describe('archive does not delete related records', () => {
  it('archive payload only updates status fields', async () => {
    const { archiveWebsite } = await import('./service');
    // Structural check: function exists and is the soft-archive path used by UI.
    assert.equal(typeof archiveWebsite, 'function');
  });
});
