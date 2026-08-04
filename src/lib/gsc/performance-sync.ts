import {
  IntegrationStatus,
  IntegrationSystem,
  LifecycleStage,
  SyncRunStatus,
  WebsiteStatus,
} from '@prisma/client';
import { assertAuthenticated, type AdminSession } from '@/lib/auth/session';
import { GSC_PERFORMANCE_SYNC_JOB_TYPE, JOB_LOCK_GSC_PERFORMANCE } from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { fetchGscPropertyPerformance, GscApiError, type GscFetch } from '@/lib/gsc/client';
import { requireGscClientConfig, type GscClientConfig } from '@/lib/gsc/config';
import {
  mergePerformanceIntoSnapshot,
  parseGscExternalSnapshotWithPerformance,
  selectSourceGscProperty,
  type SelectableGscProperty,
} from '@/lib/gsc/snapshot-performance';
import { acquireJobLock, releaseJobLock } from '@/lib/worker/locks';

const DEFAULT_CONCURRENCY = 4;

/** Simple concurrency pool — mirrors gsc/lifecycle.ts without importing it (avoids a cycle). */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const concurrency = Math.max(1, Math.floor(limit));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    for (;;) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current]!);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(runners);
  return results;
}

export type GscPerformanceSyncResult = {
  processed: number;
  updated: number;
  skipped: number;
  errorCount: number;
  errors: Array<{ propertyId?: string; message: string }>;
};

/**
 * Refreshes the cached performance snapshot for each active website's single
 * source GSC property (never sums overlapping domain + URL-prefix properties).
 * On fetch failure the previously stored performance is left untouched
 * ("preserve last good performance").
 */
export async function syncGscPerformanceForActiveWebsites(
  options: {
    config?: GscClientConfig;
    fetchImpl?: GscFetch;
    concurrency?: number;
    now?: Date;
  } = {},
): Promise<GscPerformanceSyncResult> {
  const config = options.config ?? requireGscClientConfig();
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const integrations = await prisma.websiteIntegration.findMany({
    where: {
      system: IntegrationSystem.GSC,
      status: IntegrationStatus.LINKED,
      externalEntityId: { not: null },
      website: {
        archivedAt: null,
        status: { not: WebsiteStatus.ARCHIVED },
        lifecycleStage: { not: LifecycleStage.ARCHIVED },
      },
    },
    select: {
      id: true,
      websiteId: true,
      externalEntityId: true,
      externalData: true,
      website: { select: { primaryUrl: true } },
    },
  });

  const byWebsite = new Map<string, typeof integrations>();
  for (const integration of integrations) {
    const list = byWebsite.get(integration.websiteId) ?? [];
    list.push(integration);
    byWebsite.set(integration.websiteId, list);
  }

  const targets: Array<{ integrationId: string; propertyId: string }> = [];
  for (const list of byWebsite.values()) {
    const primaryUrl = list[0]?.website.primaryUrl ?? null;
    const selectable: SelectableGscProperty[] = [];
    for (const integration of list) {
      if (!integration.externalEntityId) continue;
      const parsed = parseGscExternalSnapshotWithPerformance(integration.externalData);
      if (!parsed) continue;
      selectable.push({
        externalId: integration.externalEntityId,
        siteUrl: parsed.siteUrl,
        isSelected: parsed.isSelected,
        propertyType: parsed.propertyType,
        externalData: integration.externalData,
      });
    }
    const chosen = selectSourceGscProperty(selectable, primaryUrl);
    if (!chosen) continue;
    const integration = list.find((i) => i.externalEntityId === chosen.externalId);
    if (!integration) continue;
    targets.push({ integrationId: integration.id, propertyId: chosen.externalId });
  }

  let updated = 0;
  let errorCount = 0;
  const errors: Array<{ propertyId?: string; message: string }> = [];

  await mapWithConcurrency(targets, concurrency, async (target) => {
    try {
      const performance = await fetchGscPropertyPerformance(
        target.propertyId,
        config,
        options.fetchImpl,
      );
      // Re-read just before writing so a concurrent properties sync isn't clobbered.
      const current = await prisma.websiteIntegration.findUnique({
        where: { id: target.integrationId },
        select: { externalData: true },
      });
      const currentSnapshot = current
        ? parseGscExternalSnapshotWithPerformance(current.externalData)
        : null;
      if (!currentSnapshot) return;
      const merged = mergePerformanceIntoSnapshot(currentSnapshot, performance);
      await prisma.websiteIntegration.update({
        where: { id: target.integrationId },
        data: { externalData: merged },
      });
      updated += 1;
    } catch (error) {
      errorCount += 1;
      const message =
        error instanceof GscApiError || error instanceof Error
          ? error.message
          : 'Ошибка синхронизации performance';
      errors.push({ propertyId: target.propertyId, message });
      // Fetch/parse failure — keep whatever performance snapshot is already stored.
    }
  });

  return {
    processed: targets.length,
    updated,
    skipped: integrations.length - targets.length,
    errorCount,
    errors,
  };
}

