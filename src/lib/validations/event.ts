import { z } from 'zod';
import { EventCategory } from '@prisma/client';
import { MANUAL_EVENT_TYPES } from '@/lib/ui/labels';

const manualEventTypeValues = MANUAL_EVENT_TYPES.map((item) => item.value) as [
  string,
  ...string[],
];

const emptyToUndefined = z
  .string()
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  });

export const manualEventSchema = z
  .object({
    eventType: z.enum(manualEventTypeValues, {
      errorMap: () => ({ message: 'Выберите тип события' }),
    }),
    category: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.nativeEnum(EventCategory).optional(),
    ),
    title: z.string().trim().min(1, 'Заголовок обязателен').max(200),
    description: emptyToUndefined,
    occurredAt: z
      .string()
      .min(1, 'Укажите дату события')
      .transform((value, ctx) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Некорректная дата события' });
          return z.NEVER;
        }
        return date;
      }),
    amount: emptyToUndefined.transform((value, ctx) => {
      if (value == null) return undefined;
      const normalized = value.replace(',', '.');
      const num = Number(normalized);
      if (!Number.isFinite(num)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Некорректная сумма' });
        return z.NEVER;
      }
      return num;
    }),
    currency: emptyToUndefined.transform((value) => value?.toUpperCase()),
    quantity: emptyToUndefined.transform((value, ctx) => {
      if (value == null) return undefined;
      const normalized = value.replace(',', '.');
      const num = Number(normalized);
      if (!Number.isFinite(num)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Некорректное количество' });
        return z.NEVER;
      }
      return num;
    }),
    unit: emptyToUndefined,
  })
  .superRefine((data, ctx) => {
    if (data.amount != null && !data.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите валюту вместе с суммой',
        path: ['currency'],
      });
    }
    if (data.currency && data.amount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите сумму вместе с валютой',
        path: ['amount'],
      });
    }
    if (data.quantity != null && !data.unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите единицу вместе с количеством',
        path: ['unit'],
      });
    }
  });

export type ManualEventInput = z.infer<typeof manualEventSchema>;

export function resolveManualEventCategory(
  eventType: string,
  category?: EventCategory,
): EventCategory {
  if (category) return category;
  const preset = MANUAL_EVENT_TYPES.find((item) => item.value === eventType);
  return preset?.category ?? EventCategory.NOTE;
}

/** Convert major currency units to minor (cents/kopecks). */
export function toAmountMinor(amount: number): number {
  return Math.round(amount * 100);
}
