import { formatDateOnlyRu } from '@/lib/dates/date-only';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveGscAddedDate,
  getEffectiveLaunchDate,
  type EffectiveDateFields,
} from '@/lib/dates/effective';

export type MilestoneKey =
  | 'created'
  | 'launched'
  | 'healthy'
  | 'gsc'
  | 'impressions'
  | 'click';

export type MilestoneItem = {
  key: MilestoneKey;
  label: string;
  shortLabel: string;
  date: Date | null;
  reached: boolean;
  isNext: boolean;
};

export type MilestoneWebsite = EffectiveDateFields & {
  createdAt: Date;
  firstHealthyAt?: Date | null;
};

const MILESTONE_DEFS: Array<{
  key: MilestoneKey;
  label: string;
  shortLabel: string;
  resolve: (w: MilestoneWebsite) => Date | null;
}> = [
  {
    key: 'created',
    label: 'Добавлен',
    shortLabel: 'Добавлен',
    resolve: (w) => w.createdAt,
  },
  {
    key: 'launched',
    label: 'Запущен',
    shortLabel: 'Запуск',
    resolve: (w) => getEffectiveLaunchDate(w),
  },
  {
    key: 'healthy',
    label: 'Доступен',
    shortLabel: 'Доступен',
    resolve: (w) => w.firstHealthyAt ?? null,
  },
  {
    key: 'gsc',
    label: 'В GSC',
    shortLabel: 'GSC',
    resolve: (w) => getEffectiveGscAddedDate(w),
  },
  {
    key: 'impressions',
    label: 'Показы',
    shortLabel: 'Показы',
    resolve: (w) => getEffectiveFirstImpressionDate(w),
  },
  {
    key: 'click',
    label: 'Клик',
    shortLabel: 'Клик',
    resolve: (w) => getEffectiveFirstClickDate(w),
  },
];

export function buildWebsiteMilestones(website: MilestoneWebsite): MilestoneItem[] {
  const withDates = MILESTONE_DEFS.map((def) => {
    const date = def.resolve(website);
    return {
      key: def.key,
      label: def.label,
      shortLabel: def.shortLabel,
      date,
      reached: date != null,
      isNext: false,
    };
  });

  const firstOpen = withDates.findIndex((m) => !m.reached);
  if (firstOpen >= 0) {
    withDates[firstOpen]!.isNext = true;
  }

  return withDates;
}

export function nextMilestoneLabel(milestones: MilestoneItem[]): string {
  const next = milestones.find((m) => m.isNext);
  if (!next) return 'Все основные этапы достигнуты';
  switch (next.key) {
    case 'launched':
      return 'Следующий этап: запуск';
    case 'healthy':
      return 'Следующий этап: доступность';
    case 'gsc':
      return 'Следующий этап: подключение к GSC';
    case 'impressions':
      return 'Следующий этап: первые показы';
    case 'click':
      return 'Следующий этап: первый клик';
    default:
      return `Следующий этап: ${next.label.toLowerCase()}`;
  }
}

export function formatMilestoneDate(date: Date | null): string {
  if (!date) return '—';
  return formatDateOnlyRu(date);
}

/** Serializable milestone payload for client UI (ISO dates). */
export type MilestoneRailItem = {
  key: string;
  label: string;
  shortLabel: string;
  date: string | null;
  reached: boolean;
  isNext: boolean;
};

export function toMilestoneRailItems(milestones: MilestoneItem[]): MilestoneRailItem[] {
  return milestones.map((m) => ({
    key: m.key,
    label: m.label,
    shortLabel: m.shortLabel,
    date: m.date ? m.date.toISOString() : null,
    reached: m.reached,
    isNext: m.isNext,
  }));
}
