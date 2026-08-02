import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addLocalDays,
  computeBackoffMs,
  getLocalParts,
  nextDailyRunAt,
  nextIntervalRunAt,
  shouldForceFullReconciliation,
} from './scheduler';
import { loadWorkerConfig } from './config';
import { classifyHeartbeatAge } from './heartbeat';
import { createWorkerId, shortWorkerId } from './identity';

describe('worker config', () => {
  it('disables worker when WORKER_ENABLED=false', () => {
    const config = loadWorkerConfig({ WORKER_ENABLED: 'false' });
    assert.equal(config.enabled, false);
  });

  it('uses safe defaults for invalid intervals', () => {
    const config = loadWorkerConfig({
      DSD_SYNC_INTERVAL_MINUTES: '0',
      GSC_PROPERTIES_SYNC_INTERVAL_HOURS: '-1',
    });
    assert.equal(config.dsdIntervalMs, 15 * 60_000);
    assert.equal(config.gscPropertiesIntervalMs, 6 * 3_600_000);
  });
});

describe('worker identity', () => {
  it('creates opaque worker id and short label', () => {
    const id = createWorkerId();
    assert.match(id, /-\d+-[a-f0-9]+$/);
    const short = shortWorkerId(id);
    assert.ok(short.length <= id.length);
    assert.equal(short.includes(String(process.pid)) || short.length > 0, true);
  });
});

describe('heartbeat age', () => {
  it('classifies online / stale / offline', () => {
    const now = new Date('2026-08-02T12:00:00.000Z');
    assert.equal(
      classifyHeartbeatAge({
        lastHeartbeatAt: new Date('2026-08-02T11:59:30.000Z'),
        staleMs: 120_000,
        now,
      }),
      'online',
    );
    assert.equal(
      classifyHeartbeatAge({
        lastHeartbeatAt: new Date('2026-08-02T11:56:00.000Z'),
        staleMs: 120_000,
        now,
      }),
      'stale',
    );
    assert.equal(
      classifyHeartbeatAge({
        lastHeartbeatAt: new Date('2026-08-02T11:00:00.000Z'),
        staleMs: 120_000,
        now,
      }),
      'offline',
    );
    assert.equal(classifyHeartbeatAge({ lastHeartbeatAt: null, staleMs: 120_000, now }), 'offline');
  });
});

describe('scheduler intervals', () => {
  it('runs immediately when never finished', () => {
    const now = new Date('2026-08-02T12:00:00.000Z');
    const next = nextIntervalRunAt({ lastFinishedAt: null, intervalMs: 15 * 60_000, now });
    assert.equal(next.toISOString(), now.toISOString());
  });

  it('schedules future run after interval', () => {
    const now = new Date('2026-08-02T12:00:00.000Z');
    const last = new Date('2026-08-02T11:50:00.000Z');
    const next = nextIntervalRunAt({ lastFinishedAt: last, intervalMs: 15 * 60_000, now });
    assert.equal(next.toISOString(), '2026-08-02T12:05:00.000Z');
  });

  it('catch-up once when overdue (no burst)', () => {
    const now = new Date('2026-08-02T14:00:00.000Z');
    const last = new Date('2026-08-02T10:00:00.000Z');
    const next = nextIntervalRunAt({ lastFinishedAt: last, intervalMs: 15 * 60_000, now });
    assert.equal(next.toISOString(), now.toISOString());
  });
});

describe('scheduler daily / DST helpers', () => {
  it('computes local parts in Europe/Belgrade', () => {
    const parts = getLocalParts(new Date('2026-07-15T12:00:00.000Z'), 'Europe/Belgrade');
    assert.equal(parts.ymd, '2026-07-15');
    assert.equal(parts.hour, 14);
  });

  it('adds local calendar days', () => {
    assert.equal(addLocalDays('2026-03-28', 1), '2026-03-29');
  });

  it('runs daily at most once per local day after completion', () => {
    const now = new Date('2026-08-02T10:00:00.000Z'); // 12:00 Belgrade summer
    const next = nextDailyRunAt({
      hour: 5,
      timeZone: 'Europe/Belgrade',
      lastLocalYmd: '2026-08-02',
      now,
    });
    const parts = getLocalParts(next, 'Europe/Belgrade');
    assert.equal(parts.ymd, '2026-08-03');
    assert.equal(parts.hour, 5);
  });

  it('catch-up once when daily slot was missed today', () => {
    const now = new Date('2026-08-02T10:00:00.000Z');
    const next = nextDailyRunAt({
      hour: 5,
      timeZone: 'Europe/Belgrade',
      lastLocalYmd: null,
      now,
    });
    assert.equal(next.toISOString(), now.toISOString());
  });

  it('forces full reconciliation only in matching hour once per day', () => {
    const now = new Date('2026-08-02T01:30:00.000Z'); // 03:30 Belgrade
    assert.equal(
      shouldForceFullReconciliation({
        hour: 3,
        timeZone: 'Europe/Belgrade',
        lastFullLocalYmd: null,
        now,
      }),
      true,
    );
    assert.equal(
      shouldForceFullReconciliation({
        hour: 3,
        timeZone: 'Europe/Belgrade',
        lastFullLocalYmd: '2026-08-02',
        now,
      }),
      false,
    );
  });
});

describe('backoff', () => {
  it('grows exponentially up to max', () => {
    assert.equal(
      computeBackoffMs({ consecutiveFailures: 1, baseMs: 60_000, maxMs: 900_000 }),
      60_000,
    );
    assert.equal(
      computeBackoffMs({ consecutiveFailures: 3, baseMs: 60_000, maxMs: 900_000 }),
      240_000,
    );
    assert.equal(
      computeBackoffMs({ consecutiveFailures: 20, baseMs: 60_000, maxMs: 900_000 }),
      900_000,
    );
  });
});
