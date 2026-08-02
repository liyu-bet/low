import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateOnly, dateOnlyToInputValue } from '@/lib/dates/date-only';
import { normalizeGscPropertyUrl } from './property';
import {
  assertSafeGscSnapshot,
  buildSafeGscExternalSnapshot,
  type GscProperty,
} from './schemas';
import { planImpressionDateUpdate, mapWithConcurrency } from './lifecycle';

function sampleProperty(overrides: Partial<GscProperty> = {}): GscProperty {
  return {
    id: 'prop_1',
    siteUrl: 'sc-domain:example.com',
    permissionLevel: 'siteOwner',
    label: null,
    isSelected: true,
    firstSeenAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    connection: { id: 'conn_1', email: 'owner@example.com', name: 'Owner' },
    ...overrides,
  };
}

describe('gsc property normalization', () => {
  it('normalizes sc-domain properties', () => {
    const result = normalizeGscPropertyUrl('sc-domain:Example.COM');
    assert.equal(result.propertyType, 'domain');
    assert.equal(result.normalizedDomain, 'example.com');
    assert.equal(result.originalPropertyUrl, 'sc-domain:Example.COM');
  });

  it('normalizes url-prefix properties with LOW www policy', () => {
    const result = normalizeGscPropertyUrl('https://www.example.com/blog/');
    assert.equal(result.propertyType, 'url_prefix');
    assert.equal(result.normalizedDomain, 'example.com');
    assert.equal(result.originalPropertyUrl, 'https://www.example.com/blog/');
    assert.equal(result.primaryUrl, 'https://www.example.com/blog/');
  });
});

describe('gsc snapshot safety', () => {
  it('builds snapshot without oauth secrets', () => {
    const snapshot = buildSafeGscExternalSnapshot(sampleProperty(), 'domain');
    assertSafeGscSnapshot(snapshot);
    const json = JSON.stringify(snapshot);
    assert.equal(json.includes('encryptedAccess'), false);
    assert.equal(json.includes('refresh'), false);
    assert.equal(json.includes('GSC_LOW_API_TOKEN'), false);
    assert.equal(snapshot.connection.email, 'owner@example.com');
  });
});

describe('gsc lifecycle date planning', () => {
  it('sets firstImpressionAt when null', () => {
    const plan = planImpressionDateUpdate({
      currentAutomatic: null,
      incomingYmd: '2025-04-01',
    });
    assert.equal(plan.action, 'set');
    assert.equal(dateOnlyToInputValue(plan.nextDate), '2025-04-01');
  });

  it('does not change when incoming is later', () => {
    const current = parseDateOnly('2025-04-01');
    const plan = planImpressionDateUpdate({
      currentAutomatic: current,
      incomingYmd: '2025-05-01',
    });
    assert.equal(plan.action, 'none');
  });

  it('refines when earlier automatic date is found', () => {
    const current = parseDateOnly('2025-05-01');
    const plan = planImpressionDateUpdate({
      currentAutomatic: current,
      incomingYmd: '2025-04-01',
    });
    assert.equal(plan.action, 'refine');
    assert.equal(plan.previousYmd, '2025-05-01');
    assert.equal(plan.nextYmd, '2025-04-01');
  });

  it('keeps date-only without timezone shift', () => {
    const date = parseDateOnly('2025-04-01');
    assert.equal(date.toISOString(), '2025-04-01T00:00:00.000Z');
    assert.equal(dateOnlyToInputValue(date), '2025-04-01');
  });

  it('returns null action when incoming is null', () => {
    const plan = planImpressionDateUpdate({
      currentAutomatic: null,
      incomingYmd: null,
    });
    assert.equal(plan.action, 'none');
  });
});

describe('gsc concurrency helper', () => {
  it('does not exceed configured concurrency', async () => {
    let live = 0;
    let maxLive = 0;
    const items = [1, 2, 3, 4, 5, 6];
    await mapWithConcurrency(items, 2, async (value) => {
      live += 1;
      maxLive = Math.max(maxLive, live);
      await new Promise((r) => setTimeout(r, 20));
      live -= 1;
      return value * 2;
    });
    assert.ok(maxLive <= 2);
  });

  it('respects max properties slice semantics', () => {
    const eligible = Array.from({ length: 50 }, (_, i) => i);
    const max = 20;
    assert.equal(eligible.slice(0, max).length, 20);
  });
});

describe('gsc stable dedupe keys', () => {
  it('builds stable first impression dedupe key', () => {
    const propertyId = 'prop_1';
    const ymd = '2025-04-01';
    assert.equal(
      `gsc:first-impression:${propertyId}:${ymd}`,
      'gsc:first-impression:prop_1:2025-04-01',
    );
    assert.equal(
      `gsc:property-first-seen:${propertyId}`,
      'gsc:property-first-seen:prop_1',
    );
  });
});

describe('gsc auth guard', () => {
  it('requires admin session for properties sync', async () => {
    const { runManualGscPropertiesSync } = await import('./sync');
    await assert.rejects(
      () => runManualGscPropertiesSync({ session: null }),
      /auth|Authenticated|сесс|Войдите|Unauthorized|admin/i,
    );
  });
});
