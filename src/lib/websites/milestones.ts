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
  /** True next open stage — never an early gap when later stages are already reached. */
  isNext: boolean;
  /** Early gap: missing while a later milestone is already reached. */
  isMissingData: boolean;
};

export type MilestoneProgress = {
  next: MilestoneKey | null;
  missingEarlier: MilestoneKey[];
  complete: boolean;
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
    label: 'Запуск',
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
    label: 'GSC',
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

export function computeMilestoneProgress(
  milestones: Array<Pick<MilestoneItem, 'key' | 'reached'>>,
): MilestoneProgress {
  const missingEarlier: MilestoneKey[] = [];
  let next: MilestoneKey | null = null;

  for (let i = 0; i < milestones.length; i++) {
    const item = milestones[i]!;
    if (item.reached) continue;
    const hasLaterReached = milestones.slice(i + 1).some((m) => m.reached);
    if (hasLaterReached) {
      missingEarlier.push(item.key);
    } else if (next === null) {
      next = item.key;
    }
  }

  return {
    next,
    missingEarlier,
    complete: milestones.length > 0 && milestones.every((m) => m.reached),
  };
}

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
      isMissingData: false,
    };
  });

  const progress = computeMilestoneProgress(withDates);
  for (const item of withDates) {
    item.isNext = progress.next === item.key;
    item.isMissingData = progress.missingEarlier.includes(item.key);
  }

  return withDates;
}

function missingDataLabel(key: MilestoneKey): string {
  switch (key) {
    case 'launched':
      return 'Не указана дата запуска';
    case 'healthy':
      return 'Не указана дата доступности';
    case 'gsc':
      return 'Не указана дата GSC';
    case 'impressions':
      return 'Не указана дата первых показов';
    case 'click':
      return 'Не указана дата первого клика';
    case 'created':
      return 'Не указана дата добавления';
    default:
      return 'Дата не указана';
  }
}

function nextStagePhrase(key: MilestoneKey, label: string): string {
  switch (key) {
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
      return `Следующий этап: ${label.toLowerCase()}`;
  }
}

/** Presentation label for the milestone status line (does not mutate dates). */
export function nextMilestoneLabel(milestones: MilestoneItem[]): string {
  const progress = computeMilestoneProgress(milestones);
  if (progress.missingEarlier.length > 0) {
    return missingDataLabel(progress.missingEarlier[0]!);
  }
  if (progress.complete || !progress.next) {
    return 'Все основные этапы достигнуты';
  }
  const item = milestones.find((m) => m.key === progress.next);
  return nextStagePhrase(progress.next, item?.label ?? progress.next);
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
  isMissingData: boolean;
};

export function toMilestoneRailItems(milestones: MilestoneItem[]): MilestoneRailItem[] {
  return milestones.map((m) => ({
    key: m.key,
    label: m.label,
    shortLabel: m.shortLabel,
    date: m.date ? m.date.toISOString() : null,
    reached: m.reached,
    isNext: m.isNext,
    isMissingData: m.isMissingData,
  }));
}
