import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Website } from '@prisma/client';
import { ZodError } from 'zod';
import { assertAuthenticated, UnauthorizedError } from '../auth/session';
import {
  EVENT_TYPE_DATE_OVERRIDE_CLEARED,
  EVENT_TYPE_DATE_OVERRIDE_SET,
  EVENT_TYPE_DATE_OVERRIDE_UPDATED,
} from '../constants';
import { formatDateOnlyRu, parseDateOnly } from './date-only';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveGscAddedDate,
  getEffectiveLaunchDate,
} from './effective';
import { planDateOverrideClear, planDateOverrideSet } from './overrides';

function baseWebsite(overrides: Partial<Website> = {}): Website {
  return {
    id: 'site-1',
    domain: 'example.com',
    normalizedDomain: 'example.com',
    name: null,
    primaryUrl: null,
    status: 'ACTIVE',
    lifecycleStage: 'LAUNCHED',
    group: null,
    tags: [],
    launchedAt: parseDateOnly('2026-01-10'),
    launchedAtManual: null,
    launchDateSource: null,
    firstHealthyAt: null,
    gscFirstSeenAt: parseDateOnly('2026-02-01'),
    gscAddedAtManual: null,
    firstImpressionAt: parseDateOnly('2026-03-01'),
    firstImpressionAtManual: null,
    firstClickAt: parseDateOnly('2026-03-05'),
    firstClickAtManual: null,
    lastWorkAt: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Website;
}

describe('effective website dates', () => {
  it('uses automatic value when manual override is absent', () => {
    const website = baseWebsite();
    assert.equal(
      getEffectiveLaunchDate(website)?.toISOString(),
      parseDateOnly('2026-01-10').toISOString(),
    );
    assert.equal(
      getEffectiveGscAddedDate(website)?.toISOString(),
      parseDateOnly('2026-02-01').toISOString(),
    );
    assert.equal(
      getEffectiveFirstImpressionDate(website)?.toISOString(),
      parseDateOnly('2026-03-01').toISOString(),
    );
    assert.equal(
      getEffectiveFirstClickDate(website)?.toISOString(),
      parseDateOnly('2026-03-05').toISOString(),
    );
  });

  it('prefers manual override over automatic', () => {
    const website = baseWebsite({
      launchedAtManual: parseDateOnly('2026-01-20'),
      gscAddedAtManual: parseDateOnly('2026-02-15'),
      firstImpressionAtManual: parseDateOnly('2026-03-10'),
      firstClickAtManual: parseDateOnly('2026-03-12'),
    });
    assert.equal(getEffectiveLaunchDate(website)?.toISOString(), parseDateOnly('2026-01-20').toISOString());
    assert.equal(getEffectiveGscAddedDate(website)?.toISOString(), parseDateOnly('2026-02-15').toISOString());
    assert.equal(
      getEffectiveFirstImpressionDate(website)?.toISOString(),
      parseDateOnly('2026-03-10').toISOString(),
    );
    assert.equal(getEffectiveFirstClickDate(website)?.toISOString(), parseDateOnly('2026-03-12').toISOString());
  });

  it('falls back to automatic after clearing manual', () => {
    const withManual = baseWebsite({ launchedAtManual: parseDateOnly('2026-01-20') });
    assert.equal(getEffectiveLaunchDate(withManual)?.toISOString(), parseDateOnly('2026-01-20').toISOString());
    const cleared = { ...withManual, launchedAtManual: null };
    assert.equal(getEffectiveLaunchDate(cleared)?.toISOString(), parseDateOnly('2026-01-10').toISOString());
  });
});

describe('date-only timezone safety', () => {
  it('does not shift calendar day when formatting', () => {
    const date = parseDateOnly('2026-07-31');
    assert.equal(date.toISOString(), '2026-07-31T00:00:00.000Z');
    assert.equal(formatDateOnlyRu(date), '31 июля 2026 г.');
  });
});

describe('date override validation and plans', () => {
  it('rejects invalid calendar date', () => {
    assert.throws(
      () =>
        planDateOverrideSet(baseWebsite(), {
          field: 'launchedAt',
          date: '2026-02-31',
          reason: 'Причина достаточная',
        }),
      ZodError,
    );
  });

  it('rejects future dates', () => {
    assert.throws(
      () =>
        planDateOverrideSet(baseWebsite(), {
          field: 'launchedAt',
          date: '2099-01-01',
          reason: 'Причина достаточная',
        }),
      ZodError,
    );
  });

  it('rejects empty or too short reason', () => {
    assert.throws(
      () =>
        planDateOverrideSet(baseWebsite(), {
          field: 'launchedAt',
          date: '2026-01-15',
          reason: 'ab',
        }),
      ZodError,
    );
    assert.throws(
      () =>
        planDateOverrideSet(baseWebsite(), {
          field: 'launchedAt',
          date: '2026-01-15',
          reason: '   ',
        }),
      ZodError,
    );
  });

  it('creates DATE_OVERRIDE_SET plan with audit metadata', () => {
    const plan = planDateOverrideSet(baseWebsite(), {
      field: 'firstImpressionAt',
      date: '2026-03-08',
      reason: 'Уточнили по выгрузке',
    });
    assert.equal(plan.eventType, EVENT_TYPE_DATE_OVERRIDE_SET);
    assert.match(plan.title, /первых показов/i);
    assert.equal(plan.metadata.field, 'firstImpressionAt');
    assert.equal(plan.metadata.reason, 'Уточнили по выгрузке');
    assert.equal(plan.metadata.previousManualValue, null);
    assert.equal(plan.metadata.newManualValue, '8 марта 2026 г.');
    assert.equal(plan.metadata.previousEffectiveValue, '1 марта 2026 г.');
    assert.equal(plan.metadata.newEffectiveValue, '8 марта 2026 г.');
  });

  it('creates DATE_OVERRIDE_UPDATED without mutating previous plan identity', () => {
    const website = baseWebsite({
      firstClickAtManual: parseDateOnly('2026-03-07'),
    });
    const first = planDateOverrideSet(website, {
      field: 'firstClickAt',
      date: '2026-03-08',
      reason: 'Первая правка',
    });
    const second = planDateOverrideSet(
      { ...website, firstClickAtManual: parseDateOnly('2026-03-08') },
      {
        field: 'firstClickAt',
        date: '2026-03-09',
        reason: 'Вторая правка',
      },
    );
    assert.equal(first.eventType, EVENT_TYPE_DATE_OVERRIDE_UPDATED);
    assert.equal(second.eventType, EVENT_TYPE_DATE_OVERRIDE_UPDATED);
    assert.notEqual(first.metadata.newManualValue, second.metadata.newManualValue);
    assert.equal(first.metadata.reason, 'Первая правка');
    assert.equal(second.metadata.previousManualValue, '8 марта 2026 г.');
  });

  it('creates DATE_OVERRIDE_CLEARED plan', () => {
    const website = baseWebsite({
      launchedAtManual: parseDateOnly('2026-01-20'),
    });
    const plan = planDateOverrideClear(website, {
      field: 'launchedAt',
      reason: 'Вернулись к системной дате',
    });
    assert.equal(plan.eventType, EVENT_TYPE_DATE_OVERRIDE_CLEARED);
    assert.equal(plan.metadata.newManualValue, null);
    assert.equal(plan.metadata.newEffectiveValue, '10 января 2026 г.');
    assert.equal(plan.websiteData.launchedAtManual, null);
  });
});

describe('unauthorized date changes', () => {
  it('rejects missing session before date mutation', () => {
    assert.throws(() => assertAuthenticated(null), UnauthorizedError);
    assert.doesNotThrow(() =>
      assertAuthenticated({
        email: 'admin@example.com',
        scope: 'admin',
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    );
  });
});
