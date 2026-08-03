import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getInitials,
  resolveActorLabel,
  resolveDisplayActorLabel,
  shouldShowWebsiteName,
} from './actor-label';
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

  it('rejects empty title', () => {
    assert.throws(() =>
      taskCreateSchema.parse({
        websiteId: 'w1',
        title: '   ',
      }),
    );
  });

  it('accepts title-only create without due date', () => {
    const parsed = taskCreateSchema.parse({
      websiteId: 'w1',
      title: 'Only title',
    });
    assert.equal(parsed.title, 'Only title');
    assert.equal(parsed.dueAt ?? null, null);
    assert.equal(parsed.assignedToUserId, 'self');
  });

  it('resolves actor label with relation then legacy fallback', () => {
    assert.equal(
      resolveActorLabel({ user: { name: 'Анна', email: 'a@x.com' }, legacy: 'old' }),
      'Анна',
    );
    assert.equal(resolveActorLabel({ user: null, legacy: 'legacy@x.com' }), 'legacy@x.com');
    assert.equal(resolveActorLabel({ user: null, legacy: null }), 'Неизвестно');
    assert.equal(
      resolveDisplayActorLabel({ user: null, legacy: null }),
      'Неизвестный пользователь',
    );
  });
});

describe('getInitials', () => {
  it('builds initials from name and email', () => {
    assert.equal(getInitials('Anna Smith'), 'AS');
    assert.equal(getInitials('Анна'), 'А');
    assert.equal(getInitials('anna@example.com'), 'A');
    assert.equal(getInitials(''), '?');
    assert.equal(getInitials('Неизвестный пользователь'), '?');
  });
});

describe('shouldShowWebsiteName', () => {
  it('hides name when it duplicates domain', () => {
    assert.equal(
      shouldShowWebsiteName({
        domain: 'thorfortunefr.com',
        normalizedDomain: 'thorfortunefr.com',
        name: 'thorfortunefr.com',
      }),
      false,
    );
    assert.equal(
      shouldShowWebsiteName({
        domain: 'Example.COM',
        normalizedDomain: 'example.com',
        name: 'Example.com',
      }),
      false,
    );
    assert.equal(
      shouldShowWebsiteName({
        domain: 'example.com',
        normalizedDomain: 'example.com',
        name: 'My Brand',
      }),
      true,
    );
  });
});
