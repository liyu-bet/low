import {
  EventCategory,
  EventSource,
  IntegrationStatus,
  IntegrationSystem,
  Prisma,
  SyncRunStatus,
  WebsiteStatus,
} from '@prisma/client';
import { assertAuthenticated, type AdminSession } from '@/lib/auth/session';
import { DSD_SYNC_JOB_TYPE, EVENT_TYPE_SITE_CREATED } from '@/lib/constants';
import { fetchAllDsdSites, type DsdFetch } from '@/lib/dsd/client';
import { requireDsdClientConfig, type DsdClientConfig } from '@/lib/dsd/config';
import { planDsdSiteEvents } from '@/lib/dsd/events';
import {
  assertSafeSnapshot,
  buildSafeExternalSnapshot,
  type DsdExternalSnapshot,
  type DsdSite,
} from '@/lib/dsd/schemas';
import { prisma } from '@/lib/db/prisma';
import { DomainNormalizationError, normalizeDomain } from '@/lib/domain/normalize';

export type DsdSyncSummary = {
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

function asSnapshot(value: Prisma.JsonValue | null | undefined): DsdExternalSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as unknown as DsdExternalSnapshot;
}

function accountExternalId(provider: string, externalId: string): string {
  return `${provider}:${externalId}`;
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

export async function upsertDsdAccountReferences(
  tx: Prisma.TransactionClient,
  site: DsdSite,
): Promise<string | null> {
  let firstAccountId: string | null = null;

  for (const account of site.accounts) {
    const externalAccountId = accountExternalId(account.provider, account.externalId);
    const row = await tx.accountReference.upsert({
      where: {
        system_externalAccountId: {
          system: IntegrationSystem.DSD,
          externalAccountId,
        },
      },
      create: {
        system: IntegrationSystem.DSD,
        externalAccountId,
        label: account.name,
        hasAccess: account.hasCredential,
        metadata: {
          provider: account.provider,
          externalId: account.externalId,
          accountName: account.name,
          hasCredential: account.hasCredential,
          sourceSystem: 'dsd',
        },
      },
      update: {
        label: account.name,
        hasAccess: account.hasCredential,
        metadata: {
          provider: account.provider,
          externalId: account.externalId,
          accountName: account.name,
          hasCredential: account.hasCredential,
          sourceSystem: 'dsd',
        },
      },
    });
    if (!firstAccountId) firstAccountId = row.id;
  }

  return firstAccountId;
}

export async function matchOrCreateWebsiteForDsdSite(
  tx: Prisma.TransactionClient,
  site: DsdSite,
): Promise<{ websiteId: string; created: boolean; normalizedDomain: string }> {
  const existingIntegration = await tx.websiteIntegration.findFirst({
    where: {
      system: IntegrationSystem.DSD,
      externalEntityId: site.id,
    },
  });
  if (existingIntegration) {
    return {
      websiteId: existingIntegration.websiteId,
      created: false,
      normalizedDomain: (
        await tx.website.findUniqueOrThrow({ where: { id: existingIntegration.websiteId } })
      ).normalizedDomain,
    };
  }

  const normalizedDomain = normalizeDomain(site.url);
  const byDomain = await tx.website.findUnique({ where: { normalizedDomain } });
  if (byDomain) {
    return { websiteId: byDomain.id, created: false, normalizedDomain };
  }

  let displayDomain = normalizedDomain;
  try {
    displayDomain = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(site.url) ? site.url : `https://${site.url}`,
    ).hostname.replace(/\.$/, '');
  } catch {
    displayDomain = normalizedDomain;
  }

  const website = await tx.website.create({
    data: {
      domain: displayDomain,
      normalizedDomain,
      name: displayDomain,
      primaryUrl: site.url.startsWith('http') ? site.url : `https://${site.url}`,
      status: WebsiteStatus.ACTIVE,
      lastWorkAt: new Date(),
    },
  });

  await tx.websiteEvent.create({
    data: {
      websiteId: website.id,
      eventType: EVENT_TYPE_SITE_CREATED,
      category: EventCategory.LIFECYCLE,
      title: 'Сайт создан',
      description: `Сайт ${displayDomain} создан при синхронизации с DSD.`,
      source: EventSource.SYSTEM,
      sourceSystem: 'LOW',
      dedupeKey: `website:${website.id}:${EVENT_TYPE_SITE_CREATED}`,
      occurredAt: website.createdAt,
      createdBy: 'dsd-sync',
      metadata: { from: 'dsd', dsdSiteId: site.id },
    },
  });

  return { websiteId: website.id, created: true, normalizedDomain };
}

