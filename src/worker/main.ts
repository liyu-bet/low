import {
  DSD_SYNC_JOB_TYPE,
  GSC_LIFECYCLE_SYNC_JOB_TYPE,
  GSC_PROPERTIES_SYNC_JOB_TYPE,
} from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { loadWorkerConfig, type WorkerConfig } from '@/lib/worker/config';
import { upsertWorkerHeartbeat } from '@/lib/worker/heartbeat';
import { createWorkerId } from '@/lib/worker/identity';
import {
  runDsdSitesJob,
  runGscLifecycleJob,
  runGscPropertiesJob,
  type WorkerJobName,
  type WorkerJobResult,
} from '@/lib/worker/jobs';
import {
  computeBackoffMs,
  getLocalParts,
  nextDailyRunAt,
  nextIntervalRunAt,
} from '@/lib/worker/scheduler';
import { SyncRunStatus } from '@prisma/client';

type JobState = {
  name: WorkerJobName;
  nextRunAt: Date;
  lastFinishedAt: Date | null;
  lastLocalYmd: string | null;
  lastFullLocalYmd: string | null;
  consecutiveFailures: number;
};

const VERSION = process.env.npm_package_version ?? '0.1.0';

function sleep(ms: number, signal: { stopped: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const step = Math.min(1000, Math.max(50, ms));
    let remaining = ms;
    const tick = () => {
      if (signal.stopped || remaining <= 0) {
        resolve();
        return;
      }
      const wait = Math.min(step, remaining);
      remaining -= wait;
      setTimeout(tick, wait);
    };
    tick();
  });
}

function isFailure(result: WorkerJobResult): boolean {
  return (
    result.status === SyncRunStatus.FAILED ||
    result.status === 'error' ||
    result.status === 'timeout'
  );
}

async function executeJob(
  state: JobState,
  config: WorkerConfig,
  workerId: string,
): Promise<WorkerJobResult> {
  const now = new Date();
  if (state.name === DSD_SYNC_JOB_TYPE) {
    return runDsdSitesJob({
      config,
      workerId,
      lastFullLocalYmd: state.lastFullLocalYmd,
      now,
    });
  }
  if (state.name === GSC_PROPERTIES_SYNC_JOB_TYPE) {
    return runGscPropertiesJob({
      config,
      workerId,
      lastFullLocalYmd: state.lastFullLocalYmd,
      now,
    });
  }
  return runGscLifecycleJob({ config, workerId, now });
}

function scheduleAfter(state: JobState, config: WorkerConfig, now: Date, failed: boolean) {
  if (failed) {
    const backoff = computeBackoffMs({
      consecutiveFailures: state.consecutiveFailures,
      baseMs: config.errorBackoffMs,
      maxMs: config.maxErrorBackoffMs,
    });
    state.nextRunAt = new Date(now.getTime() + backoff);
    return;
  }

  if (state.name === GSC_LIFECYCLE_SYNC_JOB_TYPE) {
    state.nextRunAt = nextDailyRunAt({
      hour: config.gscLifecycleHour,
      timeZone: config.timezone,
      lastLocalYmd: state.lastLocalYmd,
      now,
    });
    return;
  }

  const intervalMs =
    state.name === DSD_SYNC_JOB_TYPE ? config.dsdIntervalMs : config.gscPropertiesIntervalMs;
  state.nextRunAt = nextIntervalRunAt({
    lastFinishedAt: state.lastFinishedAt,
    intervalMs,
    now,
  });
}