export type GscPerformanceSyncSummary = {
  syncRunId: string;
  status: SyncRunStatus;
  processed: number;
  updatedCount: number;
  errorCount: number;
  error: string | null;
  metadata: Record<string, unknown>;
};

export async function runGscPerformanceSync(options: {
  trigger: 'manual' | 'worker';
  session?: AdminSession | null;
  workerId?: string;
  scheduledFor?: string | null;
  lockTtlMs?: number;
  config?: GscClientConfig;
  fetchImpl?: GscFetch;
  concurrency?: number;
}): Promise<GscPerformanceSyncSummary> {
  if (options.trigger === 'manual') {
    assertAuthenticated(options.session);
  }

  const config = options.config ?? requireGscClientConfig();
  const owner =
    options.trigger === 'worker'
      ? options.workerId ?? `worker:${process.pid}`
      : `manual:${options.session!.email}`;
  const lockTtlMs = options.lockTtlMs ?? 15 * 60_000;

  const lock = await acquireJobLock({
    lockId: JOB_LOCK_GSC_PERFORMANCE,
    owner,
    ttlMs: lockTtlMs,
  });
  if (!lock.ok) {
    const skipped = await prisma.syncRun.create({
      data: {
        system: IntegrationSystem.GSC,
        jobType: GSC_PERFORMANCE_SYNC_JOB_TYPE,
        trigger: options.trigger,
        status: SyncRunStatus.SKIPPED,
        finishedAt: new Date(),
        error: 'Синхронизация уже выполняется',
        metadata: {
          provider: 'gsc',
          jobType: GSC_PERFORMANCE_SYNC_JOB_TYPE,
          trigger: options.trigger,
          skippedReason: 'active_lock',
        },
      },
    });
    return {
      syncRunId: skipped.id,
      status: skipped.status,
      processed: 0,
      updatedCount: 0,
      errorCount: 0,
      error: skipped.error,
      metadata: (skipped.metadata as Record<string, unknown>) ?? {},
    };
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      system: IntegrationSystem.GSC,
      jobType: GSC_PERFORMANCE_SYNC_JOB_TYPE,
      trigger: options.trigger,
      status: SyncRunStatus.RUNNING,
      metadata: {
        provider: 'gsc',
        jobType: GSC_PERFORMANCE_SYNC_JOB_TYPE,
        trigger: options.trigger,
        workerId: options.workerId ?? null,
        scheduledFor: options.scheduledFor ?? null,
      },
    },
  });

  try {
    const result = await syncGscPerformanceForActiveWebsites({
      config,
      fetchImpl: options.fetchImpl,
      concurrency: options.concurrency,
    });

    const status =
      result.errorCount === 0
        ? SyncRunStatus.SUCCESS
        : result.processed > result.errorCount
          ? SyncRunStatus.PARTIAL
          : result.processed === 0
            ? SyncRunStatus.SUCCESS
            : SyncRunStatus.FAILED;

    const metadata = {
      provider: 'gsc',
      jobType: GSC_PERFORMANCE_SYNC_JOB_TYPE,
      trigger: options.trigger,
      workerId: options.workerId ?? null,
      scheduledFor: options.scheduledFor ?? null,
      processed: result.processed,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 50),
    };

    const finished = await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status,
        finishedAt: new Date(),
        itemsRead: result.processed,
        itemsWritten: result.updated,
        processed: result.processed,
        updatedCount: result.updated,
        errorCount: result.errorCount,
        error: result.errorCount > 0 ? `${result.errorCount} property с ошибками` : null,
        metadata,
      },
    });

    return {
      syncRunId: finished.id,
      status: finished.status,
      processed: result.processed,
      updatedCount: result.updated,
      errorCount: result.errorCount,
      error: finished.error,
      metadata,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Синхронизация GSC performance не удалась';
    const finished = await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncRunStatus.FAILED,
        finishedAt: new Date(),
        errorCount: 1,
        error: message,
        metadata: {
          provider: 'gsc',
          jobType: GSC_PERFORMANCE_SYNC_JOB_TYPE,
          trigger: options.trigger,
          fatal: message,
        },
      },
    });
    return {
      syncRunId: finished.id,
      status: finished.status,
      processed: 0,
      updatedCount: 0,
      errorCount: 1,
      error: finished.error,
      metadata: (finished.metadata as Record<string, unknown>) ?? {},
    };
  } finally {
    await releaseJobLock({ lockId: JOB_LOCK_GSC_PERFORMANCE, owner });
  }
}

export async function runManualGscPerformanceSync(options: {
  session: AdminSession | null | undefined;
  config?: GscClientConfig;
  fetchImpl?: GscFetch;
}): Promise<GscPerformanceSyncSummary> {
  return runGscPerformanceSync({
    trigger: 'manual',
    session: options.session,
    config: options.config,
    fetchImpl: options.fetchImpl,
  });
}
