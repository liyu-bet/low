import {
  EventCategory,
  EventSource,
  IntegrationStatus,
  IntegrationSystem,
  LifecycleStage,
  Prisma,
  SyncRunStatus,
  WebsiteStatus,
} from '@prisma/client';
import { assertAuthenticated, type AdminSession } from '@/lib/auth/session';
import {
  EVENT_TYPE_GSC_PROPERTY_FIRST_SEEN,
  EVENT_TYPE_SITE_CREATED,
  GSC_PROPERTIES_SYNC_JOB_TYPE,
  JOB_LOCK_GSC_PROPERTIES,
} from '@/lib/constants';
import { fetchAllGscProperties, type GscFetch } from '@/lib/gsc/client';
import { requireGscClientConfig, type GscClientConfig } from '@/lib/gsc/config';
import { normalizeGscPropertyUrl } from '@/lib/gsc/property';
import {
  assertSafeGscSnapshot,
  buildSafeGscExternalSnapshot,
  type GscProperty,
} from '@/lib/gsc/schemas';
import { prisma } from '@/lib/db/prisma';
import { DomainNormalizationError } from '@/lib/domain/normalize';
import { acquireJobLock, releaseJobLock } from '@/lib/worker/locks';

export type GscPropertiesSyncSummary = {
  syncRunId: string;
  status: SyncRunStatus;
  processed: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  itemsRead: number;
  error: string | null;
  metadata: Record<string, unknown>;
};

export class GscSyncConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GscSyncConflictError';
  }
}

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

export async function upsertGscAccountReference(
  tx: Prisma.TransactionClient,
  connection: GscProperty['connection'],
): Promise<string> {
  const row = await tx.accountReference.upsert({
    where: {
      system_externalAccountId: {
        system: IntegrationSystem.GSC,
        externalAccountId: connection.id,
      },
    },
    create: {
      system: IntegrationSystem.GSC,
      externalAccountId: connection.id,
      label: connection.name || connection.email,
      hasAccess: true,
      metadata: {
        provider: 'google_search_console',
        externalId: connection.id,
        accountName: connection.name || connection.email,
        email: connection.email,
        hasCredential: true,
        sourceSystem: 'gsc',
      },
    },
    update: {
      label: connection.name || connection.email,
      hasAccess: true,
      metadata: {
        provider: 'google_search_console',
        externalId: connection.id,
        accountName: connection.name || connection.email,
        email: connection.email,
        hasCredential: true,
        sourceSystem: 'gsc',
      },
    },
  });
  return row.id;
}

export async function matchOrCreateWebsiteForGscProperty(
  tx: Prisma.TransactionClient,
  property: GscProperty,
): Promise<{
  websiteId: string;
  created: boolean;
  normalizedDomain: string;
  propertyType: 'domain' | 'url_prefix';
  originalPropertyUrl: string;
  primaryUrl: string | null;
}> {
  const normalized = normalizeGscPropertyUrl(property.siteUrl);

  const existingIntegration = await tx.websiteIntegration.findUnique({
    where: {
      system_externalEntityId: {
        system: IntegrationSystem.GSC,
        externalEntityId: property.id,
      },
    },
  });

  if (existingIntegration) {
    const website = await tx.website.findUniqueOrThrow({
      where: { id: existingIntegration.websiteId },
    });
    if (website.normalizedDomain !== normalized.normalizedDomain) {
      throw new GscSyncConflictError(
        `Конфликт: GSC property ${property.id} уже связан с ${website.normalizedDomain}, а siteUrl нормализуется в ${normalized.normalizedDomain}`,
      );
    }
    return {
      websiteId: existingIntegration.websiteId,
      created: false,
      normalizedDomain: normalized.normalizedDomain,
      propertyType: normalized.propertyType,
      originalPropertyUrl: normalized.originalPropertyUrl,
      primaryUrl: normalized.primaryUrl,
    };
  }

  const byDomain = await tx.website.findUnique({
    where: { normalizedDomain: normalized.normalizedDomain },
  });
  if (byDomain) {
    return {
      websiteId: byDomain.id,
      created: false,
      normalizedDomain: normalized.normalizedDomain,
      propertyType: normalized.propertyType,
      originalPropertyUrl: normalized.originalPropertyUrl,
      primaryUrl: normalized.primaryUrl,
    };
  }

  const website = await tx.website.create({
    data: {
      domain: normalized.displayDomain,
      normalizedDomain: normalized.normalizedDomain,
      name: normalized.displayDomain,
      primaryUrl: normalized.primaryUrl,
      status: WebsiteStatus.ACTIVE,
      lifecycleStage: LifecycleStage.SETUP,
      lastWorkAt: new Date(),
    },
  });

  await tx.websiteEvent.create({
    data: {
      websiteId: website.id,
      eventType: EVENT_TYPE_SITE_CREATED,
      category: EventCategory.LIFECYCLE,
      title: 'Сайт создан',
      description: `Сайт ${normalized.displayDomain} создан при синхронизации с GSC.`,
      source: EventSource.SYSTEM,
      sourceSystem: 'LOW',
      dedupeKey: `website:${website.id}:${EVENT_TYPE_SITE_CREATED}`,
      occurredAt: website.createdAt,
      createdBy: 'gsc-sync',
      metadata: { from: 'gsc', gscPropertyId: property.id },
    },
  });

  return {
    websiteId: website.id,
    created: true,
    normalizedDomain: normalized.normalizedDomain,
    propertyType: normalized.propertyType,
    originalPropertyUrl: normalized.originalPropertyUrl,
    primaryUrl: normalized.primaryUrl,
  };
}

