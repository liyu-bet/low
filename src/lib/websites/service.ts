import {
  DateSource,
  EventCategory,
  EventSource,
  Prisma,
  Website,
  WebsiteStatus,
} from '@prisma/client';
import { EVENT_TYPE_SITE_CREATED } from '@/lib/constants';
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

export async function archiveWebsite(id: string): Promise<Website> {
  await getWebsiteById(id);
  return prisma.website.update({
    where: { id },
    data: {
      status: WebsiteStatus.ARCHIVED,
      archivedAt: new Date(),
      lifecycleStage: 'ARCHIVED',
    },
  });
}

export function isDomainNormalizationError(error: unknown): error is DomainNormalizationError {
  return error instanceof DomainNormalizationError;
}

export function isDuplicateDomainError(error: unknown): error is DuplicateDomainError {
  return error instanceof DuplicateDomainError;
}
