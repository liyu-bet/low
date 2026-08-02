import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDsdSitesUrl,
  checkDsdHealth,
  DsdApiError,
  fetchAllDsdSites,
  fetchDsdSitesPage,
  getBearerAuthorizationHeader,
} from './client';
import type { DsdClientConfig } from './config';

const config: DsdClientConfig = {
  baseUrl: 'http://localhost:3000',
  token: 'test-token-secret-value',
  timeoutMs: 50,
  pageSize: 2,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('DSD client', () => {
  it('sends Bearer authorization header', async () => {
    assert.equal(getBearerAuthorizationHeader('abc'), 'Bearer abc');
    let sawAuth = '';
    await checkDsdHealth(config, async (_url, init) => {
      const headers = new Headers(init?.headers);
      sawAuth = headers.get('Authorization') ?? '';
      return jsonResponse({ ok: true, service: 'dsd', generatedAt: '2026-08-02T00:00:00.000Z' });
    });
    assert.equal(sawAuth, 'Bearer test-token-secret-value');
  });

  it('paginates until nextCursor is null and detects cursor loops', async () => {
    const pages = [
      {
        items: [
          sampleSite('1'),
          sampleSite('2'),
        ],
        nextCursor: 'cursor-a',
        generatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        items: [sampleSite('3')],
        nextCursor: null,
        generatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];
    let calls = 0;
    const sites = await fetchAllDsdSites(config, async () => jsonResponse(pages[calls++]));
    assert.equal(sites.length, 3);

    await assert.rejects(
      () =>
        fetchAllDsdSites(config, async () =>
          jsonResponse({
            items: [sampleSite('1')],
            nextCursor: 'same',
            generatedAt: '2026-08-02T00:00:00.000Z',
          }),
        ),
      (error: unknown) => error instanceof DsdApiError && error.code === 'DSD_CURSOR_LOOP',
    );
  });

  it('times out via AbortController', async () => {
    await assert.rejects(
      () =>
        checkDsdHealth(config, async (_url, init) => {
          const signal = init?.signal;
          return new Promise((_resolve, reject) => {
            signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }),
      (error: unknown) => error instanceof DsdApiError && error.code === 'DSD_TIMEOUT',
    );
  });

  it('rejects invalid response and hides token in errors', async () => {
    await assert.rejects(
      () => checkDsdHealth(config, async () => jsonResponse({ ok: false })),
      (error: unknown) =>
        error instanceof DsdApiError &&
        error.code === 'DSD_INVALID_RESPONSE' &&
        !error.message.includes(config.token),
    );

    const page = await fetchDsdSitesPage({}, config, async (url) => {
      assert.match(String(url), /limit=2/);
      return jsonResponse({
        items: [sampleSite('1')],
        nextCursor: null,
        generatedAt: '2026-08-02T00:00:00.000Z',
      });
    });
    assert.equal(page.items.length, 1);
    assert.equal(
      buildDsdSitesUrl(config.baseUrl, { limit: 10, cursor: 'abc' }),
      'http://localhost:3000/api/integrations/low/sites?limit=10&cursor=abc',
    );
  });
});

function sampleSite(id: string) {
  return {
    id,
    url: `https://site-${id}.example.com`,
    status: 'online',
    lastPingMs: 120,
    isDnsValid: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    firstHealthyAt: '2026-01-01T12:00:00.000Z',
    domainExpiresAt: '2027-01-01T00:00:00.000Z',
    apexARecord: '1.2.3.4',
    server: { id: 'srv1', name: 'box', ip: '1.2.3.4', status: 'online' },
    accounts: [
      {
        provider: 'cloudflare',
        externalId: 'cf1',
        name: 'CF',
        hasCredential: true,
      },
    ],
  };
}
