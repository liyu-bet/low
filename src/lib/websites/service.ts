import {
  DateSource,
  EventCategory,
  EventSource,
  LifecycleStage,
  Prisma,
  Website,
  WebsiteStatus,
} from '@prisma/client';
import {
  EVENT_TYPE_SITE_CREATED,
  EVENT_TYPE_WEBSITE_ARCHIVED,
  EVENT_TYPE_WEBSITE_RESTORED,
} from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { DomainNormalizationError } from '@/lib/domain/normalize';
import {
  parseDomainInput,
  websiteCreateSchema,
  websiteUpdateSchema,
  type WebsiteCreateInput,
  type WebsiteUpdateInput,
} from '@/lib/validations/website';

export class DuplicateDomainError extends Error {
  readonly normalizedDomain: string;

  constructor(normalizedDomain: string) {
    super(`Website with normalized domain already exists: ${normalizedDomain}`);
    this.name = 'DuplicateDomainError';
    this.normalizedDomain = normalizedDomain;
  }
}

export class WebsiteNotFoundError extends Error {
  constructor(id: string) {
    super(`Website not found: ${id}`);
    this.name = 'WebsiteNotFoundError';
  }
}

export async function findWebsiteByNormalizedDomain(
  normalizedDomain: string,
): Promise<Website | null> {
  return prisma.website.findUnique({ where: { normalizedDomain } });
}

export async function assertUniqueNormalizedDomain(
  normalizedDomain: string,
  excludeWebsiteId?: string,
): Promise<void> {
  const existing = await findWebsiteByNormalizedDomain(normalizedDomain);
  throwIfDuplicateDomain(existing, normalizedDomain, excludeWebsiteId);
}

export function throwIfDuplicateDomain(
  existing: { id: string } | null,
  normalizedDomain: string,
  excludeWebsiteId?: string,
): void {
  if (existing && existing.id !== excludeWebsiteId) {
    throw new DuplicateDomainError(normalizedDomain);
  }
}

/**
 * Prepare create payload: Zod validate + domain normalize.
 * Pure enough for unit tests when prisma is not required.
 */
export function prepareWebsiteCreateData(raw: unknown): {
  data: WebsiteCreateInput & { domain: string; normalizedDomain: string };
} {
  const parsed = websiteCreateSchema.parse(raw);
  const { domain, normalizedDomain } = parseDomainInput(parsed.domain);
  return {
    data: {
      ...parsed,
      domain,
      normalizedDomain,
    },
  };
}

export function prepareWebsiteUpdateData(raw: unknown): {
  data: WebsiteUpdateInput & { domain?: string; normalizedDomain?: string };
} {
  const parsed = websiteUpdateSchema.parse(raw);
  if (parsed.domain == null) {
    return { data: parsed };
  }
  const { domain, normalizedDomain } = parseDomainInput(parsed.domain);
  return {
    data: {
      ...parsed,
      domain,
      normalizedDomain,
    },
  };
}

export async function listWebsites(options?: { includeArchived?: boolean }): Promise<Website[]> {
  const includeArchived = options?.includeArchived ?? false;
  return prisma.website.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
    orderBy: [{ updatedAt: 'desc' }],
  });
}

export async function getWebsiteById(id: string): Promise<Website> {
  const website = await prisma.website.findUnique({ where: { id } });
  if (!website) throw new WebsiteNotFoundError(id);
  return website;
}

