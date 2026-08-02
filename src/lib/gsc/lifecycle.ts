import {
  EventCategory,
  EventSource,
  IntegrationStatus,
  IntegrationSystem,
  Prisma,
  SyncRunStatus,
} from '@prisma/client';
import { assertAuthenticated, type AdminSession } from '@/lib/auth/session';
import {
  EVENT_TYPE_GSC_FIRST_CLICK,
  EVENT_TYPE_GSC_FIRST_CLICK_REFINED,
  EVENT_TYPE_GSC_FIRST_IMPRESSION,
  EVENT_TYPE_GSC_FIRST_IMPRESSION_REFINED,
  GSC_LIFECYCLE_SYNC_JOB_TYPE,
} from '@/lib/constants';
import { parseDateOnly, dateOnlyToInputValue } from '@/lib/dates/date-only';
import { prisma } from '@/lib/db/prisma';
import { fetchGscPropertyLifecycle, GscApiError, type GscFetch } from '@/lib/gsc/client';
import { requireGscClientConfig, type GscClientConfig } from '@/lib/gsc/config';
import type { GscLifecycle } from '@/lib/gsc/schemas';

export type GscLifecycleSyncSummary = {
  syncRunId: string;
  status: SyncRunStatus;
  processed: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  error: string | null;
  metadata: Record<string, unknown>;
};

