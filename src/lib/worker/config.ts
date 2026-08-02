import { z } from 'zod';

function envInt(fallback: number, min: number, max: number) {
  return z.preprocess((raw) => {
    if (raw === undefined || raw === null || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    const floored = Math.floor(n);
    if (floored < min) return fallback;
    return Math.min(max, floored);
  }, z.number());
}

function envBool(fallback: boolean) {
  return z.preprocess((raw) => {
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw === 'boolean') return raw;
    const normalized = String(raw).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
  }, z.boolean());
}

const workerEnvSchema = z.object({
  WORKER_ENABLED: envBool(true),
  WORKER_TIMEZONE: z.preprocess((raw) => {
    const value = typeof raw === 'string' && raw.trim() ? raw.trim() : 'Europe/Belgrade';
    return value;
  }, z.string().min(1)),
  WORKER_STARTUP_DELAY_SECONDS: envInt(20, 0, 600),
  WORKER_HEARTBEAT_INTERVAL_SECONDS: envInt(30, 5, 600),
  WORKER_STALE_HEARTBEAT_SECONDS: envInt(120, 30, 3600),
  WORKER_SHUTDOWN_TIMEOUT_SECONDS: envInt(90, 5, 3600),
  WORKER_JOB_TIMEOUT_MINUTES: envInt(40, 1, 240),
  WORKER_ERROR_BACKOFF_SECONDS: envInt(60, 5, 3600),
  WORKER_MAX_ERROR_BACKOFF_SECONDS: envInt(900, 30, 7200),
  DSD_SYNC_INTERVAL_MINUTES: envInt(15, 1, 1440),
  DSD_FULL_RECONCILIATION_HOUR: envInt(3, 0, 23),
  GSC_PROPERTIES_SYNC_INTERVAL_HOURS: envInt(6, 1, 168),
  GSC_FULL_RECONCILIATION_HOUR: envInt(4, 0, 23),
  GSC_LIFECYCLE_SYNC_HOUR: envInt(5, 0, 23),
  JOB_LOCK_DSD_TTL_MINUTES: envInt(45, 5, 240),
  JOB_LOCK_GSC_PROPERTIES_TTL_MINUTES: envInt(45, 5, 240),
  JOB_LOCK_GSC_LIFECYCLE_TTL_MINUTES: envInt(45, 5, 240),
});

export type WorkerConfig = {
  enabled: boolean;
  timezone: string;
  startupDelayMs: number;
  heartbeatIntervalMs: number;
  staleHeartbeatMs: number;
  shutdownTimeoutMs: number;
  jobTimeoutMs: number;
  errorBackoffMs: number;
  maxErrorBackoffMs: number;
  dsdIntervalMs: number;
  dsdFullReconciliationHour: number;
  gscPropertiesIntervalMs: number;
  gscFullReconciliationHour: number;
  gscLifecycleHour: number;
  lockTtlMs: {
    dsd: number;
    gscProperties: number;
    gscLifecycle: number;
  };
};

export function loadWorkerConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): WorkerConfig {
  const parsed = workerEnvSchema.safeParse(env);
  const data = parsed.success
    ? parsed.data
    : workerEnvSchema.parse({
        WORKER_ENABLED: true,
        WORKER_TIMEZONE: 'Europe/Belgrade',
      });

  return {
    enabled: data.WORKER_ENABLED,
    timezone: data.WORKER_TIMEZONE,
    startupDelayMs: data.WORKER_STARTUP_DELAY_SECONDS * 1000,
    heartbeatIntervalMs: data.WORKER_HEARTBEAT_INTERVAL_SECONDS * 1000,
    staleHeartbeatMs: data.WORKER_STALE_HEARTBEAT_SECONDS * 1000,
    shutdownTimeoutMs: data.WORKER_SHUTDOWN_TIMEOUT_SECONDS * 1000,
    jobTimeoutMs: data.WORKER_JOB_TIMEOUT_MINUTES * 60_000,
    errorBackoffMs: data.WORKER_ERROR_BACKOFF_SECONDS * 1000,
    maxErrorBackoffMs: data.WORKER_MAX_ERROR_BACKOFF_SECONDS * 1000,
    dsdIntervalMs: data.DSD_SYNC_INTERVAL_MINUTES * 60_000,
    dsdFullReconciliationHour: data.DSD_FULL_RECONCILIATION_HOUR,
    gscPropertiesIntervalMs: data.GSC_PROPERTIES_SYNC_INTERVAL_HOURS * 3_600_000,
    gscFullReconciliationHour: data.GSC_FULL_RECONCILIATION_HOUR,
    gscLifecycleHour: data.GSC_LIFECYCLE_SYNC_HOUR,
    lockTtlMs: {
      dsd: data.JOB_LOCK_DSD_TTL_MINUTES * 60_000,
      gscProperties: data.JOB_LOCK_GSC_PROPERTIES_TTL_MINUTES * 60_000,
      gscLifecycle: data.JOB_LOCK_GSC_LIFECYCLE_TTL_MINUTES * 60_000,
    },
  };
}
