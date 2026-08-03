import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { DateOnlyError, parseDateOnly } from '@/lib/dates/date-only';

const optionalTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

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

/** `__self__` / empty / absent → assign to actor; `__none__` → unassigned; else user id. */
const assignedToField = z
  .string()
  .optional()
  .transform((value) => {
    if (value == null || value.trim() === '' || value === '__self__') return 'self' as const;
    if (value === '__none__') return 'none' as const;
    return value.trim();
  });

export const taskCreateSchema = z.object({
  websiteId: z.string().trim().min(1, 'Сайт обязателен'),
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  description: optionalTrimmed,
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueAt: dueAtField,
  assignedToUserId: assignedToField,
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Название обязательно').max(200),
  description: optionalTrimmed,
  priority: z.nativeEnum(TaskPriority),
  dueAt: dueAtField,
  assignedToUserId: assignedToField.optional(),
});

export const taskCompleteSchema = z.object({
  result: optionalTrimmed,
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskCompleteInput = z.infer<typeof taskCompleteSchema>;

export { TaskPriority, TaskStatus };