async function createEventIgnoreDuplicate(
  tx: Prisma.TransactionClient,
  data: Prisma.WebsiteEventCreateInput,
): Promise<boolean> {
  try {
    await tx.websiteEvent.create({ data });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

/** Simple concurrency pool; never runs more than `limit` workers at once. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const concurrency = Math.max(1, Math.floor(limit));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    for (;;) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current]!, current);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(runners);
  return results;
}

export function planImpressionDateUpdate(input: {
  currentAutomatic: Date | null;
  incomingYmd: string | null;
}): {
  action: 'none' | 'set' | 'refine';
  nextDate: Date | null;
  previousYmd: string | null;
  nextYmd: string | null;
} {
  if (!input.incomingYmd) {
    return { action: 'none', nextDate: null, previousYmd: null, nextYmd: null };
  }
  const nextDate = parseDateOnly(input.incomingYmd);
  if (input.currentAutomatic == null) {
    return {
      action: 'set',
      nextDate,
      previousYmd: null,
      nextYmd: input.incomingYmd,
    };
  }
  if (input.currentAutomatic.getTime() > nextDate.getTime()) {
    return {
      action: 'refine',
      nextDate,
      previousYmd: dateOnlyToInputValue(input.currentAutomatic),
      nextYmd: input.incomingYmd,
    };
  }
  return {
    action: 'none',
    nextDate: input.currentAutomatic,
    previousYmd: dateOnlyToInputValue(input.currentAutomatic),
    nextYmd: input.incomingYmd,
  };
}

export async function applyLifecycleToWebsite(input: {
  websiteId: string;
  propertyId: string;
  siteUrl: string;
  lifecycle: GscLifecycle;
}): Promise<{
  firstImpressionDatesCreated: number;
  firstClickDatesCreated: number;
  eventsCreated: number;
}> {
  let firstImpressionDatesCreated = 0;
  let firstClickDatesCreated = 0;
  let eventsCreated = 0;

  await prisma.$transaction(async (tx) => {
    const website = await tx.website.findUniqueOrThrow({ where: { id: input.websiteId } });

    const impressionPlan = planImpressionDateUpdate({
      currentAutomatic: website.firstImpressionAt,
      incomingYmd: input.lifecycle.firstImpressionDate,
    });
    if (impressionPlan.action === 'set' || impressionPlan.action === 'refine') {
      await tx.website.update({
        where: { id: website.id },
        data: { firstImpressionAt: impressionPlan.nextDate },
      });
      if (impressionPlan.action === 'set') firstImpressionDatesCreated += 1;

      const created = await createEventIgnoreDuplicate(tx, {
        website: { connect: { id: website.id } },
        eventType:
          impressionPlan.action === 'set'
            ? EVENT_TYPE_GSC_FIRST_IMPRESSION
            : EVENT_TYPE_GSC_FIRST_IMPRESSION_REFINED,
        category: EventCategory.SEO,
        title:
          impressionPlan.action === 'set'
            ? 'Появились первые доступные показы в GSC'
            : 'Уточнена более ранняя дата первых показов GSC',
        description:
          'Самая ранняя дата среди данных, доступных через текущий Search Console API — не гарантированная первая дата за всю историю.',
        source: EventSource.GSC,
        sourceSystem: 'GSC',
        externalId: input.propertyId,
        dedupeKey:
          impressionPlan.action === 'set'
            ? `gsc:first-impression:${input.propertyId}:${impressionPlan.nextYmd}`
            : `gsc:first-impression-refined:${input.propertyId}:${impressionPlan.nextYmd}`,
        occurredAt: impressionPlan.nextDate!,
        createdBy: 'gsc-lifecycle-sync',
        metadata: {
          propertyId: input.propertyId,
          siteUrl: input.siteUrl,
          date: impressionPlan.nextYmd,
          searchedFrom: input.lifecycle.searchedFrom,
          searchedTo: input.lifecycle.searchedTo,
          dateMeaning: 'earliest_available_in_search_console_api',
          ...(impressionPlan.action === 'refine'
            ? {
                previousAutomaticDate: impressionPlan.previousYmd,
                newAutomaticDate: impressionPlan.nextYmd,
                reason: 'earlier_date_found_in_another_property',
              }
            : {}),
        },
      });
      if (created) eventsCreated += 1;
    }

    const clickPlan = planImpressionDateUpdate({
      currentAutomatic: website.firstClickAt,
      incomingYmd: input.lifecycle.firstClickDate,
    });
    if (clickPlan.action === 'set' || clickPlan.action === 'refine') {
      await tx.website.update({
        where: { id: website.id },
        data: { firstClickAt: clickPlan.nextDate },
      });
      if (clickPlan.action === 'set') firstClickDatesCreated += 1;

      const created = await createEventIgnoreDuplicate(tx, {
        website: { connect: { id: website.id } },
        eventType:
          clickPlan.action === 'set'
            ? EVENT_TYPE_GSC_FIRST_CLICK
            : EVENT_TYPE_GSC_FIRST_CLICK_REFINED,
        category: EventCategory.SEO,
        title:
          clickPlan.action === 'set'
            ? 'Появился первый доступный клик в GSC'
            : 'Уточнена более ранняя дата первого клика GSC',
        description:
          'Самая ранняя дата среди данных, доступных через текущий Search Console API — не гарантированная первая дата за всю историю.',
        source: EventSource.GSC,
        sourceSystem: 'GSC',
        externalId: input.propertyId,
        dedupeKey:
          clickPlan.action === 'set'
            ? `gsc:first-click:${input.propertyId}:${clickPlan.nextYmd}`
            : `gsc:first-click-refined:${input.propertyId}:${clickPlan.nextYmd}`,
        occurredAt: clickPlan.nextDate!,
        createdBy: 'gsc-lifecycle-sync',
        metadata: {
          propertyId: input.propertyId,
          siteUrl: input.siteUrl,
          date: clickPlan.nextYmd,
          searchedFrom: input.lifecycle.searchedFrom,
          searchedTo: input.lifecycle.searchedTo,
          dateMeaning: 'earliest_available_in_search_console_api',
          ...(clickPlan.action === 'refine'
            ? {
                previousAutomaticDate: clickPlan.previousYmd,
                newAutomaticDate: clickPlan.nextYmd,
                reason: 'earlier_date_found_in_another_property',
              }
            : {}),
        },
      });
      if (created) eventsCreated += 1;
    }
  });

  return { firstImpressionDatesCreated, firstClickDatesCreated, eventsCreated };
}

export async function runManualGscLifecycleSync(options: {
  session: AdminSession | null | undefined;
  config?: GscClientConfig;
  fetchImpl?: GscFetch;
}): Promise<GscLifecycleSyncSummary> {
  assertAuthenticated(options.session);
  const config = options.config ?? requireGscClientConfig();

  const syncRun = await prisma.syncRun.create({
    data: {
      system: IntegrationSystem.GSC,
      jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE,
      status: SyncRunStatus.RUNNING,
      metadata: { provider: 'gsc', jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE },
    },
  });

  const eligible = await prisma.websiteIntegration.findMany({
    where: {
      system: IntegrationSystem.GSC,
      status: IntegrationStatus.LINKED,
      externalEntityId: { not: null },
      website: {
        OR: [{ firstImpressionAt: null }, { firstClickAt: null }],
      },
    },
    include: {
      website: {
        select: {
          id: true,
          firstImpressionAt: true,
          firstClickAt: true,
        },
      },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const capped = eligible.slice(0, config.lifecycleMaxPropertiesPerRun);
  const skippedProperties = Math.max(0, eligible.length - capped.length);

  let processedProperties = 0;
  let firstImpressionDatesCreated = 0;
  let firstClickDatesCreated = 0;
  let eventsCreated = 0;
  let errorCount = 0;
  const errors: Array<{ propertyId?: string; message: string }> = [];
  const inFlight = new Set<string>();

  const results = await mapWithConcurrency(capped, config.lifecycleConcurrency, async (row) => {
    const propertyId = row.externalEntityId;
    if (!propertyId) {
      return { ok: false as const, message: 'Нет externalEntityId' };
    }
    if (inFlight.has(propertyId)) {
      return { ok: false as const, message: 'Повторный параллельный запрос к той же property' };
    }
    inFlight.add(propertyId);
    try {
      // Skip if both automatic dates already set (race-safe re-check)
      if (row.website.firstImpressionAt != null && row.website.firstClickAt != null) {
        return { ok: true as const, skipped: true };
      }

      const lifecycle = await fetchGscPropertyLifecycle(propertyId, config, options.fetchImpl);
      const applied = await applyLifecycleToWebsite({
        websiteId: row.websiteId,
        propertyId,
        siteUrl:
          typeof row.externalKey === 'string' && row.externalKey
            ? row.externalKey
            : lifecycle.siteUrl,
        lifecycle,
      });
      return { ok: true as const, skipped: false, applied };
    } catch (error) {
      const message =
        error instanceof GscApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Ошибка lifecycle';
      return { ok: false as const, message, propertyId };
    } finally {
      inFlight.delete(propertyId);
    }
  });

  for (const result of results) {
    if (!result.ok) {
      errorCount += 1;
      errors.push({ propertyId: result.propertyId, message: result.message });
      continue;
    }
    if (result.skipped) continue;
    processedProperties += 1;
    if (result.applied) {
      firstImpressionDatesCreated += result.applied.firstImpressionDatesCreated;
      firstClickDatesCreated += result.applied.firstClickDatesCreated;
      eventsCreated += result.applied.eventsCreated;
    }
  }

  const status =
    errorCount === 0
      ? SyncRunStatus.SUCCESS
      : processedProperties > 0 || capped.length > errorCount
        ? SyncRunStatus.PARTIAL
        : SyncRunStatus.FAILED;

  const metadata = {
    provider: 'gsc',
    jobType: GSC_LIFECYCLE_SYNC_JOB_TYPE,
    eligibleProperties: eligible.length,
    processedProperties,
    skippedProperties,
    firstImpressionDatesCreated,
    firstClickDatesCreated,
    eventsCreated,
    concurrency: config.lifecycleConcurrency,
    maxPropertiesPerRun: config.lifecycleMaxPropertiesPerRun,
    errors: errors.slice(0, 50),
  };

  const finished = await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: {
      status,
      finishedAt: new Date(),
      itemsRead: eligible.length,
      itemsWritten: firstImpressionDatesCreated + firstClickDatesCreated,
      processed: processedProperties,
      createdCount: firstImpressionDatesCreated + firstClickDatesCreated,
      updatedCount: eventsCreated,
      errorCount,
      error: errorCount > 0 ? `${errorCount} property с ошибками lifecycle` : null,
      metadata,
    },
  });

  return {
    syncRunId: finished.id,
    status: finished.status,
    processed: processedProperties,
    createdCount: finished.createdCount,
    updatedCount: finished.updatedCount,
    errorCount,
    error: finished.error,
    metadata,
  };
}
