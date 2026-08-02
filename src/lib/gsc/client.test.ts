import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkGscHealth,
  fetchAllGscProperties,
  fetchGscPropertiesPage,
  fetchGscPropertyLifecycle,
  GscApiError,
  getBearerAuthorizationHeader,
} from './client';
import type { GscClientConfig } from './config';
import { gscLifecycleSchema } from './schemas';

const config: GscClientConfig = {
  baseUrl: 'http://gsc.test',
  token: 'secret-gsc-token-value',
  timeoutMs: 50,
  pageSize: 2,
  lifecycleConcurrency: 4,
  lifecycleMaxPropertiesPerRun: 500,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('gsc client', () => {
  it('sends Bearer authorization header', async () => {
    let auth: string | null = null;
    await checkGscHealth(config, async (_url, init) => {
      auth = new Headers(init?.headers).get('authorization');
      return jsonResponse({
        ok: true,
        service: 'gsc',
        generatedAt: '2026-08-02T00:00:00.000Z',
      });
    });
    assert.equal(auth, getBearerAuthorizationHeader(config.token));
  });

  it('does not include token in error messages', async () => {
    await assert.rejects(
      () =>
        checkGscHealth(config, async () => {
          throw new Error(`boom ${config.token}`);
        }),
      (error: unknown) => {
        assert.ok(error instanceof GscApiError);
        assert.equal(error.message.includes(config.token), false);
        assert.ok(error.message.includes('[redacted]'));
        return true;
      },
    );
  });

  it('handles timeout', async () => {
    await assert.rejects(
      () =>
        checkGscHealth(config, async (_url, init) => {
          const signal = init?.signal;
          return new Promise((_resolve, reject) => {
            signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }),
      (error: unknown) => {
        assert.ok(error instanceof GscApiError);
        assert.equal(error.code, 'GSC_TIMEOUT');
        return true;
      },
    );
  });

  it('rejects invalid properties response', async () => {
    await assert.rejects(
      () =>
        fetchGscPropertiesPage({}, config, async () =>
          jsonResponse({ items: 'nope', nextCursor: null, generatedAt: 'x' }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof GscApiError);
        assert.equal(error.code, 'GSC_INVALID_RESPONSE');
        return true;
      },
    );
  });

  it('rejects invalid lifecycle response', async () => {
    await assert.rejects(
      () =>
        fetchGscPropertyLifecycle('p1', config, async () =>
          jsonResponse({ propertyId: 'p1', siteUrl: 'x' }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof GscApiError);
        assert.equal(error.code, 'GSC_INVALID_RESPONSE');
        return true;
      },
    );
  });

  it('rejects lifecycle dates outside searched range', () => {
    const parsed = gscLifecycleSchema.safeParse({
      propertyId: 'p1',
      siteUrl: 'sc-domain:example.com',
      firstImpressionDate: '2024-01-01',
      firstClickDate: null,
      searchedFrom: '2025-04-01',
      searchedTo: '2025-04-10',
      dateMeaning: 'earliest_available_in_search_console_api',
      generatedAt: '2026-08-02T00:00:00.000Z',
    });
    assert.equal(parsed.success, false);
  });

  it('loads all property pages', async () => {
    let calls = 0;
    const items = await fetchAllGscProperties(config, async (url) => {
      calls += 1;
      const cursor = new URL(String(url)).searchParams.get('cursor');
      if (!cursor) {
        return jsonResponse({
          items: [
            property('a'),
            property('b'),
          ],
          nextCursor: 'c1',
          generatedAt: '2026-08-02T00:00:00.000Z',
        });
      }
      return jsonResponse({
        items: [property('c')],
        nextCursor: null,
        generatedAt: '2026-08-02T00:00:00.000Z',
      });
    });
    assert.equal(calls, 2);
    assert.deepEqual(
      items.map((p) => p.id),
      ['a', 'b', 'c'],
    );
  });

  it('detects repeating cursor', async () => {
    await assert.rejects(
      () =>
        fetchAllGscProperties(config, async () =>
          jsonResponse({
            items: [property('a')],
            nextCursor: 'same',
            generatedAt: '2026-08-02T00:00:00.000Z',
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof GscApiError);
        assert.equal(error.code, 'GSC_CURSOR_LOOP');
        return true;
      },
    );
  });
});

function property(id: string) {
  return {
    id,
    siteUrl: `sc-domain:${id}.com`,
    permissionLevel: 'siteOwner',
    label: null,
    isSelected: true,
    firstSeenAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    connection: { id: 'conn', email: 'a@example.com', name: 'A' },
  };
}
