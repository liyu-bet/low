import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EventCategory } from '@prisma/client';
import { ZodError } from 'zod';
import {
  manualEventSchema,
  resolveManualEventCategory,
  toAmountMinor,
} from '../validations/event';

describe('manualEventSchema', () => {
  it('accepts a valid manual event and normalizes money', () => {
    const parsed = manualEventSchema.parse({
      eventType: 'note',
      title: 'Проверка DNS',
      description: 'Обновил NS',
      occurredAt: '2026-07-31',
      amount: '12,50',
      currency: 'rub',
    });

    assert.equal(parsed.eventType, 'note');
    assert.equal(parsed.title, 'Проверка DNS');
    assert.equal(parsed.amount, 12.5);
    assert.equal(parsed.currency, 'RUB');
    assert.equal(toAmountMinor(parsed.amount!), 1250);
    assert.equal(resolveManualEventCategory(parsed.eventType), EventCategory.NOTE);
  });

  it('rejects an invalid payload', () => {
    assert.throws(() => manualEventSchema.parse({ eventType: 'note', title: '' }), ZodError);
    assert.throws(
      () =>
        manualEventSchema.parse({
          eventType: 'payment',
          title: 'Оплата',
          occurredAt: '2026-07-31',
          amount: '10',
        }),
      ZodError,
    );
    assert.throws(
      () =>
        manualEventSchema.parse({
          eventType: 'unknown_type',
          title: 'X',
          occurredAt: '2026-07-31',
        }),
      ZodError,
    );
  });
});
