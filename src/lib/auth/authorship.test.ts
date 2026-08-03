import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveActorLabel } from './actor-label';
import { taskCreateSchema } from '../validations/task';

describe('task authorship helpers', () => {
  it('ignores forged createdBy in create schema (field not in schema)', () => {
    const parsed = taskCreateSchema.parse({
      websiteId: 'w1',
      title: 'Do thing',
      createdBy: 'attacker',
      createdByUserId: 'attacker-id',
    });
    assert.equal('createdBy' in parsed, false);
    assert.equal('createdByUserId' in parsed, false);
    assert.equal(parsed.title, 'Do thing');
  });

  it('defaults assignee to self when field absent', () => {
    const parsed = taskCreateSchema.parse({
      websiteId: 'w1',
      title: 'Quick',
    });
    assert.equal(parsed.assignedToUserId, 'self');
  });

  it('resolves actor label with relation then legacy fallback', () => {
    assert.equal(
      resolveActorLabel({ user: { name: 'Анна', email: 'a@x.com' }, legacy: 'old' }),
      'Анна',
    );
    assert.equal(resolveActorLabel({ user: null, legacy: 'legacy@x.com' }), 'legacy@x.com');
    assert.equal(resolveActorLabel({ user: null, legacy: null }), 'Неизвестно');
  });
});