export async function syncSingleDsdSite(
  site: DsdSite,
): Promise<{ created: boolean; updated: boolean }> {
  const snapshot = buildSafeExternalSnapshot(site);
  assertSafeSnapshot(snapshot);

  return prisma.$transaction(async (tx) => {
    const matched = await matchOrCreateWebsiteForDsdSite(tx, site);
    const website = await tx.website.findUniqueOrThrow({ where: { id: matched.websiteId } });

    const existingIntegration = await tx.websiteIntegration.findFirst({
      where: {
        OR: [
          { system: IntegrationSystem.DSD, externalEntityId: site.id },
          { websiteId: website.id, system: IntegrationSystem.DSD },
        ],
      },
    });

    if (
      existingIntegration &&
      existingIntegration.websiteId === website.id &&
      existingIntegration.externalEntityId &&
      existingIntegration.externalEntityId !== site.id
    ) {
      throw new Error(
        `Конфликт интеграции: ${matched.normalizedDomain} уже связан с DSD id ${existingIntegration.externalEntityId}`,
      );
    }

    if (
      existingIntegration &&
      existingIntegration.externalEntityId === site.id &&
      existingIntegration.websiteId !== website.id
    ) {
      throw new Error(
        `Конфликт интеграции: DSD id ${site.id} уже связан с другим сайтом LOW`,
      );
    }

    const previousSnapshot = asSnapshot(existingIntegration?.externalData ?? null);
    const isFirstLink = !existingIntegration;
    const willSetFirstHealthy = website.firstHealthyAt == null && Boolean(site.firstHealthyAt);

    const accountReferenceId = await upsertDsdAccountReferences(tx, site);

    if (existingIntegration) {
      await tx.websiteIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          websiteId: website.id,
          externalEntityId: site.id,
          externalKey: matched.normalizedDomain,
          status: IntegrationStatus.LINKED,
          lastSyncedAt: new Date(),
          syncError: null,
          accountReferenceId,
          externalData: snapshot,
          metadata: {
            provider: 'dsd_site',
            sourceSystem: 'dsd',
          },
        },
      });
    } else {
      await tx.websiteIntegration.create({
        data: {
          websiteId: website.id,
          system: IntegrationSystem.DSD,
          externalEntityId: site.id,
          externalKey: matched.normalizedDomain,
          status: IntegrationStatus.LINKED,
          lastSyncedAt: new Date(),
          accountReferenceId,
          externalData: snapshot,
          metadata: {
            provider: 'dsd_site',
            sourceSystem: 'dsd',
          },
        },
      });
    }

    if (willSetFirstHealthy && site.firstHealthyAt) {
      await tx.website.update({
        where: { id: website.id },
        data: { firstHealthyAt: new Date(site.firstHealthyAt) },
      });
    }

    const planned = planDsdSiteEvents({
      site,
      previousSnapshot,
      isFirstLink,
      willSetFirstHealthy,
    });

    for (const event of planned) {
      await createEventIgnoreDuplicate(tx, {
        website: { connect: { id: website.id } },
        eventType: event.eventType,
        category: EventCategory.INTEGRATION,
        title: event.title,
        description: event.description,
        source: EventSource.DSD,
        sourceSystem: 'DSD',
        externalId: site.id,
        dedupeKey: event.dedupeKey,
        occurredAt: event.occurredAt,
        createdBy: 'dsd-sync',
        metadata: event.metadata as Prisma.InputJsonValue | undefined,
      });
    }

    return { created: matched.created, updated: !matched.created };
  });
}

export async function runManualDsdFullSync(options: {
  session: AdminSession | null | undefined;
  config?: DsdClientConfig;
  fetchImpl?: DsdFetch;
}): Promise<DsdSyncSummary> {
  assertAuthenticated(options.session);
  const config = options.config ?? requireDsdClientConfig();

  const syncRun = await prisma.syncRun.create({
    data: {
      system: IntegrationSystem.DSD,
      jobType: DSD_SYNC_JOB_TYPE,
      status: SyncRunStatus.RUNNING,
      metadata: { provider: 'dsd', jobType: DSD_SYNC_JOB_TYPE },
    },
  });

  let processed = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors: Array<{ dsdSiteId?: string; message: string }> = [];

  try {
    const sites = await fetchAllDsdSites(config, options.fetchImpl);
    for (const site of sites) {
      processed += 1;
      try {
        const result = await syncSingleDsdSite(site);
        if (result.created) createdCount += 1;
        if (result.updated) updatedCount += 1;
      } catch (error) {
        errorCount += 1;
        const message =
          error instanceof DomainNormalizationError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Неизвестная ошибка сайта';
        errors.push({ dsdSiteId: site.id, message });
      }
    }

    const status =
      errorCount === 0
        ? SyncRunStatus.SUCCESS
        : processed > 0 && errorCount < processed
          ? SyncRunStatus.PARTIAL
          : SyncRunStatus.FAILED;

    const metadata = {
      provider: 'dsd',
      jobType: DSD_SYNC_JOB_TYPE,
      processed,
      createdCount,
      updatedCount,
      errorCount,
      itemsRead: sites.length,
      errors: errors.slice(0, 50),
    };

    const finished = await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status,
        finishedAt: new Date(),
        itemsRead: sites.length,
        itemsWritten: createdCount + updatedCount,
        processed,
        createdCount,
        updatedCount,
        errorCount,
        error: errorCount > 0 ? `${errorCount} сайт(ов) с ошибками` : null,
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
      itemsRead: sites.length,
      error: finished.error,
      metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Синхронизация DSD не удалась';
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
          provider: 'dsd',
          jobType: DSD_SYNC_JOB_TYPE,
          processed,
          createdCount,
          updatedCount,
          errorCount: errorCount + 1,
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
  }
}

export async function getLatestDsdSyncRun() {
  return prisma.syncRun.findFirst({
    where: { system: IntegrationSystem.DSD },
    orderBy: { startedAt: 'desc' },
  });
}
