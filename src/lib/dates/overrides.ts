import { EventCategory, EventSource, Prisma, Website, WebsiteEvent } from '@prisma/client';
import {
  EVENT_TYPE_DATE_OVERRIDE_CLEARED,
  EVENT_TYPE_DATE_OVERRIDE_SET,
  EVENT_TYPE_DATE_OVERRIDE_UPDATED,
} from '@/lib/constants';
import { formatDateOnlyRu } from '@/lib/dates/date-only';
import { DATE_FIELD_CONFIG, type DateOverrideField } from '@/lib/dates/fields';
import { prisma } from '@/lib/db/prisma';
import {
  dateOverrideClearSchema,
  dateOverrideSetSchema,
} from '@/lib/validations/date-override';
import { WebsiteNotFoundError, getWebsiteById } from '@/lib/websites/service';

export type DateOverrideMetadata = {
  field: DateOverrideField;
  fieldLabel: string;
  automaticValue: string | null;
  previousManualValue: string | null;
  newManualValue: string | null;
  previousEffectiveValue: string | null;
  newEffectiveValue: string | null;
  reason: string;
};

export type DateOverridePlan = {
  eventType:
    | typeof EVENT_TYPE_DATE_OVERRIDE_SET
    | typeof EVENT_TYPE_DATE_OVERRIDE_UPDATED
    | typeof EVENT_TYPE_DATE_OVERRIDE_CLEARED;
  title: string;
  metadata: DateOverrideMetadata;
  websiteData: Prisma.WebsiteUpdateInput;
};

function asDate(value: unknown): Date | null {
  return value instanceof Date ? value : null;
}

function serializeDateOnly(value: Date | null): string | null {
  return value ? formatDateOnlyRu(value) : null;
}

export function planDateOverrideSet(website: Website, raw: unknown): DateOverridePlan {
  const input = dateOverrideSetSchema.parse(raw);
  const config = DATE_FIELD_CONFIG[input.field];
  const automatic = asDate(website[config.automaticKey]);
  const previousManual = asDate(website[config.manualKey]);
  const previousEffective = config.getEffective(website);
  const newManual = input.date;
  const newEffective = newManual;

  const eventType = previousManual
    ? EVENT_TYPE_DATE_OVERRIDE_UPDATED
    : EVENT_TYPE_DATE_OVERRIDE_SET;

  const title = previousManual
    ? `Изменена ${config.shortLabel}`
    : `Указана ${config.shortLabel}`;

  return {
    eventType,
    title,
    metadata: {
      field: input.field,
      fieldLabel: config.label,
      automaticValue: serializeDateOnly(automatic),
      previousManualValue: serializeDateOnly(previousManual),
      newManualValue: serializeDateOnly(newManual),
      previousEffectiveValue: serializeDateOnly(previousEffective),
      newEffectiveValue: serializeDateOnly(newEffective),
      reason: input.reason,
    },
    websiteData: {
      [config.manualKey]: newManual,
      lastWorkAt: new Date(),
    },
  };
}

export function planDateOverrideClear(website: Website, raw: unknown): DateOverridePlan {
  const input = dateOverrideClearSchema.parse(raw);
  const config = DATE_FIELD_CONFIG[input.field];
  const automatic = asDate(website[config.automaticKey]);
  const previousManual = asDate(website[config.manualKey]);
  const previousEffective = config.getEffective(website);

  if (!previousManual) {
    throw new Error('Ручная корректировка для этого поля не установлена');
  }

  const newEffective = automatic;

  return {
    eventType: EVENT_TYPE_DATE_OVERRIDE_CLEARED,
    title: `Удалена ручная корректировка ${config.shortLabel}`,
    metadata: {
      field: input.field,
      fieldLabel: config.label,
      automaticValue: serializeDateOnly(automatic),
      previousManualValue: serializeDateOnly(previousManual),
      newManualValue: null,
      previousEffectiveValue: serializeDateOnly(previousEffective),
      newEffectiveValue: serializeDateOnly(newEffective),
      reason: input.reason,
    },
    websiteData: {
      [config.manualKey]: null,
      lastWorkAt: new Date(),
    },
  };
}

async function applyPlan(
  websiteId: string,
  plan: DateOverridePlan,
  options?: { createdBy?: string },
): Promise<{ website: Website; event: WebsiteEvent }> {
  const occurredAt = new Date();

  return prisma.$transaction(async (tx) => {
    const website = await tx.website.update({
      where: { id: websiteId },
      data: plan.websiteData,
    });

    const event = await tx.websiteEvent.create({
      data: {
        websiteId,
        eventType: plan.eventType,
        category: EventCategory.DATES,
        title: plan.title,
        description: plan.metadata.reason,
        source: EventSource.MANUAL,
        sourceSystem: 'LOW',
        dedupeKey: null,
        occurredAt,
        createdBy: options?.createdBy ?? 'admin',
        metadata: plan.metadata,
      },
    });

    return { website, event };
  });
}

export async function setDateOverride(
  websiteId: string,
  raw: unknown,
  options?: { createdBy?: string },
): Promise<{ website: Website; event: WebsiteEvent }> {
  const website = await getWebsiteById(websiteId);
  const plan = planDateOverrideSet(website, raw);
  return applyPlan(websiteId, plan, options);
}

export async function clearDateOverride(
  websiteId: string,
  raw: unknown,
  options?: { createdBy?: string },
): Promise<{ website: Website; event: WebsiteEvent }> {
  const website = await getWebsiteById(websiteId);
  const plan = planDateOverrideClear(website, raw);
  return applyPlan(websiteId, plan, options);
}

export function isWebsiteNotFoundError(error: unknown): error is WebsiteNotFoundError {
  return error instanceof WebsiteNotFoundError;
}
