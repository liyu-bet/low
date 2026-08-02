import { z } from 'zod';
import { EventCategory, LifecycleStage, TaskPriority, WebsiteStatus } from '@prisma/client';
import { BULK_WEBSITE_IDS_MAX } from '@/lib/constants';
import { DateOnlyError, parseDateOnly, todayDateOnlyUtc } from '@/lib/dates/date-only';

const websiteIdsSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((value, ctx) => {
    let raw: unknown = value;
    if (typeof value === 'string') {
      try {
        raw = JSON.parse(value);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Некорректный список сайтов' });
        return z.NEVER;
      }
    }
    if (!Array.isArray(raw)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Некорректный список сайтов' });
      return z.NEVER;
    }
    const ids = [
      ...new Set(
        raw
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Выберите хотя бы один сайт' });
      return z.NEVER;
    }
    if (ids.length > BULK_WEBSITE_IDS_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `За один раз можно обработать не более ${BULK_WEBSITE_IDS_MAX} сайтов`,
      });
      return z.NEVER;
    }
    return ids;
  });

const optionalTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const tagsListSchema = z
  .string()
  .transform((value) =>
    [
      ...new Set(
        value
          .split(/[,;\n]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ],
  );

const dueAtField = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value == null || value.trim() === '') return null;
    try {
      return parseDateOnly(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof DateOnlyError ? error.message : 'Некорректный срок',
      });
      return z.NEVER;
    }
  });

const occurredAtField = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value == null || value.trim() === '') return todayDateOnlyUtc();
    try {
      return parseDateOnly(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof DateOnlyError ? error.message : 'Некорректная дата',
      });
      return z.NEVER;
    }
  });

export const BULK_EDITABLE_STATUSES = [
  WebsiteStatus.DRAFT,
  WebsiteStatus.ACTIVE,
  WebsiteStatus.PAUSED,
] as const;

export const BULK_EDITABLE_STAGES = [
  LifecycleStage.IDEA,
  LifecycleStage.SETUP,
  LifecycleStage.LAUNCHED,
  LifecycleStage.INDEXING,
  LifecycleStage.GROWING,
  LifecycleStage.MATURE,
  LifecycleStage.DECLINING,
] as const;

export const BULK_WORK_CATEGORIES = [
  EventCategory.TECHNICAL,
  EventCategory.SEO,
  EventCategory.CONTENT,
  EventCategory.NOTE,
] as const;

export const bulkSetGroupSchema = z.object({
  websiteIds: websiteIdsSchema,
  group: z
    .string()
    .optional()
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }),
});

export const bulkAddTagsSchema = z.object({
  websiteIds: websiteIdsSchema,
  tags: tagsListSchema.refine((tags) => tags.length > 0, 'Укажите хотя бы один тег'),
});

export const bulkRemoveTagsSchema = z.object({
  websiteIds: websiteIdsSchema,
  tags: tagsListSchema.refine((tags) => tags.length > 0, 'Укажите хотя бы один тег'),
});

export const bulkSetStatusSchema = z.object({
  websiteIds: websiteIdsSchema,
  status: z.enum(BULK_EDITABLE_STATUSES, {
    errorMap: () => ({ message: 'Недопустимый статус' }),
  }),
});

export const bulkSetLifecycleStageSchema = z.object({
  websiteIds: websiteIdsSchema,
  lifecycleStage: z.enum(BULK_EDITABLE_STAGES, {
    errorMap: () => ({ message: 'Недопустимый этап' }),
  }),
});

export const bulkCreateTasksSchema = z.object({
  websiteIds: websiteIdsSchema,
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  description: optionalTrimmed,
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueAt: dueAtField,
});

export const bulkRecordWorkSchema = z.object({
  websiteIds: websiteIdsSchema,
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  description: optionalTrimmed,
  category: z.enum(BULK_WORK_CATEGORIES, {
    errorMap: () => ({ message: 'Недопустимая категория' }),
  }),
  occurredAt: occurredAtField,
  bulkOperationId: z.string().trim().min(8, 'Некорректный идентификатор операции').max(64),
});

export const bulkArchiveSchema = z.object({
  websiteIds: websiteIdsSchema,
  confirmation: z.literal('АРХИВИРОВАТЬ', {
    errorMap: () => ({ message: 'Для подтверждения введите слово АРХИВИРОВАТЬ' }),
  }),
});

export type BulkSetGroupInput = z.infer<typeof bulkSetGroupSchema>;
export type BulkAddTagsInput = z.infer<typeof bulkAddTagsSchema>;
export type BulkRemoveTagsInput = z.infer<typeof bulkRemoveTagsSchema>;
export type BulkSetStatusInput = z.infer<typeof bulkSetStatusSchema>;
export type BulkSetLifecycleStageInput = z.infer<typeof bulkSetLifecycleStageSchema>;
export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;
export type BulkRecordWorkInput = z.infer<typeof bulkRecordWorkSchema>;
export type BulkArchiveInput = z.infer<typeof bulkArchiveSchema>;
