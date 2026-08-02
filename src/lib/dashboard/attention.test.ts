import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateOnly } from '../dates/date-only';
import {
  evaluateWebsiteAttention,
  filterAttentionItems,
  sortAttentionItems,
} from './attention';
import type {
  AttentionIntegrationInput,
  AttentionWebsiteInput,
} from './types';
import { parseDsdExternalSnapshot } from '../dsd/snapshot';

const NOW = new Date('2026-07-31T12:00:00.000Z');

function website(overrides: Partial<AttentionWebsiteInput> = {}): AttentionWebsiteInput {
  return {
    id: 'w1',
    domain: 'example.com',
    name: 'Example',
    status: 'ACTIVE',
    lifecycleStage: 'LAUNCHED',
    group: 'main',
    archivedAt: null,
    launchedAt: parseDateOnly('2026-01-01'),
    launchedAtManual: null,
    firstHealthyAt: parseDateOnly('2026-01-02'),
    firstImpressionAt: parseDateOnly('2026-02-01'),
    firstImpressionAtManual: null,
    firstClickAt: parseDateOnly('2026-02-10'),
    firstClickAtManual: null,
    lastWorkAt: parseDateOnly('2026-07-01'),
    ...overrides,
  };
}

function integration(
  overrides: Partial<AttentionIntegrationInput> = {},
): AttentionIntegrationInput {
  return {
    dsdStatus: 'LINKED',
    dsdSyncError: null,
    dsdSnapshot: {
      status: 'online',
      lastPingMs: 40,
      isDnsValid: true,
      domainExpiresAt: '2027-01-01',
      server: { id: 's1', name: 'srv', ip: '1.1.1.1', status: 'active' },
    },
    hasGscLinked: true,
    hasGscError: false,
    gscStatuses: ['LINKED'],
    hasLifecycleError: false,
    ...overrides,
  };
}

