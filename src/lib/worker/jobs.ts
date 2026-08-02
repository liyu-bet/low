import { SyncRunStatus } from '@prisma/client';
import {
  DSD_SYNC_JOB_TYPE,
  GSC_LIFECYCLE_SYNC_JOB_TYPE,
  GSC_PROPERTIES_SYNC_JOB_TYPE,
} from '@/lib/constants';
import { isDsdConfigured } from '@/lib/dsd/config';
import { runDsdSync } from '@/lib/dsd/sync';
import { isGscConfigured } from '@/lib/gsc/config';
import { runGscLifecycleSync } from '@/lib/gsc/lifecycle';
import { runGscPropertiesSync } from '@/lib/gsc/sync';
import type { WorkerConfig } from '@/lib/worker/config';
import { resolveIncrementalOrFull } from '@/lib/worker/sync-mode';

export type WorkerJobName =
  | typeof DSD_SYNC_JOB_TYPE
  | typeof GSC_PROPERTIES_SYNC_JOB_TYPE
  | typeof GSC_LIFECYCLE_SYNC_JOB_TYPE;

export type WorkerJobResult = {
  job: WorkerJobName;
  status: SyncRunStatus | 'disabled' | 'timeout' | 'error';
  syncRunId?: string;
  error?: string | null;
  fullReconciliation?: boolean;
  localYmd?: string;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}: превышен таймаут ${Math.round(timeoutMs / 1000)}с`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function runDsdSitesJob(input: {
  config: WorkerConfig;
  workerId: string;
  lastFullLocalYmd: string | null;
  now?: Date;
}): Promise<WorkerJobResult> {
  const logPrefix = '[DSD SYNC]';
  if (!isDsdConfigured()) {
    console.log(`${logPrefix} skipped — DSD not configured`);
    return { job: DSD_SYNC_JOB_TYPE, status: 'disabled' };
  }

  const now = input.now ?? new Date();
  const decision = await resolveIncrementalOrFull({
    system: 'DSD',
    jobType: DSD_SYNC_JOB_TYPE,
    fullReconciliationHour: input.config.dsdFullReconciliationHour,
    timeZone: input.config.timezone,
    lastFullLocalYmd: input.lastFullLocalYmd,
    now,
  });

  console.log(
    `${logPrefix} start mode=${decision.mode} fullReconciliation=${decision.fullReconciliation}`,
  );

  try {
    const summary = await withTimeout(
      runDsdSync({
        trigger: 'worker',
        workerId: input.workerId,
        mode: decision.mode,
        updatedSince: decision.updatedSince,
        fullReconciliation: decision.fullReconciliation,
        scheduledFor: now.toISOString(),
        lockTtlMs: input.config.lockTtlMs.dsd,
      }),
      input.config.jobTimeoutMs,
      'DSD sync',
    );
    console.log(
      `${logPrefix} done status=${summary.status} processed=${summary.processed} errors=${summary.errorCount}`,
    );
    return {
      job: DSD_SYNC_JOB_TYPE,
      status: summary.status,
      syncRunId: summary.syncRunId,
      error: summary.error,
      fullReconciliation: decision.fullReconciliation,
      localYmd: decision.localYmd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DSD job failed';
    console.error(`${logPrefix} failed: ${message}`);
    return {
      job: DSD_SYNC_JOB_TYPE,
      status: message.includes('таймаут') ? 'timeout' : 'error',
      error: message,
      localYmd: decision.localYmd,
    };
  }
}

export async function runGscPropertiesJob(input: {
  config: WorkerConfig;
  workerId: string;
  lastFullLocalYmd: string | null;
  now?: Date;
}): Promise<WorkerJobResult> {
  const logPrefix = '[GSC PROPERTIES]';
  if (!isGscConfigured()) {
    console.log(`${logPrefix} skipped — GSC not configured`);
    return { job: GSC_PROPERTIES_SYNC_JOB_TYPE, status: 'disabled' };
  }

  const now = input.now ?? new Date();
  const decision = await resolveIncrementalOrFull({
    system: 'GSC',
    jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
    fullReconciliationHour: input.config.gscFullReconciliationHour,
    timeZone: input.config.timezone,
    lastFullLocalYmd: input.lastFullLocalYmd,
    now,
  });

  console.log(
    `${logPrefix} start mode=${decision.mode} fullReconciliation=${decision.fullReconciliation}`,
  );

  try {
    const summary = await withTimeout(
      runGscPropertiesSync({
        trigger: 'worker',
        workerId: input.workerId,
        mode: decision.mode,
        updatedSince: decision.updatedSince,
        fullReconciliation: decision.fullReconciliation,
        scheduledFor: now.toISOString(),
        lockTtlMs: input.config.lockTtlMs.gscProperties,
      }),
      input.config.jobTimeoutMs,
      'GSC properties sync',
    );
    console.log(
      `${logPrefix} done status=${summary.status} processed=${summary.processed} errors=${summary.errorCount}`,
    );
    return {
      job: GSC_PROPERTIES_SYNC_JOB_TYPE,
      status: summary.status,
      syncRunId: summary.syncRunId,
      error: summary.error,
      fullReconciliation: decision.fullReconciliation,
      localYmd: decision.localYmd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GSC properties job failed';
    console.error(`${logPrefix} failed: ${message}`);
    return {
      job: GSC_PROPERTIES_SYNC_JOB_TYPE,
      status: message.includes('таймаут') ? 'timeout' : 'error',
      error: message,
      localYmd: decision.localYmd,
    };
  }
}

export async function runGscLifecycleJob(input: {
  config: WorkerConfig;
  workerId: string;
  now?: Date;
}): Promise<WorkerJobResult> {
  const logPrefix = '[GSC LIFECYCLE]';
  if (!isGscConfigured()) {
    console.log(`${logPrefix} skipped — GSC not configured`);
    return { job: GSC_LIFECYCLE_SYNC_JOB_TYPE, status: 'disabled' };
  }

  const now = input.now ?? new Date();
  console.log(`${logPrefix} start`);

  try {
    const summary = await withTimeout(
      runGscLifecycleSync({
        trigger: 'worker',
        workerId: input.workerId,
        scheduledFor: now.toISOString(),
        lockTtlMs: input.config.lockTtlMs.gscLifecycle,
      }),
      input.config.jobTimeoutMs,
      'GSC lifecycle sync',
    );
    console.log(
      `${logPrefix} done status=${summary.status} processed=${summary.processed} errors=${summary.errorCount}`,
    );
    return {
      job: GSC_LIFECYCLE_SYNC_JOB_TYPE,
      status: summary.status,
      syncRunId: summary.syncRunId,
      error: summary.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GSC lifecycle job failed';
    console.error(`${logPrefix} failed: ${message}`);
    return {
      job: GSC_LIFECYCLE_SYNC_JOB_TYPE,
      status: message.includes('таймаут') ? 'timeout' : 'error',
      error: message,
    };
  }
}
