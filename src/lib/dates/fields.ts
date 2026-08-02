import type { Website } from '@prisma/client';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveGscAddedDate,
  getEffectiveLaunchDate,
} from '@/lib/dates/effective';

export const DATE_OVERRIDE_FIELDS = [
  'launchedAt',
  'gscAddedAt',
  'firstImpressionAt',
  'firstClickAt',
] as const;

export type DateOverrideField = (typeof DATE_OVERRIDE_FIELDS)[number];

export type DateFieldConfig = {
  field: DateOverrideField;
  label: string;
  shortLabel: string;
  automaticKey: keyof Website;
  manualKey: keyof Website;
  getEffective: (website: Website) => Date | null;
};

export const DATE_FIELD_CONFIG: Record<DateOverrideField, DateFieldConfig> = {
  launchedAt: {
    field: 'launchedAt',
    label: 'Дата запуска сайта',
    shortLabel: 'дата запуска',
    automaticKey: 'launchedAt',
    manualKey: 'launchedAtManual',
    getEffective: (website) =>
      getEffectiveLaunchDate({
        launchedAt: website.launchedAt,
        launchedAtManual: website.launchedAtManual,
      }),
  },
  gscAddedAt: {
    field: 'gscAddedAt',
    label: 'Дата добавления в Google Search Console',
    shortLabel: 'дата добавления в Search Console',
    automaticKey: 'gscFirstSeenAt',
    manualKey: 'gscAddedAtManual',
    getEffective: (website) =>
      getEffectiveGscAddedDate({
        gscFirstSeenAt: website.gscFirstSeenAt,
        gscAddedAtManual: website.gscAddedAtManual,
      }),
  },
  firstImpressionAt: {
    field: 'firstImpressionAt',
    label: 'Дата первых показов',
    shortLabel: 'дата первых показов',
    automaticKey: 'firstImpressionAt',
    manualKey: 'firstImpressionAtManual',
    getEffective: (website) =>
      getEffectiveFirstImpressionDate({
        firstImpressionAt: website.firstImpressionAt,
        firstImpressionAtManual: website.firstImpressionAtManual,
      }),
  },
  firstClickAt: {
    field: 'firstClickAt',
    label: 'Дата первого клика',
    shortLabel: 'дата первого клика',
    automaticKey: 'firstClickAt',
    manualKey: 'firstClickAtManual',
    getEffective: (website) =>
      getEffectiveFirstClickDate({
        firstClickAt: website.firstClickAt,
        firstClickAtManual: website.firstClickAtManual,
      }),
  },
};

export const READ_ONLY_DATE_FIELDS = [
  {
    key: 'firstHealthyAt' as const,
    label: 'Дата первого успешного ответа',
  },
  {
    key: 'gscFirstSeenAt' as const,
    label: 'Дата первого обнаружения в Google Search Console',
  },
] as const;

export function isDateOverrideField(value: string): value is DateOverrideField {
  return (DATE_OVERRIDE_FIELDS as readonly string[]).includes(value);
}
