export type EffectiveDateFields = {
  launchedAt?: Date | null;
  launchedAtManual?: Date | null;
  gscFirstSeenAt?: Date | null;
  gscAddedAtManual?: Date | null;
  firstImpressionAt?: Date | null;
  firstImpressionAtManual?: Date | null;
  firstClickAt?: Date | null;
  firstClickAtManual?: Date | null;
};

export function getEffectiveLaunchDate(values: EffectiveDateFields): Date | null {
  return values.launchedAtManual ?? values.launchedAt ?? null;
}

export function getEffectiveGscAddedDate(values: EffectiveDateFields): Date | null {
  return values.gscAddedAtManual ?? values.gscFirstSeenAt ?? null;
}

export function getEffectiveFirstImpressionDate(values: EffectiveDateFields): Date | null {
  return values.firstImpressionAtManual ?? values.firstImpressionAt ?? null;
}

export function getEffectiveFirstClickDate(values: EffectiveDateFields): Date | null {
  return values.firstClickAtManual ?? values.firstClickAt ?? null;
}

export type DateProvenance = 'manual' | 'automatic' | 'none';

export function resolveDateProvenance(
  automatic: Date | null | undefined,
  manual: Date | null | undefined,
): DateProvenance {
  if (manual) return 'manual';
  if (automatic) return 'automatic';
  return 'none';
}

export function provenanceLabelRu(provenance: DateProvenance): string {
  switch (provenance) {
    case 'manual':
      return 'указано вручную';
    case 'automatic':
      return 'автоматически';
    default:
      return 'нет данных';
  }
}