export async function createWebsite(
  raw: unknown,
  options?: { createdBy?: string; createdByUserId?: string | null },
): Promise<Website> {
  const { data } = prepareWebsiteCreateData(raw);
  await assertUniqueNormalizedDomain(data.normalizedDomain);

  const launchedAt = data.launchedAt ?? null;

  try {
    return await prisma.$transaction(async (tx) => {
      const website = await tx.website.create({
        data: {
          domain: data.domain,
          normalizedDomain: data.normalizedDomain,
          name: data.name,
          primaryUrl: data.primaryUrl,
          status: data.status,
          lifecycleStage: data.lifecycleStage,
          group: data.group,
          tags: data.tags,
          launchedAt,
          launchDateSource: launchedAt ? DateSource.MANUAL : null,
          lastWorkAt: new Date(),
        },
      });

      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_SITE_CREATED,
          category: EventCategory.LIFECYCLE,
          title: 'Сайт создан',
          description: `Сайт ${website.domain} добавлен в LOW.`,
          source: EventSource.SYSTEM,
          sourceSystem: 'LOW',
          dedupeKey: `website:${website.id}:${EVENT_TYPE_SITE_CREATED}`,
          occurredAt: website.createdAt,
          createdBy: options?.createdBy ?? 'admin',
          createdByUserId: options?.createdByUserId ?? null,
          metadata: {
            domain: website.domain,
            normalizedDomain: website.normalizedDomain,
          },
        },
      });

      return website;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DuplicateDomainError(data.normalizedDomain);
    }
    throw error;
  }
}