export async function syncSingleGscProperty(
  property: GscProperty,
): Promise<{
  created: boolean;
  updated: boolean;
  websiteCreated: boolean;
  integrationCreated: boolean;
  eventCreated: boolean;
  accountUpserted: boolean;
}> {
  const matchedPreview = normalizeGscPropertyUrl(property.siteUrl);
  const snapshot = buildSafeGscExternalSnapshot(property, matchedPreview.propertyType);
  assertSafeGscSnapshot(snapshot);

  return prisma.$transaction(async (tx) => {
    const matched = await matchOrCreateWebsiteForGscProperty(tx, property);
    const website = await tx.website.findUniqueOrThrow({ where: { id: matched.websiteId } });

    const existingIntegration = await tx.websiteIntegration.findUnique({
      where: {
        system_externalEntityId: {
          system: IntegrationSystem.GSC,
          externalEntityId: property.id,
        },
      },
    });

    const accountReferenceId = await upsertGscAccountReference(tx, property.connection);
    const isFirstLink = !existingIntegration;
    let eventCreated = false;

    if (existingIntegration) {
      await tx.websiteIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          websiteId: website.id,
          externalEntityId: property.id,
          externalKey: property.siteUrl,
          status: IntegrationStatus.LINKED,
          lastSyncedAt: new Date(),
          syncError: null,
          accountReferenceId,
          externalData: snapshot,
          metadata: {
            provider: 'gsc_property',
            sourceSystem: 'gsc',
            propertyType: matched.propertyType,
          },
        },
      });
    } else {
      await tx.websiteIntegration.create({
        data: {
          websiteId: website.id,
          system: IntegrationSystem.GSC,
          externalEntityId: property.id,
          externalKey: property.siteUrl,
          status: IntegrationStatus.LINKED,
          lastSyncedAt: new Date(),
          accountReferenceId,
          externalData: snapshot,
          metadata: {
            provider: 'gsc_property',
            sourceSystem: 'gsc',
            propertyType: matched.propertyType,
          },
        },
      });
    }

    const firstSeenAt = new Date(property.firstSeenAt);
    if (Number.isNaN(firstSeenAt.getTime())) {
      throw new Error(`Некорректный firstSeenAt для property ${property.id}`);
    }

    const shouldSetGscFirstSeen =
      website.gscFirstSeenAt == null || website.gscFirstSeenAt.getTime() > firstSeenAt.getTime();
    if (shouldSetGscFirstSeen) {
      await tx.website.update({
        where: { id: website.id },
        data: { gscFirstSeenAt: firstSeenAt },
      });
    }

    if (isFirstLink) {
      eventCreated = await createEventIgnoreDuplicate(tx, {
        website: { connect: { id: website.id } },
        eventType: EVENT_TYPE_GSC_PROPERTY_FIRST_SEEN,
        category: EventCategory.INTEGRATION,
        title: 'Сайт обнаружен в Google Search Console',
        description:
          'Дата первого импорта свойства в приложение GSC Portfolio Dashboard, а не гарантированная дата добавления в Google Search Console.',
        source: EventSource.GSC,
        sourceSystem: 'GSC',
        externalId: property.id,
        dedupeKey: `gsc:property-first-seen:${property.id}`,
        occurredAt: firstSeenAt,
        createdBy: 'gsc-sync',
        metadata: {
          propertyId: property.id,
          siteUrl: property.siteUrl,
          propertyType: matched.propertyType,
          connectionId: property.connection.id,
          connectionEmail: property.connection.email,
          dateMeaning: 'first_imported_into_gsc_application',
        },
      });
    }

    return {
      created: matched.created,
      updated: !matched.created,
      websiteCreated: matched.created,
      integrationCreated: isFirstLink,
      eventCreated,
      accountUpserted: true,
    };
  });
}

