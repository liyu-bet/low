import { EventSource, WebsiteEvent } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
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