export async function runWorkerMain(env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const config = loadWorkerConfig(env);
  const workerId = createWorkerId();
  const startedAt = new Date();
  const signal = { stopped: false };
  let currentJob: WorkerJobName | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let runningPromise: Promise<void> | null = null;

  console.log(`[WORKER] starting id=${workerId} tz=${config.timezone} enabled=${config.enabled}`);

  if (!config.enabled) {
    console.log('[WORKER] WORKER_ENABLED=false — exiting');
    await upsertWorkerHeartbeat({
      workerId,
      status: 'disabled',
      version: VERSION,
      startedAt,
      currentJob: null,
    }).catch(() => undefined);
    return 0;
  }

  if (!env.DATABASE_URL) {
    console.error('[WORKER] DATABASE_URL is required');
    return 1;
  }

  await upsertWorkerHeartbeat({
    workerId,
    status: 'starting',
    version: VERSION,
    startedAt,
    currentJob: null,
  });

  const boot = new Date();
  const jobs: JobState[] = [
    {
      name: DSD_SYNC_JOB_TYPE,
      nextRunAt: new Date(boot.getTime() + config.startupDelayMs),
      lastFinishedAt: null,
      lastLocalYmd: null,
      lastFullLocalYmd: null,
      consecutiveFailures: 0,
    },
    {
      name: GSC_PROPERTIES_SYNC_JOB_TYPE,
      nextRunAt: new Date(boot.getTime() + config.startupDelayMs),
      lastFinishedAt: null,
      lastLocalYmd: null,
      lastFullLocalYmd: null,
      consecutiveFailures: 0,
    },
    {
      name: GSC_LIFECYCLE_SYNC_JOB_TYPE,
      nextRunAt: (() => {
        const afterDelay = new Date(boot.getTime() + config.startupDelayMs);
        const scheduled = nextDailyRunAt({
          hour: config.gscLifecycleHour,
          timeZone: config.timezone,
          lastLocalYmd: null,
          now: afterDelay,
        });
        return scheduled.getTime() < afterDelay.getTime() ? afterDelay : scheduled;
      })(),
      lastFinishedAt: null,
      lastLocalYmd: null,
      lastFullLocalYmd: null,
      consecutiveFailures: 0,
    },
  ];

  const pulse = async () => {
    try {
      await upsertWorkerHeartbeat({
        workerId,
        status: signal.stopped ? 'stopping' : 'running',
        currentJob,
        version: VERSION,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'heartbeat failed';
      console.error(`[WORKER] heartbeat error: ${message}`);
    }
  };

  await pulse();
  heartbeatTimer = setInterval(() => {
    void pulse();
  }, config.heartbeatIntervalMs);

  const shutdown = async (reason: string) => {
    if (signal.stopped) return;
    signal.stopped = true;
    console.log(`[WORKER] shutdown requested (${reason})`);
    await upsertWorkerHeartbeat({
      workerId,
      status: 'stopping',
      currentJob,
      version: VERSION,
    }).catch(() => undefined);

    if (runningPromise) {
      await Promise.race([
        runningPromise,
        sleep(config.shutdownTimeoutMs, { stopped: false }),
      ]);
    }

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await upsertWorkerHeartbeat({
      workerId,
      status: 'stopped',
      currentJob: null,
      version: VERSION,
    }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    console.log('[WORKER] stopped');
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM').then(() => process.exit(0));
  });
  process.once('SIGINT', () => {
    void shutdown('SIGINT').then(() => process.exit(0));
  });

  while (!signal.stopped) {
    const tickNow = new Date();
    const due = jobs
      .filter((job) => job.nextRunAt.getTime() <= tickNow.getTime())
      .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime());

    if (due.length === 0) {
      const nextAt = Math.min(...jobs.map((j) => j.nextRunAt.getTime()));
      const waitMs = Math.max(250, Math.min(60_000, nextAt - tickNow.getTime()));
      await sleep(waitMs, signal);
      continue;
    }

    const job = due[0]!;
    if (signal.stopped) break;

    currentJob = job.name;
    await pulse();
    console.log(`[WORKER] running job=${job.name}`);

    runningPromise = (async () => {
      const result = await executeJob(job, config, workerId);
      const finishedAt = new Date();
      job.lastFinishedAt = finishedAt;

      if (isFailure(result)) {
        job.consecutiveFailures += 1;
        await upsertWorkerHeartbeat({
          workerId,
          status: 'running',
          currentJob: null,
          lastError: result.error ?? 'job failed',
          version: VERSION,
        });
        scheduleAfter(job, config, finishedAt, true);
      } else {
        job.consecutiveFailures = 0;
        if (result.status !== 'disabled') {
          job.lastLocalYmd = getLocalParts(finishedAt, config.timezone).ymd;
          if (result.fullReconciliation && result.localYmd) {
            job.lastFullLocalYmd = result.localYmd;
          }
        }
        scheduleAfter(job, config, finishedAt, false);
        await upsertWorkerHeartbeat({
          workerId,
          status: 'running',
          currentJob: null,
          lastError: result.error ?? null,
          version: VERSION,
        });
      }

      console.log(
        `[WORKER] job=${job.name} status=${result.status} next=${job.nextRunAt.toISOString()}`,
      );
    })();

    try {
      await runningPromise;
    } finally {
      runningPromise = null;
      currentJob = null;
    }
  }

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  await upsertWorkerHeartbeat({
    workerId,
    status: 'stopped',
    currentJob: null,
    version: VERSION,
  }).catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  return 0;
}

runWorkerMain()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error('[WORKER] fatal', error instanceof Error ? error.message : error);
    process.exit(1);
  });
