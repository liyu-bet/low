import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ZodError, z } from 'zod';
import { ForbiddenError } from '@/lib/auth/session';
import { toSafeActionError, toSafeTaskActionError } from './safe-action';

describe('toSafeActionError', () => {
  it('maps ForbiddenError', () => {
    assert.equal(
      toSafeActionError(new ForbiddenError('Недостаточно прав')),
      'Недостаточно прав',
    );
  });

  it('maps ZodError messages', () => {
    try {
      z.object({ title: z.string().min(1, 'Название обязательно') }).parse({ title: '' });
    } catch (error) {
      assert.ok(error instanceof ZodError);
      assert.match(toSafeActionError(error), /Название обязательно/);
    }
  });

  it('hides Prisma/SQL internals', () => {
    assert.equal(
      toSafeActionError(new Error('PrismaClientKnownRequestError: invalid DATABASE_URL')),
      'Не удалось сохранить изменения',
    );
  });

  it('keeps known user-facing task messages', () => {
    assert.equal(
      toSafeActionError(new Error('Задача уже выполнена')),
      'Задача уже выполнена',
    );
  });

  it('uses task fallback', () => {
    assert.equal(toSafeTaskActionError(new Error('weird internal')), 'Не удалось создать задачу');
  });
});