export async function updateWebsite(id: string, raw: unknown): Promise<Website> {
  await getWebsiteById(id);
  const { data } = prepareWebsiteUpdateData(raw);

  if (data.normalizedDomain) {
    await assertUniqueNormalizedDomain(data.normalizedDomain, id);
  }

  const launchedAt = data.launchedAt === undefined ? undefined : data.launchedAt ?? null;

  try {
    return await prisma.website.update({
      where: { id },
      data: {
        ...(data.domain !== undefined ? { domain: data.domain } : {}),
        ...(data.normalizedDomain !== undefined
          ? { normalizedDomain: data.normalizedDomain }
          : {}),
        ...(data.name !== undefined ? { name: data.name ?? null } : {}),
        ...(data.primaryUrl !== undefined ? { primaryUrl: data.primaryUrl ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.lifecycleStage !== undefined ? { lifecycleStage: data.lifecycleStage } : {}),
        ...(data.group !== undefined ? { group: data.group ?? null } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(launchedAt !== undefined
          ? {
              launchedAt,
              launchDateSource: launchedAt ? DateSource.MANUAL : null,
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DuplicateDomainError(data.normalizedDomain ?? 'unknown');
    }
    throw error;
  }
}

/** Author of an archive/restore action. Omitted for system-triggered changes. */
export type WebsiteActor = { userId?: string | null; label?: string | null };

type ArchivableWebsite = {
  status: WebsiteStatus;
  lifecycleStage: LifecycleStage;
  archivedAt: Date | null;
  statusBeforeArchive: WebsiteStatus | null;
  lifecycleStageBeforeArchive: LifecycleStage | null;
};

export function isWebsiteArchived(
  website: Pick<ArchivableWebsite, 'archivedAt' | 'status' | 'lifecycleStage'>,
): boolean {
  return (
    website.archivedAt != null ||
    website.status === WebsiteStatus.ARCHIVED ||
    website.lifecycleStage === LifecycleStage.ARCHIVED
  );
}

/**
 * Pure state transition for archiving. Returns null when the website is already
 * archived (idempotent no-op) so callers can skip the write + event entirely.
 */
export function buildArchiveUpdateData(
  website: Pick<ArchivableWebsite, 'archivedAt' | 'status' | 'lifecycleStage'>,
  now: Date = new Date(),
): Prisma.WebsiteUpdateInput | null {
  if (isWebsiteArchived(website)) return null;
  return {
    statusBeforeArchive: website.status,
    lifecycleStageBeforeArchive: website.lifecycleStage,
    status: WebsiteStatus.ARCHIVED,
    lifecycleStage: LifecycleStage.ARCHIVED,
    archivedAt: now,
  };
}

/**
 * Pure state transition for restoring. Falls back to ACTIVE/LAUNCHED when the
 * pre-archive values were never recorded (e.g. websites archived before this feature).
 * Returns null when the website is not currently archived (idempotent no-op).
 */
export function buildRestoreUpdateData(
  website: ArchivableWebsite,
): Prisma.WebsiteUpdateInput | null {
  if (!isWebsiteArchived(website)) return null;
  return {
    status: website.statusBeforeArchive ?? WebsiteStatus.ACTIVE,
    lifecycleStage: website.lifecycleStageBeforeArchive ?? LifecycleStage.LAUNCHED,
    statusBeforeArchive: null,
    lifecycleStageBeforeArchive: null,
    archivedAt: null,
  };
}

export function buildArchiveEventData(
  website: { id: string; domain: string; status: WebsiteStatus; lifecycleStage: LifecycleStage },
  actor: WebsiteActor | undefined,
  now: Date = new Date(),
): Prisma.WebsiteEventUncheckedCreateInput {
  return {
    websiteId: website.id,
    eventType: EVENT_TYPE_WEBSITE_ARCHIVED,
    category: EventCategory.LIFECYCLE,
    title: 'Сайт перемещён в архив',
    description: `Сайт ${website.domain} перемещён в архив.`,
    source: actor?.userId ? EventSource.MANUAL : EventSource.SYSTEM,
    sourceSystem: 'LOW',
    occurredAt: now,
    createdBy: actor?.label ?? 'admin',
    createdByUserId: actor?.userId ?? null,
    metadata: {
      previousStatus: website.status,
      previousLifecycleStage: website.lifecycleStage,
    },
  };
}

export function buildRestoreEventData(
  website: { id: string; domain: string },
  restored: { status: WebsiteStatus; lifecycleStage: LifecycleStage },
  actor: WebsiteActor | undefined,
  now: Date = new Date(),
): Prisma.WebsiteEventUncheckedCreateInput {
  return {
    websiteId: website.id,
    eventType: EVENT_TYPE_WEBSITE_RESTORED,
    category: EventCategory.LIFECYCLE,
    title: 'Сайт восстановлен из архива',
    description: `Сайт ${website.domain} возвращён в LOW.`,
    source: actor?.userId ? EventSource.MANUAL : EventSource.SYSTEM,
    sourceSystem: 'LOW',
    occurredAt: now,
    createdBy: actor?.label ?? 'admin',
    createdByUserId: actor?.userId ?? null,
    metadata: {
      restoredStatus: restored.status,
      restoredLifecycleStage: restored.lifecycleStage,
    },
  };
}

/** Idempotent: archiving an already-archived website is a no-op (no duplicate event). */
export async function archiveWebsite(id: string, actor?: WebsiteActor): Promise<Website> {
  const website = await getWebsiteById(id);
  const now = new Date();
  const updateData = buildArchiveUpdateData(website, now);
  if (!updateData) {
    return website;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.website.update({ where: { id }, data: updateData });
    await tx.websiteEvent.create({ data: buildArchiveEventData(website, actor, now) });
    return updated;
  });
}

/** Idempotent: restoring a non-archived website is a no-op (no duplicate event). */
export async function restoreWebsite(id: string, actor?: WebsiteActor): Promise<Website> {
  const website = await getWebsiteById(id);
  const updateData = buildRestoreUpdateData(website);
  if (!updateData) {
    return website;
  }
  const now = new Date();
  const restored = {
    status: (updateData.status as WebsiteStatus | undefined) ?? WebsiteStatus.ACTIVE,
    lifecycleStage: (updateData.lifecycleStage as LifecycleStage | undefined) ?? LifecycleStage.LAUNCHED,
  };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.website.update({ where: { id }, data: updateData });
    await tx.websiteEvent.create({
      data: buildRestoreEventData(website, restored, actor, now),
    });
    return updated;
  });
}

export function isDomainNormalizationError(error: unknown): error is DomainNormalizationError {
  return error instanceof DomainNormalizationError;
}

export function isDuplicateDomainError(error: unknown): error is DuplicateDomainError {
  return error instanceof DuplicateDomainError;
}
