import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DomainNormalizationError } from '../domain/normalize';
import {
  DuplicateDomainError,
  prepareWebsiteCreateData,
  throwIfDuplicateDomain,
} from './service';

describe('website create preparation', () => {
  it('creates a normalized domain from a URL-like input', () => {
    const { data } = prepareWebsiteCreateData({
      domain: 'https://WWW.Example.com/path',
      name: 'Example',
    });
    assert.equal(data.normalizedDomain, 'example.com');
    assert.equal(data.domain, 'www.example.com');
    assert.equal(data.name, 'Example');
  });

  it('rejects an invalid domain', () => {
    assert.throws(
      () => prepareWebsiteCreateData({ domain: 'not a domain' }),
      DomainNormalizationError,
    );
  });

  it('detects a duplicate normalized domain', () => {
    assert.throws(
      () => throwIfDuplicateDomain({ id: 'existing-id' }, 'example.com'),
      (error: unknown) =>
        error instanceof DuplicateDomainError && error.normalizedDomain === 'example.com',
    );

    assert.doesNotThrow(() =>
      throwIfDuplicateDomain({ id: 'same-id' }, 'example.com', 'same-id'),
    );
    assert.doesNotThrow(() => throwIfDuplicateDomain(null, 'example.com'));
  });
});
