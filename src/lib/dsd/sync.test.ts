import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EVENT_TYPE_DSD_SITE_DISCOVERED,
  EVENT_TYPE_SITE_DOWN,
  EVENT_TYPE_SITE_HEALTHY,
  EVENT_TYPE_SITE_RECOVERED,
} from '../constants';
import { assertAuthenticated, UnauthorizedError } from '../auth/session';
import { planDsdSiteEvents } from './events';
import {
  assertSafeSnapshot,
  buildSafeExternalSnapshot,
  type DsdExternalSnapshot,
  type DsdSite,
} from './schemas';

function site(overrides: Partial<DsdSite> = {}): DsdSite {
  return {
    id: 'dsd-1',
    url: 'https://www.Example.com/path',
    status: 'online',
    lastPingMs: 90,
    isDnsValid: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    firstHealthyAt: '2026-01-02T00:00:00.000Z',
    domainExpiresAt: '2027-06-01T00:00:00.000Z',
    apexARecord: '9.9.9.9',
    server: { id: 's1', name: 'alpha', ip: '9.9.9.9', status: 'online' },
    accounts: [
      { provider: 'registrar', externalId: 'r1', name: 'Reg', hasCredential: true },
    ],
    ...overrides,
  };
}

describe('DSD sync planning', () => {
  it('builds safe snapshot without secrets', () => {
    const snapshot = buildSafeExternalSnapshot(site());
    assert.equal(snapshot.status, 'online');
    assert.equal(snapshot.server?.ip, '9.9.9.9');
    assert.equal(snapshot.accounts?.[0]?.hasCredential, true);
    assert.equal(
      JSON.stringify(snapshot).includes('password') ||
        JSON.stringify(snapshot).includes('token') ||
        JSON.stringify(snapshot).includes('ciphertext'),
      false,
    );
    assert.doesNotThrow(() => assertSafeSnapshot(snapshot));
  });

  it('plans discovery and first healthy on first link', () => {
    const events = planDsdSiteEvents({
      site: site(),
      previousSnapshot: null,
      isFirstLink: true,
      willSetFirstHealthy: true,
    });
    assert.ok(events.some((e) => e.eventType === EVENT_TYPE_DSD_SITE_DISCOVERED));
    assert.ok(events.some((e) => e.eventType === EVENT_TYPE_SITE_HEALTHY));
    assert.equal(
      events.some((e) => e.eventType === EVENT_TYPE_SITE_DOWN),
      false,
    );
    assert.equal(
      events.find((e) => e.eventType === EVENT_TYPE_SITE_HEALTHY)?.dedupeKey,
      'dsd:site:dsd-1:first_healthy',
    );
  });

  it('does not emit SITE_DOWN on first import even if offline', () => {
    const events = planDsdSiteEvents({
      site: site({ status: 'offline' }),
      previousSnapshot: null,
      isFirstLink: true,
      willSetFirstHealthy: false,
    });
    assert.equal(events.some((e) => e.eventType === EVENT_TYPE_SITE_DOWN), false);
    assert.ok(events.some((e) => e.eventType === EVENT_TYPE_DSD_SITE_DISCOVERED));
  });

  it('emits status transitions with stable dedupe keys', () => {
    const previous: DsdExternalSnapshot = buildSafeExternalSnapshot(site({ status: 'online' }));
    const down = planDsdSiteEvents({
      site: site({ status: 'offline', updatedAt: '2026-01-11T00:00:00.000Z' }),
      previousSnapshot: previous,
      isFirstLink: false,
      willSetFirstHealthy: false,
    });
    assert.ok(down.some((e) => e.eventType === EVENT_TYPE_SITE_DOWN));

    const recovered = planDsdSiteEvents({
      site: site({ status: 'online', updatedAt: '2026-01-12T00:00:00.000Z' }),
      previousSnapshot: buildSafeExternalSnapshot(site({ status: 'offline' })),
      isFirstLink: false,
      willSetFirstHealthy: false,
    });
    assert.ok(recovered.some((e) => e.eventType === EVENT_TYPE_SITE_RECOVERED));
  });

  it('keeps event plans idempotent by dedupeKey', () => {
    const a = planDsdSiteEvents({
      site: site(),
      previousSnapshot: null,
      isFirstLink: true,
      willSetFirstHealthy: true,
    });
    const b = planDsdSiteEvents({
      site: site(),
      previousSnapshot: null,
      isFirstLink: true,
      willSetFirstHealthy: true,
    });
    assert.deepEqual(
      a.map((e) => e.dedupeKey).sort(),
      b.map((e) => e.dedupeKey).sort(),
    );
  });

  it('rejects sync without admin session', () => {
    assert.throws(() => assertAuthenticated(null), UnauthorizedError);
  });
});
