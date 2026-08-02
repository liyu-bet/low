export type GscClientConfig = {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  pageSize: number;
  lifecycleConcurrency: number;
  lifecycleMaxPropertiesPerRun: number;
};

export class GscConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GscConfigError';
  }
}

function positiveInt(raw: string | undefined, fallback: number, max?: number): number {
  const parsed = Number(raw || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  if (max != null) return Math.min(Math.floor(parsed), max);
  return Math.floor(parsed);
}

export function getGscClientConfig(
  env: NodeJS.ProcessEnv = process.env,
): GscClientConfig | null {
  const baseUrl = env.GSC_BASE_URL?.trim();
  const token = env.GSC_LOW_API_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
    timeoutMs: positiveInt(env.GSC_REQUEST_TIMEOUT_MS, 15_000),
    pageSize: positiveInt(env.GSC_SYNC_PAGE_SIZE, 100, 200),
    lifecycleConcurrency: positiveInt(env.GSC_LIFECYCLE_CONCURRENCY, 2, 8),
    lifecycleMaxPropertiesPerRun: positiveInt(env.GSC_LIFECYCLE_MAX_PROPERTIES_PER_RUN, 20, 200),
  };
}

export function requireGscClientConfig(
  env: NodeJS.ProcessEnv = process.env,
): GscClientConfig {
  const config = getGscClientConfig(env);
  if (!config) {
    throw new GscConfigError(
      'GSC не настроен: задайте GSC_BASE_URL и GSC_LOW_API_TOKEN в окружении сервера',
    );
  }
  return config;
}

export function isGscConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getGscClientConfig(env) !== null;
}

export function getGscBaseUrlForDisplay(env: NodeJS.ProcessEnv = process.env): string | null {
  const baseUrl = env.GSC_BASE_URL?.trim();
  return baseUrl ? baseUrl.replace(/\/+$/, '') : null;
}
