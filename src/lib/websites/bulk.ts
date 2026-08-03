import {
  EventCategory,
  EventSource,
  LifecycleStage,
  Prisma,
  TaskPriority,
  WebsiteStatus,
  type Website,
} from '@prisma/client';
import {
  BULK_WEBSITE_IDS_MAX,
  EVENT_TYPE_BULK_GROUP_CHANGED,
  EVENT_TYPE_BULK_LIFECYCLE_STAGE_CHANGED,
  EVENT_TYPE_BULK_SITE_ARCHIVED,
  EVENT_TYPE_BULK_STATUS_CHANGED,
  EVENT_TYPE_BULK_TAGS_CHANGED,
  EVENT_TYPE_BULK_WORK_RECORDED,
} from '@/lib/constants';
import { dateOnlyToInputValue, toDateOnlyUtc } from '@/lib/dates/date-only';
import { prisma } from '@/lib/db/prisma';
import {
  bulkAddTagsSchema,
  bulkArchiveSchema,
  bulkCreateTasksSchema,
  bulkRecordWorkSchema,
  bulkRemoveTagsSchema,
  bulkSetGroupSchema,
  bulkSetLifecycleStageSchema,
  bulkSetStatusSchema,
} from '@/lib/validations/bulk';

export type BulkOperationResult = {
  requested: number;
  processed: number;
  changed: number;
  skipped: number;
  errors: string[];
  /** Extra counters for specific operations. */
  created?: number;
  skippedArchived?: number;
};

export class BulkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkValidationError';
  }
}

export function normalizeWebsiteIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function assertWebsiteIdsLimit(ids: string[]): void {
  if (ids.length === 0) {
    throw new BulkValidationError('Выберите хотя бы один сайт');
  }
  if (ids.length > BULK_WEBSITE_IDS_MAX) {
    throw new BulkValidationError(
      `За один раз можно обработать не более ${BULK_WEBSITE_IDS_MAX} сайтов`,
    );
  }
}

export function mergeWebsiteTags(existing: string[], added: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  for (const tag of added) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function removeWebsiteTags(existing: string[], toRemove: string[]): string[] {
  const removeSet = new Set(
    toRemove.map((t) => t.trim().toLowerCase()).filter(Boolean),
  );
  return existing.filter((tag) => !removeSet.has(tag.toLowerCase()));
}

export function tagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((tag, index) => tag === b[index]);
}

export function shouldUpdateLastWorkAt(
  current: Date | null | undefined,
  occurredAt: Date,
): boolean {
  if (!current) return true;
  return toDateOnlyUtc(occurredAt).getTime() >= toDateOnlyUtc(current).getTime();
}

export function bulkWorkDedupeKey(bulkOperationId: string, websiteId: string): string {
  return `bulk:work:${bulkOperationId}:${websiteId}`;
}

function emptyResult(requested: number): BulkOperationResult {
  return {
    requested,
    processed: 0,
    changed: 0,
    skipped: 0,
    errors: [],
  };
}

