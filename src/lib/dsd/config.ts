export type DsdClientConfig = {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  pageSize: number;
};

export class DsdConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DsdConfigError';
  }
}

export function getDsdClientConfig(
  env: NodeJS.ProcessEnv = process.env,
): DsdClientConfig | null {
  const baseUrl = env.DSD_BASE_URL?.trim();
  const token = env.DSD_LOW_API_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  const timeoutMs = Number(env.DSD_REQUEST_TIMEOUT_MS || 10_000);
  const pageSize = Number(env.DSD_SYNC_PAGE_SIZE || 100);

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10_000,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 200) : 100,
  };
}

export function requireDsdClientConfig(
  env: NodeJS.ProcessEnv = process.env,
): DsdClientConfig {
  const config = getDsdClientConfig(env);
  if (!config) {
    throw new DsdConfigError(
      'DSD не настроен: задайте DSD_BASE_URL и DSD_LOW_API_TOKEN в окружении сервера',
    );
  }
  return config;
}

export function isDsdConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getDsdClientConfig(env) !== null;
}
