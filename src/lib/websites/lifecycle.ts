import { daysBetweenUtc } from '@/lib/dates/date-only';
import {
  getEffectiveFirstClickDate,
  getEffectiveFirstImpressionDate,
  getEffectiveGscAddedDate,
  getEffectiveLaunchDate,
  provenanceLabelRu,
  resolveDateProvenance,
  type EffectiveDateFields,
} from '@/lib/dates/effective';

export type LifecycleInterval = {
  key: string;
  label: string;
  days: number;
};

export type LifecycleChainItem = {
  key: string;
  label: string;
  effective: Date | null;
  provenance: string;
  automatic: Date | null;
  editable: boolean;
};

export function buildLifecycleIntervals(
  values: EffectiveDateFields & {
    firstHealthyAt?: Date | null;
    lastWorkAt?: Date | null;
    createdAt?: Date | null;
  },
  now: Date = new Date(),
): LifecycleInterval[] {
  const launched = getEffectiveLaunchDate(values);
  const healthy = values.firstHealthyAt ?? null;
  const gsc = getEffectiveGscAddedDate(values);
  const impressions = getEffectiveFirstImpressionDate(values);
  const click = getEffectiveFirstClickDate(values);
  const lastWork = values.lastWorkAt ?? null;

  const intervals: LifecycleInterval[] = [];

  const push = (key: string, label: string, from: Date | null, to: Date | null) => {
    if (!from || !to) return;
    intervals.push({ key, label, days: daysBetweenUtc(from, to) });
  };

  push('launch_to_healthy', 'От запуска до healthy', launched, healthy);
  push('launch_to_gsc', 'От запуска до GSC', launched, gsc);
  push('launch_to_impressions', 'От запуска до показов', launched, impressions);
  push('impressions_to_click', 'От показов до клика', impressions, click);
  if (lastWork) {
    intervals.push({
      key: 'days_since_work',
      label: 'Дней с последней работы',
      days: daysBetweenUtc(lastWork, now),
    });
  }

  return intervals;
}

export function buildLifecycleChain(
  values: EffectiveDateFields & {
    createdAt: Date;
    firstHealthyAt?: Date | null;
    lastWorkAt?: Date | null;
  },
): LifecycleChainItem[] {
  const launchAuto = values.launchedAt ?? null;
  const launchManual = values.launchedAtManual ?? null;
  const gscAuto = values.gscFirstSeenAt ?? null;
  const gscManual = values.gscAddedAtManual ?? null;
  const impressionAuto = values.firstImpressionAt ?? null;
  const impressionManual = values.firstImpressionAtManual ?? null;
  const clickAuto = values.firstClickAt ?? null;
  const clickManual = values.firstClickAtManual ?? null;

  return [
    {
      key: 'created',
      label: 'Создан в LOW',
      effective: values.createdAt,
      provenance: 'система',
      automatic: values.createdAt,
      editable: false,
    },
    {
      key: 'launched',
      label: 'Запущен',
      effective: getEffectiveLaunchDate(values),
      provenance: provenanceLabelRu(resolveDateProvenance(launchAuto, launchManual)),
      automatic: launchAuto,
      editable: true,
    },
    {
      key: 'healthy',
      label: 'Впервые стал доступен',
      effective: values.firstHealthyAt ?? null,
      provenance: values.firstHealthyAt ? 'DSD' : provenanceLabelRu('none'),
      automatic: values.firstHealthyAt ?? null,
      editable: false,
    },
    {
      key: 'gsc',
      label: 'Добавлен в GSC',
      effective: getEffectiveGscAddedDate(values),
      provenance: provenanceLabelRu(resolveDateProvenance(gscAuto, gscManual)),
      automatic: gscAuto,
      editable: true,
    },
    {
      key: 'impressions',
      label: 'Первые показы',
      effective: getEffectiveFirstImpressionDate(values),
      provenance: provenanceLabelRu(resolveDateProvenance(impressionAuto, impressionManual)),
      automatic: impressionAuto,
      editable: true,
    },
    {
      key: 'click',
      label: 'Первый клик',
      effective: getEffectiveFirstClickDate(values),
      provenance: provenanceLabelRu(resolveDateProvenance(clickAuto, clickManual)),
      automatic: clickAuto,
      editable: true,
    },
    {
      key: 'lastWork',
      label: 'Последняя работа',
      effective: values.lastWorkAt ?? null,
      provenance: values.lastWorkAt ? 'система' : provenanceLabelRu('none'),
      automatic: values.lastWorkAt ?? null,
      editable: false,
    },
  ];
}

export function resolveWebsiteOpenUrl(
  primaryUrl: string | null | undefined,
  domain: string,
): string {
  const trimmed = primaryUrl?.trim();
  if (trimmed) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }
  return `https://${domain}`;
}
