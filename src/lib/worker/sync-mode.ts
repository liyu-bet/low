import { IntegrationSystem, SyncRunStatus } from '@prisma/client';
import {
  DSD_SYNC_JOB_TYPE,
  GSC_PROPERTIES_SYNC_JOB_TYPE,
  SYNC_TRIGGER_WORKER,
} from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { getLocalParts, shouldForceFullReconciliation } from '@/lib/worker/scheduler';

export type SyncModeDecision = {
  mode: 'full' | 'incremental';
  updatedSince: string | null;
  fullReconciliation: boolean;
};

function cursorFromMetadata(metadata: unknown, finishedAt: Date | null): string | null {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const cursor = (metadata as Record<string, unknown>).incrementalCursor;
    if (typeof cursor === 'string' && cursor.length > 0 && !Number.isNaN(Date.parse(cursor))) {
      return cursor;
    }
  }
  if (finishedAt && !Number.isNaN(finishedAt.getTime())) {
    return finishedAt.toISOString();
  }
  return null;
}

async function lastSuccessfulWorkerRun(system: IntegrationSystem, jobType: string) {
  return prisma.syncRun.findFirst({
    where: {
      system,
      jobType,
      trigger: SYNC_TRIGGER_WORKER,
      status: { in: [SyncRunStatus.SUCCESS, SyncRunStatus.PARTIAL] },
    },
    orderBy: { finishedAt: 'desc' },
  });
}

export async function resolveIncrementalOrFull(input: {
  system: 'DSD' | 'GSC';
  jobType: typeof DSD_SYNC_JOB_TYPE | typeof GSC_PROPERTIES_SYNC_JOB_TYPE;
  fullReconciliationHour: number;
  timeZone: string;
  lastFullLocalYmd: string | null;
  now: Date;
}): Promise<SyncModeDecision & { localYmd: string }> {
  const localYmd = getLocalParts(input.now, input.timeZone).ymd;
  const forceFull = shouldForceFullReconciliation({
    hour: input.fullReconciliationHour,
    timeZone: input.timeZone,
    lastFullLocalYmd: input.lastFullLocalYmd,
    now: input.now,
  });

  if (forceFull) {
    return {
      mode: 'full',
      updatedSince: null,
      fullReconciliation: true,
      localYmd,
    };
  }

  const last = await lastSuccessfulWorkerRun(
    input.system === 'DSD' ? IntegrationSystem.DSD : IntegrationSystem.GSC,
    input.jobType,
  );

  if (!last) {
    return { mode: 'full', updatedSince: null, fullReconciliation: false, localYmd };
  }

  const updatedSince = cursorFromMetadata(last.metadata, last.finishedAt);
  if (!updatedSince) {
    return { mode: 'full', updatedSince: null, fullReconciliation: false, localYmd };
  }

  return {
    mode: 'incremental',
    updatedSince,
    fullReconciliation: false,
    localYmd,
  };
}
