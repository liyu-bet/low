import { IntegrationStatus, IntegrationSystem, SyncRunStatus } from '@prisma/client';
import {
  DSD_SYNC_JOB_TYPE,
  GSC_LIFECYCLE_SYNC_JOB_TYPE,
  GSC_PROPERTIES_SYNC_JOB_TYPE,
  JOB_LOCK_DSD,
  JOB_LOCK_GSC_LIFECYCLE,
  JOB_LOCK_GSC_PROPERTIES,
  SYNC_TRIGGER_WORKER,
} from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { isDsdConfigured } from '@/lib/dsd/config';
import { isGscConfigured } from '@/lib/gsc/config';
import { loadWorkerConfig } from '@/lib/worker/config';
import {
  classifyHeartbeatAge,
  getLatestWorkerHeartbeat,
  type WorkerPresence,
} from '@/lib/worker/heartbeat';
import { shortWorkerId } from '@/lib/worker/identity';
import { getActiveJobLock } from '@/lib/worker/locks';
import {
  nextDailyRunAt,
  nextIntervalRunAt,
} from '@/lib/worker/scheduler';

export type WorkerAutomationStatus = {
  enabled: boolean;
  configuredIntegrations: { dsd: boolean; gsc: boolean };
  presence: WorkerPresence;
  workerLabel: string | null;
  status: string | null;
  currentJob: string | null;
  lastHeartbeatAt: Date | null;
  lastError: string | null;
  locks: Array<{ id: string; ownerLabel: string; expiresAt: Date }>;
  jobs: Array<{
    jobType: string;
    label: string;
    lastRun: {
      status: SyncRunStatus;
      startedAt: Date;
      finishedAt: Date | null;
      error: string | null;
      trigger: string | null;
    } | null;
    estimatedNextRunAt: Date | null;
  }>;
  lastSuccessfulDsdAt: Date | null;
  lastSuccessfulGscPropertiesAt: Date | null;
  lastWorkerError: string | null;
  lifecycleAwaitingCount: number;
};

function ownerLabel(owner: string | null): string {
  if (!owner) return 'занято';
  if (owner.startsWith('manual:')) return 'ручной запуск';
  return `worker ${shortWorkerId(owner)}`;
}

async function latestWorkerRun(jobType: string) {
  return prisma.syncRun.findFirst({
    where: { jobType, trigger: SYNC_TRIGGER_WORKER },
    orderBy: { startedAt: 'desc' },
  });
}

async function latestSuccessful(jobType: string, system: IntegrationSystem) {
  return prisma.syncRun.findFirst({
    where: {
      jobType,
      system,
      status: { in: [SyncRunStatus.SUCCESS, SyncRunStatus.PARTIAL] },
    },
    orderBy: { finishedAt: 'desc' },
  });
}

export async function getWorkerAutomationStatus(): Promise<WorkerAutomationStatus> {
  const config = loadWorkerConfig();
  const heartbeat = await getLatestWorkerHeartbeat();
  const presence = classifyHeartbeatAge({
    lastHeartbeatAt: heartbeat?.lastHeartbeatAt,
    staleMs: config.staleHeartbeatMs,
  });

  const [dsdRun, gscPropRun, gscLifeRun, dsdOk, gscOk, lockDsd, lockProp, lockLife] =
    await Promise.all([
      latestWorkerRun(DSD_SYNC_JOB_TYPE),
      latestWorkerRun(GSC_PROPERTIES_SYNC_JOB_TYPE),
      latestWorkerRun(GSC_LIFECYCLE_SYNC_JOB_TYPE),
      latestSuccessful(DSD_SYNC_JOB_TYPE, IntegrationSystem.DSD),
      latestSuccessful(GSC_PROPERTIES_SYNC_JOB_TYPE, IntegrationSystem.GSC),
      getActiveJobLock(JOB_LOCK_DSD),
      getActiveJobLock(JOB_LOCK_GSC_PROPERTIES),
      getActiveJobLock(JOB_LOCK_GSC_LIFECYCLE),
    ]);

  const now = new Date();
  const jobs = [
    {
      jobType: DSD_SYNC_JOB_TYPE,
      label: 'DSD сайты',
      lastRun: dsdRun
        ? {
            status: dsdRun.status,
            startedAt: dsdRun.startedAt,
            finishedAt: dsdRun.finishedAt,
            error: dsdRun.error,
            trigger: dsdRun.trigger,
          }
        : null,
      estimatedNextRunAt:
        presence === 'offline'
          ? null
          : nextIntervalRunAt({
              lastFinishedAt: dsdRun?.finishedAt ?? null,
              intervalMs: config.dsdIntervalMs,
              now,
            }),
    },
    {
      jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
      label: 'GSC свойства',
      lastRun: gscPropRun
        ? {
            status: gscPropRun.status,
            startedAt: gscPropRun.startedAt,
            finishedAt: gscPropRun.finishedAt,
            error: gscPropRun.error,
            trigger: gscPropRun.trigger,
          }
        : null,
      estimatedNextRunAt:
        presence === 'offline'
          ? null
          : nextIntervalRunAt({
              lastFinishedAt: gscPropRun?.finishedAt ?? null,
              intervalMs: config.gscPropertiesIntervalMs,
              now,
            }),
    },
    {
      jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE,
      label: 'GSC lifecycle',
      lastRun: gscLifeRun
        ? {
            status: gscLifeRun.status,
            startedAt: gscLifeRun.startedAt,
            finishedAt: gscLifeRun.finishedAt,
            error: gscLifeRun.error,
            trigger: gscLifeRun.trigger,
          }
        : null,
      estimatedNextRunAt:
        presence === 'offline'
          ? null
          : nextDailyRunAt({
              hour: config.gscLifecycleHour,
              timeZone: config.timezone,
              lastLocalYmd: null,
              now,
            }),
    },
  ];

  const locks = [lockDsd, lockProp, lockLife]
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({
      id: row.id,
      ownerLabel: ownerLabel(row.owner),
      expiresAt: row.expiresAt,
    }));

  const lifecycleAwaitingCount = await prisma.website.count({
    where: {
      OR: [{ firstImpressionAt: null }, { firstClickAt: null }],
      integrations: {
        some: {
          system: IntegrationSystem.GSC,
          status: IntegrationStatus.LINKED,
          externalEntityId: { not: null },
        },
      },
    },
  });

  const lastWorkerError =
    heartbeat?.lastError ||
    [dsdRun, gscPropRun, gscLifeRun].find((run) => run?.status === SyncRunStatus.FAILED)?.error ||
    null;

  return {
    enabled: config.enabled,
    configuredIntegrations: {
      dsd: isDsdConfigured(),
      gsc: isGscConfigured(),
    },
    presence,
    workerLabel: heartbeat ? shortWorkerId(heartbeat.workerId) : null,
    status: heartbeat?.status ?? null,
    currentJob: heartbeat?.currentJob ?? null,
    lastHeartbeatAt: heartbeat?.lastHeartbeatAt ?? null,
    lastError: heartbeat?.lastError ?? null,
    locks,
    jobs,
    lastSuccessfulDsdAt: dsdOk?.finishedAt ?? null,
    lastSuccessfulGscPropertiesAt: gscOk?.finishedAt ?? null,
    lastWorkerError,
    lifecycleAwaitingCount,
  };
}

export function labelWorkerPresence(presence: WorkerPresence): string {
  if (presence === 'online') return 'в сети';
  if (presence === 'stale') return 'устарел';
  return 'офлайн';
}