export async function runGscPropertiesSync(options: {
  trigger: 'manual' | 'worker';
  session?: AdminSession | null;
  mode?: 'full' | 'incremental';
  updatedSince?: string | null;
  fullReconciliation?: boolean;
  workerId?: string;
  scheduledFor?: string | null;
  lockTtlMs?: number;
  config?: GscClientConfig;
  fetchImpl?: GscFetch;
}): Promise<GscPropertiesSyncSummary> {
  if (options.trigger === 'manual') {
    assertAuthenticated(options.session);
  }

  const config = options.config ?? requireGscClientConfig();
  const mode = options.mode ?? 'full';
  const updatedSince = mode === 'incremental' ? options.updatedSince ?? null : null;
  const owner =
    options.trigger === 'worker'
      ? options.workerId ?? `worker:${process.pid}`
      : `manual:${options.session!.email}`;
  const lockTtlMs = options.lockTtlMs ?? 45 * 60_000;

  const lock = await acquireJobLock({
    lockId: JOB_LOCK_GSC_PROPERTIES,
    owner,
    ttlMs: lockTtlMs,
  });
  if (!lock.ok) {
    const skipped = await prisma.syncRun.create({
      data: {
        system: IntegrationSystem.GSC,
        jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
        trigger: options.trigger,
        status: SyncRunStatus.SKIPPED,
        finishedAt: new Date(),
        error: 'Синхронизация уже выполняется',
        metadata: {
          provider: 'gsc',
          jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
          trigger: options.trigger,
          skippedReason: 'active_lock',
        },
      },
    });
    return {
      syncRunId: skipped.id,
      status: skipped.status,
      processed: 0,
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      itemsRead: 0,
      error: skipped.error,
      metadata: (skipped.metadata as Record<string, unknown>) ?? {},
    };
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      system: IntegrationSystem.GSC,
      jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
      trigger: options.trigger,
      status: SyncRunStatus.RUNNING,
      metadata: {
        provider: 'gsc',
        jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
        trigger: options.trigger,
        mode,
        updatedSince,
        workerId: options.workerId ?? null,
        scheduledFor: options.scheduledFor ?? null,
        fullReconciliation: Boolean(options.fullReconciliation),
      },
    },
  });

  let processed = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let pagesFetched = 0;
  let websitesCreated = 0;
  let websitesMatched = 0;
  let integrationsCreated = 0;
  let eventsCreated = 0;
  let accountReferencesUpserted = 0;
  const conflicts: Array<{ propertyId?: string; message: string }> = [];
  const errors: Array<{ propertyId?: string; message: string }> = [];

  try {
    const properties = await fetchAllGscProperties(config, options.fetchImpl, { updatedSince });
    pagesFetched = Math.max(1, Math.ceil(properties.length / Math.max(1, config.pageSize)));

    for (const property of properties) {
      processed += 1;
      try {
        const result = await syncSingleGscProperty(property);
        if (result.created) createdCount += 1;
        if (result.updated) updatedCount += 1;
        if (result.websiteCreated) websitesCreated += 1;
        else websitesMatched += 1;
        if (result.integrationCreated) integrationsCreated += 1;
        if (result.eventCreated) eventsCreated += 1;
        if (result.accountUpserted) accountReferencesUpserted += 1;
      } catch (error) {
        errorCount += 1;
        const message =
          error instanceof DomainNormalizationError ||
          error instanceof GscSyncConflictError ||
          error instanceof Error
            ? error.message
            : 'Неизвестная ошибка property';
        const entry = { propertyId: property.id, message };
        errors.push(entry);
        if (error instanceof GscSyncConflictError) conflicts.push(entry);
      }
    }

    const status =
      errorCount === 0
        ? SyncRunStatus.SUCCESS
        : processed > 0 && errorCount < processed
          ? SyncRunStatus.PARTIAL
          : SyncRunStatus.FAILED;

    const metadata = {
      provider: 'gsc',
      jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
      trigger: options.trigger,
      mode,
      updatedSince,
      workerId: options.workerId ?? null,
      scheduledFor: options.scheduledFor ?? null,
      fullReconciliation: Boolean(options.fullReconciliation),
      startedAt: syncRun.startedAt.toISOString(),
      incrementalCursor: syncRun.startedAt.toISOString(),
      pagesFetched,
      propertiesProcessed: processed,
      websitesCreated,
      websitesMatched,
      integrationsCreated,
      eventsCreated,
      accountReferencesUpserted,
      conflicts: conflicts.slice(0, 50),
      errors: errors.slice(0, 50),
    };

    const finished = await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status,
        finishedAt: new Date(),
        itemsRead: properties.length,
        itemsWritten: createdCount + updatedCount,
        processed,
        createdCount,
        updatedCount,
        errorCount,
        error: errorCount > 0 ? `${errorCount} property с ошибками` : null,
        metadata,
      },
    });

    return {
      syncRunId: finished.id,
      status: finished.status,
      processed,
      createdCount,
      updatedCount,
      errorCount,
      itemsRead: properties.length,
      error: finished.error,
      metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Синхронизация GSC не удалась';
    const finished = await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncRunStatus.FAILED,
        finishedAt: new Date(),
        processed,
        createdCount,
        updatedCount,
        errorCount: errorCount + 1,
        error: message,
        metadata: {
          provider: 'gsc',
          jobType: GSC_PROPERTIES_SYNC_JOB_TYPE,
          trigger: options.trigger,
          mode,
          updatedSince,
          workerId: options.workerId ?? null,
          fatal: message,
        },
      },
    });

    return {
      syncRunId: finished.id,
      status: finished.status,
      processed,
      createdCount,
      updatedCount,
      errorCount: finished.errorCount,
      itemsRead: finished.itemsRead,
      error: finished.error,
      metadata: (finished.metadata as Record<string, unknown>) ?? {},
    };
  } finally {
    await releaseJobLock({ lockId: JOB_LOCK_GSC_PROPERTIES, owner });
  }
}

export async function runManualGscPropertiesSync(options: {
  session: AdminSession | null | undefined;
  config?: GscClientConfig;
  fetchImpl?: GscFetch;
}): Promise<GscPropertiesSyncSummary> {
  return runGscPropertiesSync({
    trigger: 'manual',
    session: options.session,
    mode: 'full',
    config: options.config,
    fetchImpl: options.fetchImpl,
  });
}

export async function getLatestGscSyncRun(jobType?: string, trigger?: string) {
  const legacy =
    jobType === GSC_PROPERTIES_SYNC_JOB_TYPE
      ? ['manual_properties_sync']
      : jobType?.includes('lifecycle')
        ? ['manual_lifecycle_sync']
        : [];
  return prisma.syncRun.findFirst({
    where: {
      system: IntegrationSystem.GSC,
      ...(jobType ? { jobType: { in: [jobType, ...legacy] } } : {}),
      ...(trigger ? { trigger } : {}),
    },
    orderBy: { startedAt: 'desc' },
  });
}
