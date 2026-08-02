import {
  type DsdClientConfig,
  requireDsdClientConfig,
} from '@/lib/dsd/config';
import {
  dsdHealthSchema,
  dsdSitesPageSchema,
  type DsdHealth,
  type DsdSite,
  type DsdSitesPage,
} from '@/lib/dsd/schemas';

export class DsdApiError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'DsdApiError';
    this.status = options?.status;
    this.code = options?.code ?? 'DSD_API_ERROR';
  }
}

export type DsdFetch = typeof fetch;

function sanitizeErrorMessage(message: string, token: string): string {
  return message.split(token).join('[redacted]');
}

function buildAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}

export function buildDsdSitesUrl(
  baseUrl: string,
  options: { limit: number; cursor?: string | null; updatedSince?: string | null },
): string {
  const url = new URL(`${baseUrl}/api/integrations/low/sites`);
  url.searchParams.set('limit', String(options.limit));
  if (options.cursor) url.searchParams.set('cursor', options.cursor);
  if (options.updatedSince) url.searchParams.set('updatedSince', options.updatedSince);
  return url.toString();
}

async function dsdRequest(
  config: DsdClientConfig,
  pathOrUrl: string,
  fetchImpl: DsdFetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(pathOrUrl, {
      method: 'GET',
      headers: buildAuthHeaders(config.token),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      let detail = `DSD ответил статусом ${response.status}`;
      if (response.status === 401) detail = 'DSD отклонил токен (401)';
      if (response.status === 400) detail = 'Некорректный запрос к DSD (400)';
      throw new DsdApiError(detail, { status: response.status, code: 'DSD_HTTP_ERROR' });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DsdApiError) {
      throw new DsdApiError(sanitizeErrorMessage(error.message, config.token), {
        status: error.status,
        code: error.code,
      });
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new DsdApiError('Превышено время ожидания ответа DSD', {
        code: 'DSD_TIMEOUT',
      });
    }
    const message =
      error instanceof Error ? error.message : 'Неизвестная ошибка запроса к DSD';
    throw new DsdApiError(sanitizeErrorMessage(message, config.token), {
      code: 'DSD_NETWORK_ERROR',
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkDsdHealth(
  config: DsdClientConfig = requireDsdClientConfig(),
  fetchImpl: DsdFetch = fetch,
): Promise<DsdHealth> {
  const url = `${config.baseUrl}/api/integrations/low/health`;
  const json = await dsdRequest(config, url, fetchImpl);
  const parsed = dsdHealthSchema.safeParse(json);
  if (!parsed.success) {
    throw new DsdApiError('Некорректный ответ health DSD', { code: 'DSD_INVALID_RESPONSE' });
  }
  return parsed.data;
}

export async function fetchDsdSitesPage(
  options: {
    cursor?: string | null;
    updatedSince?: string | null;
    limit?: number;
  } = {},
  config: DsdClientConfig = requireDsdClientConfig(),
  fetchImpl: DsdFetch = fetch,
): Promise<DsdSitesPage> {
  const url = buildDsdSitesUrl(config.baseUrl, {
    limit: options.limit ?? config.pageSize,
    cursor: options.cursor,
    updatedSince: options.updatedSince,
  });
  const json = await dsdRequest(config, url, fetchImpl);
  const parsed = dsdSitesPageSchema.safeParse(json);
  if (!parsed.success) {
    throw new DsdApiError('Некорректный ответ списка сайтов DSD', {
      code: 'DSD_INVALID_RESPONSE',
    });
  }
  return parsed.data;
}

export async function fetchAllDsdSites(
  config: DsdClientConfig = requireDsdClientConfig(),
  fetchImpl: DsdFetch = fetch,
): Promise<DsdSite[]> {
  const sites: DsdSite[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();

  for (;;) {
    if (cursor) {
      if (seenCursors.has(cursor)) {
        throw new DsdApiError('DSD вернул повторяющийся cursor пагинации', {
          code: 'DSD_CURSOR_LOOP',
        });
      }
      seenCursors.add(cursor);
    }

    const page = await fetchDsdSitesPage({ cursor, limit: config.pageSize }, config, fetchImpl);
    sites.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return sites;
}

export function getBearerAuthorizationHeader(token: string): string {
  return `Bearer ${token}`;
}
