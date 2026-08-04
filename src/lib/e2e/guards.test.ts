import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertE2eSeedAllowed,
  assertSafeE2eBaseUrl,
  assertSafeE2eDatabaseUrl,
} from './guards';

describe('e2e guards', () => {
  it('accepts local base URLs', () => {
    assert.equal(assertSafeE2eBaseUrl('http://127.0.0.1:8082'), 'http://127.0.0.1:8082');
    assert.equal(assertSafeE2eBaseUrl('http://localhost:8082/'), 'http://localhost:8082');
  });

  it('rejects production base URLs', () => {
    assert.throws(() => assertSafeE2eBaseUrl('https://low.liyu.bet'), /production|Refusing/);
    assert.throws(() => assertSafeE2eBaseUrl('https://example.com'), /non-local/);
  });

  it('accepts local database URLs', () => {
    const url = 'postgresql://low_e2e:pass@127.0.0.1:5432/low_e2e';
    assert.equal(assertSafeE2eDatabaseUrl(url), url);
  });

  it('rejects production database URLs', () => {
    assert.throws(
      () => assertSafeE2eDatabaseUrl('postgresql://u:p@db.low.liyu.bet:5432/low'),
      /production|Refusing/,
    );
    assert.throws(
      () => assertSafeE2eDatabaseUrl('postgresql://u:p@xxx.amazonaws.com:5432/low'),
      /Refusing/,
    );
  });

  it('requires NODE_ENV=test or E2E_ALLOW_SEED=1', () => {
    assert.throws(
      () =>
        assertE2eSeedAllowed({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://low_e2e:pass@127.0.0.1:5432/low_e2e',
        }),
      /e2e seed refused/,
    );
    assert.doesNotThrow(() =>
      assertE2eSeedAllowed({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://low_e2e:pass@127.0.0.1:5432/low_e2e',
      }),
    );
    assert.doesNotThrow(() =>
      assertE2eSeedAllowed({
        NODE_ENV: 'development',
        E2E_ALLOW_SEED: '1',
        DATABASE_URL: 'postgresql://low_e2e:pass@127.0.0.1:5432/low_e2e',
      }),
    );
  });
});
