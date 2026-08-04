import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FavoriteNotAllowedError, isArchivedWebsite } from './favorites';

describe('isArchivedWebsite', () => {
  it('treats archivedAt as archived regardless of status/stage', () => {
    assert.equal(
      isArchivedWebsite({ archivedAt: new Date(), status: 'ACTIVE', lifecycleStage: 'GROWING' }),
      true,
    );
  });

  it('treats ARCHIVED status as archived', () => {
    assert.equal(
      isArchivedWebsite({ archivedAt: null, status: 'ARCHIVED', lifecycleStage: 'GROWING' }),
      true,
    );
  });

  it('treats ARCHIVED lifecycle stage as archived', () => {
    assert.equal(
      isArchivedWebsite({ archivedAt: null, status: 'ACTIVE', lifecycleStage: 'ARCHIVED' }),
      true,
    );
  });

  it('is false for a normal active website', () => {
    assert.equal(
      isArchivedWebsite({ archivedAt: null, status: 'ACTIVE', lifecycleStage: 'GROWING' }),
      false,
    );
  });
});

describe('FavoriteNotAllowedError', () => {
  it('carries a Russian message and a distinct name', () => {
    const error = new FavoriteNotAllowedError('Архивный сайт нельзя добавить в избранное');
    assert.equal(error.name, 'FavoriteNotAllowedError');
    assert.equal(error.message, 'Архивный сайт нельзя добавить в избранное');
    assert.ok(error instanceof Error);
  });
});