function formDataToObject(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

async function loadWebsitesOrThrow(ids: string[]): Promise<Website[]> {
  const websites = await prisma.website.findMany({
    where: { id: { in: ids } },
  });
  if (websites.length !== ids.length) {
    const found = new Set(websites.map((w) => w.id));
    const missing = ids.filter((id) => !found.has(id));
    throw new BulkValidationError(`Сайты не найдены: ${missing.slice(0, 5).join(', ')}`);
  }
  // Preserve caller order after dedupe.
  const byId = new Map(websites.map((w) => [w.id, w]));
  return ids.map((id) => byId.get(id)!);
}

export async function bulkSetGroup(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkSetGroupSchema.parse(raw);
  const ids = input.websiteIds;
  const websites = await loadWebsitesOrThrow(ids);
  const result = emptyResult(ids.length);

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      const previousGroup = website.group;
      const newGroup = input.group;
      if ((previousGroup ?? null) === (newGroup ?? null)) {
        result.skipped += 1;
        continue;
      }

      await tx.website.update({
        where: { id: website.id },
        data: { group: newGroup },
      });

      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_BULK_GROUP_CHANGED,
          category: EventCategory.NOTE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: 'Изменена группа сайта',
          description: newGroup
            ? `Группа изменена на: ${newGroup}`
            : 'Группа очищена',
          occurredAt: new Date(),
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          metadata: {
            previousGroup,
            newGroup,
            bulk: true,
          },
        },
      });
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkAddTags(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkAddTagsSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      const previousTags = [...website.tags];
      const newTags = mergeWebsiteTags(previousTags, input.tags);
      if (tagsEqual(previousTags, newTags)) {
        result.skipped += 1;
        continue;
      }
      const addedTags = newTags.filter(
        (tag) => !previousTags.some((p) => p.toLowerCase() === tag.toLowerCase()),
      );

      await tx.website.update({
        where: { id: website.id },
        data: { tags: newTags },
      });
      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_BULK_TAGS_CHANGED,
          category: EventCategory.NOTE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: 'Изменены теги сайта',
          description: `Добавлены теги: ${addedTags.join(', ')}`,
          occurredAt: new Date(),
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          metadata: {
            previousTags,
            addedTags,
            removedTags: [],
            newTags,
            bulk: true,
          },
        },
      });
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkRemoveTags(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkRemoveTagsSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      const previousTags = [...website.tags];
      const newTags = removeWebsiteTags(previousTags, input.tags);
      if (tagsEqual(previousTags, newTags)) {
        result.skipped += 1;
        continue;
      }
      const removedTags = previousTags.filter(
        (tag) => !newTags.some((n) => n.toLowerCase() === tag.toLowerCase()),
      );

      await tx.website.update({
        where: { id: website.id },
        data: { tags: newTags },
      });
      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_BULK_TAGS_CHANGED,
          category: EventCategory.NOTE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: 'Изменены теги сайта',
          description: `Удалены теги: ${removedTags.join(', ')}`,
          occurredAt: new Date(),
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          metadata: {
            previousTags,
            addedTags: [],
            removedTags,
            newTags,
            bulk: true,
          },
        },
      });
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkSetStatus(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkSetStatusSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      if (website.status === input.status) {
        result.skipped += 1;
        continue;
      }
      await tx.website.update({
        where: { id: website.id },
        data: { status: input.status },
      });
      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_BULK_STATUS_CHANGED,
          category: EventCategory.LIFECYCLE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: 'Изменён статус сайта',
          description: `Статус: ${website.status} → ${input.status}`,
          occurredAt: new Date(),
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          metadata: {
            previousStatus: website.status,
            newStatus: input.status,
            bulk: true,
          },
        },
      });
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkSetLifecycleStage(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkSetLifecycleStageSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      if (website.lifecycleStage === input.lifecycleStage) {
        result.skipped += 1;
        continue;
      }
      await tx.website.update({
        where: { id: website.id },
        data: { lifecycleStage: input.lifecycleStage },
      });
      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_BULK_LIFECYCLE_STAGE_CHANGED,
          category: EventCategory.LIFECYCLE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: 'Изменён этап сайта',
          description: `Этап: ${website.lifecycleStage} → ${input.lifecycleStage}`,
          occurredAt: new Date(),
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          metadata: {
            previousLifecycleStage: website.lifecycleStage,
            newLifecycleStage: input.lifecycleStage,
            bulk: true,
          },
        },
      });
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkCreateTasks(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkCreateTasksSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);
  result.created = 0;
  result.skippedArchived = 0;

  const eligible = websites.filter(
    (w) => !w.archivedAt && w.status !== WebsiteStatus.ARCHIVED,
  );
  result.skippedArchived = websites.length - eligible.length;
  result.skipped = result.skippedArchived;

  if (eligible.length === 0) {
    result.processed = websites.length;
    return result;
  }

  await prisma.$transaction(async (tx) => {
    for (const website of eligible) {
      await tx.websiteTask.create({
        data: {
          websiteId: website.id,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          dueAt: input.dueAt,
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          assignedToUserId: options.createdByUserId ?? null,
        },
      });
      result.created! += 1;
      result.changed += 1;
    }
  });

  result.processed = websites.length;
  return result;
}

