import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveSafeWebsiteOpenUrl,
  resolveWebsiteOpenUrl,
} from './website-open-url';

describe('resolveSafeWebsiteOpenUrl', () => {
  it('uses a valid primaryUrl', () => {
    assert.equal(
      resolveSafeWebsiteOpenUrl('https://www.example.com/path', 'example.com'),
      'https://www.example.com/path',
    );
  });

  it('falls back to https://normalizedDomain', () => {
    assert.equal(resolveSafeWebsiteOpenUrl(null, 'example.com'), 'https://example.com');
    assert.equal(resolveSafeWebsiteOpenUrl('  ', 'example.com'), 'https://example.com');
  });

  it('prefixes scheme-less primaryUrl with https', () => {
    assert.equal(
      resolveSafeWebsiteOpenUrl('www.example.com/blog', 'example.com'),
      'https://www.example.com/blog',
    );
  });

  it('rejects javascript/data/file schemes', () => {
    assert.equal(resolveSafeWebsiteOpenUrl('javascript:alert(1)', 'example.com'), null);
    assert.equal(resolveSafeWebsiteOpenUrl('data:text/html,hi', 'example.com'), null);
    assert.equal(resolveSafeWebsiteOpenUrl('file:///etc/passwd', 'example.com'), null);
  });

  it('rejects non-http schemes', () => {
    assert.equal(resolveSafeWebsiteOpenUrl('ftp://example.com', 'example.com'), null);
  });

  it('returns null for invalid domain fallback', () => {
    assert.equal(resolveSafeWebsiteOpenUrl(null, ''), null);
    assert.equal(resolveSafeWebsiteOpenUrl(null, 'bad domain'), null);
  });

  it('resolveWebsiteOpenUrl keeps a string fallback for profile', () => {
    assert.equal(resolveWebsiteOpenUrl(null, 'example.com'), 'https://example.com');
    assert.match(resolveWebsiteOpenUrl('javascript:x', 'example.com'), /^https:\/\//);
  });
});