describe('evaluateWebsiteAttention', () => {
  it('excludes archived websites', () => {
    const item = evaluateWebsiteAttention(
      website({ archivedAt: parseDateOnly('2026-06-01'), status: 'ARCHIVED' }),
      integration(),
      NOW,
    );
    assert.equal(item, null);
  });

  it('excludes IDEA without treating as a problem', () => {
    const item = evaluateWebsiteAttention(
      website({ lifecycleStage: 'IDEA', launchedAt: null }),
      integration({ hasGscLinked: false, dsdSnapshot: { ...integration().dsdSnapshot!, status: 'offline' } }),
      NOW,
    );
    assert.equal(item, null);
  });

  it('excludes not-launched sites even if ACTIVE', () => {
    const item = evaluateWebsiteAttention(
      website({ launchedAt: null, launchedAtManual: null, lifecycleStage: 'SETUP' }),
      integration({ hasGscLinked: false }),
      NOW,
    );
    assert.equal(item, null);
  });

  it('marks unavailable site as critical', () => {
    const item = evaluateWebsiteAttention(
      website(),
      integration({
        dsdSnapshot: {
          status: 'offline',
          lastPingMs: 0,
          isDnsValid: true,
          domainExpiresAt: '2027-01-01',
          server: null,
        },
      }),
      NOW,
    );
    assert.ok(item);
    assert.equal(item!.priority, 'critical');
    assert.ok(item!.reasons.some((r) => r.code === 'site_down'));
  });

  it('marks missing GSC after launch as high', () => {
    const item = evaluateWebsiteAttention(
      website({ lastWorkAt: parseDateOnly('2026-07-20') }),
      integration({ hasGscLinked: false }),
      NOW,
    );
    assert.ok(item);
    assert.equal(item!.priority, 'high');
    assert.ok(item!.reasons.some((r) => r.code === 'no_gsc' && r.priority === 'high'));
  });

  it('does not flag missing impressions before 14 days', () => {
    const item = evaluateWebsiteAttention(
      website({
        launchedAt: parseDateOnly('2026-07-25'),
        firstImpressionAt: null,
        firstClickAt: null,
        lastWorkAt: parseDateOnly('2026-07-25'),
      }),
      integration(),
      NOW,
    );
    assert.equal(item, null);
  });

  it('flags missing impressions after 14 days', () => {
    const item = evaluateWebsiteAttention(
      website({
        launchedAt: parseDateOnly('2026-07-01'),
        firstImpressionAt: null,
        firstClickAt: null,
        lastWorkAt: parseDateOnly('2026-07-20'),
      }),
      integration(),
      NOW,
    );
    assert.ok(item);
    const reason = item!.reasons.find((r) => r.code === 'no_impressions');
    assert.ok(reason);
    assert.match(reason!.label, /Нет показов 30/);
  });

  it('flags missing clicks after 30 days from first impressions', () => {
    const item = evaluateWebsiteAttention(
      website({
        launchedAt: parseDateOnly('2026-01-01'),
        firstImpressionAt: parseDateOnly('2026-06-01'),
        firstClickAt: null,
        lastWorkAt: parseDateOnly('2026-07-20'),
      }),
      integration(),
      NOW,
    );
    assert.ok(item);
    const reason = item!.reasons.find((r) => r.code === 'no_clicks');
    assert.ok(reason);
    assert.match(reason!.label, /Нет кликов 60/);
  });

  it('creates stale work reason for old lastWorkAt', () => {
    const item = evaluateWebsiteAttention(
      website({
        lastWorkAt: parseDateOnly('2026-05-01'),
        firstImpressionAt: parseDateOnly('2026-02-01'),
        firstClickAt: parseDateOnly('2026-02-10'),
      }),
      integration(),
      NOW,
    );
    assert.ok(item);
    const reason = item!.reasons.find((r) => r.code === 'stale_work');
    assert.ok(reason);
    assert.match(reason!.label, /Работы не проводились 91/);
  });

  it('assigns domain expiry priority by remaining days', () => {
    const critical = evaluateWebsiteAttention(
      website({ lastWorkAt: parseDateOnly('2026-07-20') }),
      integration({
        dsdSnapshot: {
          status: 'online',
          lastPingMs: 10,
          isDnsValid: true,
          domainExpiresAt: '2026-08-05',
          server: null,
        },
      }),
      NOW,
    );
    assert.equal(critical!.priority, 'critical');
    assert.ok(critical!.reasons.some((r) => r.code === 'domain_expiring' && r.priority === 'critical'));

    const high = evaluateWebsiteAttention(
      website({ lastWorkAt: parseDateOnly('2026-07-20') }),
      integration({
        dsdSnapshot: {
          status: 'online',
          lastPingMs: 10,
          isDnsValid: true,
          domainExpiresAt: '2026-08-12',
          server: null,
        },
      }),
      NOW,
    );
    assert.ok(high!.reasons.some((r) => r.code === 'domain_expiring' && r.priority === 'high'));

    const medium = evaluateWebsiteAttention(
      website({ lastWorkAt: parseDateOnly('2026-07-20') }),
      integration({
        dsdSnapshot: {
          status: 'online',
          lastPingMs: 10,
          isDnsValid: true,
          domainExpiresAt: '2026-08-25',
          server: null,
        },
      }),
      NOW,
    );
    assert.ok(medium!.reasons.some((r) => r.code === 'domain_expiring' && r.priority === 'medium'));
  });

  it('does not duplicate a website when multiple reasons apply', () => {
    const item = evaluateWebsiteAttention(
      website({
        launchedAt: parseDateOnly('2026-01-01'),
        firstImpressionAt: null,
        firstClickAt: null,
        lastWorkAt: parseDateOnly('2026-01-15'),
      }),
      integration({
        hasGscLinked: false,
        dsdSnapshot: {
          status: 'offline',
          lastPingMs: 0,
          isDnsValid: false,
          domainExpiresAt: '2026-08-03',
          server: null,
        },
      }),
      NOW,
    );
    assert.ok(item);
    assert.equal(item!.websiteId, 'w1');
    assert.ok(item!.reasons.length >= 3);
    const sorted = sortAttentionItems([item!]);
    assert.equal(sorted.length, 1);
  });

  it('uses manual date override as effective launch date', () => {
    const item = evaluateWebsiteAttention(
      website({
        launchedAt: parseDateOnly('2026-07-28'),
        launchedAtManual: parseDateOnly('2026-07-01'),
        firstImpressionAt: null,
        firstClickAt: null,
        lastWorkAt: parseDateOnly('2026-07-20'),
      }),
      integration(),
      NOW,
    );
    assert.ok(item);
    assert.ok(item!.reasons.some((r) => r.code === 'no_impressions'));
    assert.equal(item!.launchedAt?.toISOString().slice(0, 10), '2026-07-01');
  });

  it('does not break on invalid DSD externalData', () => {
    const bad = parseDsdExternalSnapshot({ foo: 'bar' });
    assert.equal(bad, null);

    const item = evaluateWebsiteAttention(
      website({ lastWorkAt: parseDateOnly('2026-07-20') }),
      integration({ dsdSnapshot: null, dsdStatus: 'LINKED' }),
      NOW,
    );
    assert.ok(item);
    assert.ok(item!.reasons.some((r) => r.code === 'missing_dsd_data'));
  });
});

describe('filterAttentionItems', () => {
  it('filters by focus without duplicating sites', () => {
    const a = evaluateWebsiteAttention(
      website({ id: 'a', domain: 'a.com', lastWorkAt: parseDateOnly('2026-07-20') }),
      integration({ hasGscLinked: false }),
      NOW,
    )!;
    const b = evaluateWebsiteAttention(
      website({
        id: 'b',
        domain: 'b.com',
        launchedAt: parseDateOnly('2026-07-01'),
        firstImpressionAt: null,
        firstClickAt: null,
        lastWorkAt: parseDateOnly('2026-07-20'),
      }),
      integration(),
      NOW,
    )!;
    const filtered = filterAttentionItems([a, b], {
      focus: 'no_gsc',
      q: '',
      group: '',
      stage: '',
      priority: '',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.domain, 'a.com');
  });
});
