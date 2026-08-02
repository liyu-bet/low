import {
  type GscClientConfig,
  requireGscClientConfig,
} from '@/lib/gsc/config';
import {
  gscHealthSchema,
  gscLifecycleSchema,
  gscPropertiesPageSchema,
  type GscHealth,
  type GscLifecycle,
  type GscPropertiesPage,
  type GscProperty,
} from '@/lib/gsc/schemas';

export class GscApiError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'GscApiError';
    this.status = options?.status;
    this.code = options?.code ?? 'GSC_API_ERROR';
  }
}

export type GscFetch = typeof fetch;

function sanitizeErrorMessage(message: string, token: string): string {
  return message.split(token).join('[redacted]');
}

function buildAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}

export function buildGscPropertiesUrl(
  baseUrl: string,
  options: { limit: number; cursor?: string | null; updatedSince?: string | null },
): string {
  const url = new URL(`${baseUrl}/api/integrations/low/properties`);
  url.searchParams.set('limit', String(options.limit));
  if (options.cursor) url.searchParams.set('cursor', options.cursor);
  if (options.updatedSince) url.searchParams.set('updatedSince', options.updatedSince);
  return url.toString();
}

async function gscRequest(
  config: GscClientConfig,
  pathOrUrl: string,
  fetchImpl: GscFetch,
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
      let detail = `GSC ответил статусом ${response.status}`;
      if (response.status === 401) detail = 'GSC отклонил токен (401)';
      if (response.status === 400) detail = 'Некорректный запрос к GSC (400)';
      if (response.status === 404) detail = 'Свойство GSC не найдено (404)';
      if (response.status === 502) detail = 'GSC не смог получить данные Search Console (502)';
      throw new GscApiError(detail, { status: response.status, code: 'GSC_HTTP_ERROR' });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof GscApiError) {
      throw new GscApiError(sanitizeErrorMessage(error.message, config.token), {
        status: error.status,
        code: error.code,
      });
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GscApiError('Превышено время ожидания ответа GSC', {
        code: 'GSC_TIMEOUT',
      });
    }
    const message =
      error instanceof Error ? error.message : 'Неизвестная ошибка запроса к GSC';
    throw new GscApiError(sanitizeErrorMessage(message, config.token), {
      code: 'GSC_NETWORK_ERROR',
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkGscHealth(
  config: GscClientConfig = requireGscClientConfig(),
  fetchImpl: GscFetch = fetch,
): Promise<GscHealth> {
  const url = `${config.baseUrl}/api/integrations/low/health`;
  const json = await gscRequest(config, url, fetchImpl);
  const parsed = gscHealthSchema.safeParse(json);
  if (!parsed.success) {
    throw new GscApiError('Некорректный ответ health GSC', { code: 'GSC_INVALID_RESPONSE' });
  }
  return parsed.data;
}

export async function fetchGscPropertiesPage(
  options: {
    cursor?: string | null;
    updatedSince?: string | null;
    limit?: number;
  } = {},
  config: GscClientConfig = requireGscClientConfig(),
  fetchImpl: GscFetch = fetch,
): Promise<GscPropertiesPage> {
  const url = buildGscPropertiesUrl(config.baseUrl, {
    limit: options.limit ?? config.pageSize,
    cursor: options.cursor,
    updatedSince: options.updatedSince,
  });
  const json = await gscRequest(config, url, fetchImpl);
  const parsed = gscPropertiesPageSchema.safeParse(json);
  if (!parsed.success) {
    throw new GscApiError('Некорректный ответ списка properties GSC', {
      code: 'GSC_INVALID_RESPONSE',
    });
  }
  return parsed.data;
}

export async function fetchAllGscProperties(
  config: GscClientConfig = requireGscClientConfig(),
  fetchImpl: GscFetch = fetch,
  options: { updatedSince?: string | null } = {},
): Promise<GscProperty[]> {
  const properties: GscProperty[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();

  for (;;) {
    if (cursor) {
      if (seenCursors.has(cursor)) {
        throw new GscApiError('GSC вернул повторяющийся cursor пагинации', {
          code: 'GSC_CURSOR_LOOP',
        });
      }
      seenCursors.add(cursor);
    }

    const page = await fetchGscPropertiesPage(
      {
        cursor,
        limit: config.pageSize,
        updatedSince: options.updatedSince,
      },
      config,
      fetchImpl,
    );
    properties.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return properties;
}

export async function fetchGscPropertyLifecycle(
  propertyId: string,
  config: GscClientConfig = requireGscClientConfig(),
  fetchImpl: GscFetch = fetch,
): Promise<GscLifecycle> {
  const url = `${config.baseUrl}/api/integrations/low/properties/${encodeURIComponent(propertyId)}/lifecycle`;
  const json = await gscRequest(config, url, fetchImpl);
  const parsed = gscLifecycleSchema.safeParse(json);
  if (!parsed.success) {
    throw new GscApiError('Некорректный ответ lifecycle GSC', {
      code: 'GSC_INVALID_RESPONSE',
    });
  }
  return parsed.data;
}

export function getBearerAuthorizationHeader(token: string): string {
  return `Bearer ${token}`;
}
