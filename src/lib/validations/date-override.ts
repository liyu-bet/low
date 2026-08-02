import { z } from 'zod';
import { assertNotFutureDateOnly, DateOnlyError, parseDateOnly } from '@/lib/dates/date-only';
import { DATE_OVERRIDE_FIELDS, type DateOverrideField } from '@/lib/dates/fields';

export const dateOverrideSetSchema = z.object({
  field: z.enum(DATE_OVERRIDE_FIELDS as unknown as [DateOverrideField, ...DateOverrideField[]], {
    errorMap: () => ({ message: 'Некорректное поле даты' }),
  }),
  date: z
    .string()
    .min(1, 'Укажите дату')
    .transform((value, ctx) => {
      try {
        const parsed = parseDateOnly(value);
        assertNotFutureDateOnly(parsed);
        return parsed;
      } catch (error) {
        const message =
          error instanceof DateOnlyError ? error.message : 'Укажите корректную календарную дату';
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
    }),
  reason: z
    .string()
    .trim()
    .min(3, 'Причина должна содержать минимум 3 символа')
    .max(500, 'Причина не должна превышать 500 символов'),
});

export const dateOverrideClearSchema = z.object({
  field: z.enum(DATE_OVERRIDE_FIELDS as unknown as [DateOverrideField, ...DateOverrideField[]], {
    errorMap: () => ({ message: 'Некорректное поле даты' }),
  }),
  reason: z
    .string()
    .trim()
    .min(3, 'Причина должна содержать минимум 3 символа')
    .max(500, 'Причина не должна превышать 500 символов'),
});

export type DateOverrideSetInput = z.infer<typeof dateOverrideSetSchema>;
export type DateOverrideClearInput = z.infer<typeof dateOverrideClearSchema>;
