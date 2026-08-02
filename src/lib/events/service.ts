import { EventSource, WebsiteEvent } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  buildEventListWhere,
  eventListSkipTake,
  parseEventListQuery,
  type EventListQuery,
} from '@/lib/events/query';
import { WebsiteNotFoundError, getWebsiteById } from '@/lib/websites/service';
import {
  manualEventSchema,
  resolveManualEventCategory,
  toAmountMinor,
} from '@/lib/validations/event';

export async function listWebsiteEvents(websiteId: string): Promise<WebsiteEvent[]> {
  await getWebsiteById(websiteId);
  return prisma.websiteEvent.findMany({
    where: { websiteId },
    orderBy: [{ occurredAt: 'desc' }, { recordedAt: 'desc' }],
  });
}

export async function queryWebsiteEvents(
  websiteId: string,
  searchParams: Record<string, string | string[] | undefined> = {},
  now: Date = new Date(),
): Promise<{
  events: WebsiteEvent[];
  total: number;
  query: EventListQuery;
  pageSize: number;
}> {
  await getWebsiteById(websiteId);
  const query = parseEventListQuery(searchParams);
  const where = buildEventListWhere(websiteId, query, now);
  const { skip, take } = eventListSkipTake(query.page);

  const [events, total] = await Promise.all([
    prisma.websiteEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { recordedAt: 'desc' }],
      skip,
      take,
    }),
    prisma.websiteEvent.count({ where }),
  ]);

  return { events, total, query, pageSize: take };
}

export type WebsiteEventStats = {
  total: number;
  manualWork: number;
  technical: number;
  seo: number;
  last30Days: number;
};

export async function getWebsiteEventStats(
  websiteId: string,
  now: Date = new Date(),
): Promise<WebsiteEventStats> {
  const from30 = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30),
  );

  const [total, manualWork, technical, seo, last30Days] = await Promise.all([
    prisma.websiteEvent.count({ where: { websiteId } }),
    prisma.websiteEvent.count({
      where: {
        websiteId,
        OR: [
          { eventType: 'work' },
          { eventType: 'BULK_WORK_RECORDED' },
          { eventType: 'TASK_COMPLETED' },
        ],
      },
    }),
    prisma.websiteEvent.count({ where: { websiteId, category: 'TECHNICAL' } }),
    prisma.websiteEvent.count({ where: { websiteId, category: 'SEO' } }),
    prisma.websiteEvent.count({
      where: { websiteId, occurredAt: { gte: from30 } },
    }),
  ]);

  return { total, manualWork, technical, seo, last30Days };
}

/**
 * Append-only manual event. dedupeKey stays null (manual rows are not idempotent sync writes).
 */
export async function createManualWebsiteEvent(
  websiteId: string,
  raw: unknown,
  options?: { createdBy?: string },
): Promise<WebsiteEvent> {
  await getWebsiteById(websiteId);
  const data = manualEventSchema.parse(raw);
  const category = resolveManualEventCategory(data.eventType, data.category);

  return prisma.$transaction(async (tx) => {
    const event = await tx.websiteEvent.create({
      data: {
        websiteId,
        eventType: data.eventType,
        category,
        title: data.title,
        description: data.description,
        source: EventSource.MANUAL,
        sourceSystem: 'LOW',
        dedupeKey: null,
        occurredAt: data.occurredAt,
        amountMinor: data.amount != null ? toAmountMinor(data.amount) : null,
        currency: data.currency ?? null,
        quantity: data.quantity ?? null,
        unit: data.unit ?? null,
        createdBy: options?.createdBy ?? 'admin',
      },
    });

    await tx.website.update({
      where: { id: websiteId },
      data: { lastWorkAt: data.occurredAt },
    });

    return event;
  });
}

export function isWebsiteNotFoundError(error: unknown): error is WebsiteNotFoundError {
  return error instanceof WebsiteNotFoundError;
}

export type { EventListQuery };