export async function bulkRecordWork(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkRecordWorkSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);
  const selectedCount = input.websiteIds.length;

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      const dedupeKey = bulkWorkDedupeKey(input.bulkOperationId, website.id);

      try {
        await tx.websiteEvent.create({
          data: {
            websiteId: website.id,
            eventType: EVENT_TYPE_BULK_WORK_RECORDED,
            category: input.category,
            source: EventSource.MANUAL,
            sourceSystem: 'LOW',
            title: input.title,
            description: input.description ?? null,
            occurredAt: input.occurredAt,
            createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
            dedupeKey,
            metadata: {
              bulk: true,
              bulkOperationId: input.bulkOperationId,
              selectedCount,
            },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          result.skipped += 1;
          continue;
        }
        throw error;
      }

      if (shouldUpdateLastWorkAt(website.lastWorkAt, input.occurredAt)) {
        await tx.website.update({
          where: { id: website.id },
          data: { lastWorkAt: input.occurredAt },
        });
      }
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkArchiveWebsites(
  raw: unknown,
  options: { createdBy: string; createdByUserId?: string | null },
): Promise<BulkOperationResult> {
  const input = bulkArchiveSchema.parse(raw);
  const websites = await loadWebsitesOrThrow(input.websiteIds);
  const result = emptyResult(input.websiteIds.length);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const website of websites) {
      result.processed += 1;
      if (website.archivedAt || website.status === WebsiteStatus.ARCHIVED) {
        result.skipped += 1;
        continue;
      }

      await tx.website.update({
        where: { id: website.id },
        data: {
          status: WebsiteStatus.ARCHIVED,
          lifecycleStage: LifecycleStage.ARCHIVED,
          archivedAt: now,
        },
      });

      await tx.websiteEvent.create({
        data: {
          websiteId: website.id,
          eventType: EVENT_TYPE_BULK_SITE_ARCHIVED,
          category: EventCategory.LIFECYCLE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: 'Сайт архивирован',
          description: 'Сайт перенесён в архив массовой операцией',
          occurredAt: now,
          createdBy: options.createdBy,
          createdByUserId: options.createdByUserId ?? null,
          metadata: {
            bulk: true,
            previousStatus: website.status,
            previousLifecycleStage: website.lifecycleStage,
          },
        },
      });
      result.changed += 1;
    }
  });

  return result;
}

export async function bulkSetGroupFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkSetGroup(formDataToObject(formData), options);
}

export async function bulkAddTagsFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkAddTags(formDataToObject(formData), options);
}

export async function bulkRemoveTagsFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkRemoveTags(formDataToObject(formData), options);
}

export async function bulkSetStatusFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkSetStatus(formDataToObject(formData), options);
}

export async function bulkSetLifecycleStageFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkSetLifecycleStage(formDataToObject(formData), options);
}

export async function bulkCreateTasksFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkCreateTasks(formDataToObject(formData), options);
}

export async function bulkRecordWorkFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkRecordWork(formDataToObject(formData), options);
}

export async function bulkArchiveWebsitesFromForm(
  formData: FormData,
  options: { createdBy: string; createdByUserId?: string | null },
) {
  return bulkArchiveWebsites(formDataToObject(formData), options);
}

export function formatBulkResultMessage(result: BulkOperationResult): string {
  const parts = [`Обновлено ${result.changed}`];
  if (result.created != null) {
    return `Создано задач: ${result.created}, пропущено архивных: ${result.skippedArchived ?? 0}`;
  }
  if (result.skipped > 0) parts.push(`пропущено ${result.skipped}`);
  if (result.errors.length > 0) parts.push(`ошибок ${result.errors.length}`);
  return parts.join(', ');
}

export function isBulkValidationError(error: unknown): error is BulkValidationError {
  return error instanceof BulkValidationError;
}

export { dateOnlyToInputValue, TaskPriority, WebsiteStatus, LifecycleStage };
