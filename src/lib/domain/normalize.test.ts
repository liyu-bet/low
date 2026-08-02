import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DomainNormalizationError,
  normalizeDomain,
  resolveGscAddedAt,
} from './normalize';

describe('normalizeDomain', () => {
  it('lowercases and trims', () => {
    assert.equal(normalizeDomain('  Example.COM '), 'example.com');
  });

  it('accepts bare domains', () => {
    assert.equal(normalizeDomain('shop.example.co.uk'), 'shop.example.co.uk');
  });

  it('strips scheme, path, query, hash, port, and credentials', () => {
    assert.equal(
      normalizeDomain('https://user:pass@WWW.Example.com:8443/path?q=1#hash'),
      'example.com',
    );
  });

  it('strips leading www and trailing dot', () => {
    assert.equal(normalizeDomain('www.example.com.'), 'example.com');
  });

  it('handles protocol-relative and http URLs', () => {
    assert.equal(normalizeDomain('http://www.sub.example.com/a'), 'sub.example.com');
  });

  it('converts IDN to punycode', () => {
    assert.equal(normalizeDomain('https://пример.рф/path'), 'xn--e1afmkfd.xn--p1ai');
    assert.equal(normalizeDomain('сайт.example.com'), 'xn--80aswg.example.com');
    assert.equal(normalizeDomain('münchen.de'), 'xn--mnchen-3ya.de');
  });

  it('allows localhost for local matching', () => {
    assert.equal(normalizeDomain('http://localhost:3000'), 'localhost');
  });

  it('rejects empty input', () => {
    assert.throws(() => normalizeDomain('   '), DomainNormalizationError);
  });

  it('rejects invalid hosts', () => {
    assert.throws(() => normalizeDomain('not a domain'), DomainNormalizationError);
    assert.throws(() => normalizeDomain('http://'), DomainNormalizationError);
  });
});

describe('resolveGscAddedAt', () => {
  it('prefers manual override over first seen', () => {
    const manual = new Date('2024-01-10T00:00:00.000Z');
    const firstSeen = new Date('2024-01-01T00:00:00.000Z');
    assert.equal(
      resolveGscAddedAt({ gscAddedAtManual: manual, gscFirstSeenAt: firstSeen })?.toISOString(),
      manual.toISOString(),
    );
  });

  it('falls back to first seen, then null', () => {
    const firstSeen = new Date('2024-01-01T00:00:00.000Z');
    assert.equal(
      resolveGscAddedAt({ gscAddedAtManual: null, gscFirstSeenAt: firstSeen })?.toISOString(),
      firstSeen.toISOString(),
    );
    assert.equal(resolveGscAddedAt({ gscAddedAtManual: null, gscFirstSeenAt: null }), null);
  });
});
