import { z } from 'zod';
import {
  assertSafeGscSnapshot,
  type GscExternalSnapshot,
  type GscPropertyType,
} from '@/lib/gsc/schemas';
import {
  gscPerformanceSnapshotSchema,
  type GscPerformanceSnapshot,
} from '@/lib/gsc/performance';

const connectionSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().nullable(),
});

const baseSnapshotSchema = z.object({
  siteUrl: z.string().min(1),
  propertyType: z.enum(['domain', 'url_prefix']),
  permissionLevel: z.string().nullable(),
  label: z.string().nullable(),
  isSelected: z.boolean(),
  gscFirstSeenAt: z.string().min(1),
  gscUpdatedAt: z.string().min(1),
  connection: connectionSchema,
  performance: gscPerformanceSnapshotSchema.optional(),
});

export type GscExternalSnapshotWithPerformance = GscExternalSnapshot & {
  performance?: GscPerformanceSnapshot;
};

export function parseGscExternalSnapshotWithPerformance(
  raw: unknown,
): GscExternalSnapshotWithPerformance | null {
  const parsed = baseSnapshotSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export function mergePerformanceIntoSnapshot(
  snapshot: GscExternalSnapshot,
  performance: GscPerformanceSnapshot | null,
): GscExternalSnapshotWithPerformance {
  const next: GscExternalSnapshotWithPerformance = { ...snapshot };
  if (performance) {
    next.performance = performance;
  }
  assertSafeGscSnapshot(next);
  return next;
}

export type SelectableGscProperty = {
  externalId: string;
  siteUrl: string;
  isSelected: boolean;
  propertyType: GscPropertyType;
  externalData: unknown;
};

/**
 * Choose exactly one GSC property for recommendations.
 * Never sum overlapping domain + URL-prefix properties.
 */
export function selectSourceGscProperty(
  properties: SelectableGscProperty[],
  primaryUrl: string | null,
): SelectableGscProperty | null {
  const selected = properties.filter((p) => p.isSelected);
  const pool = selected.length > 0 ? selected : [];

  const domain = pool.find((p) => p.propertyType === 'domain');
  if (domain) return domain;

  if (primaryUrl) {
    const normalizedPrimary = primaryUrl.replace(/\/$/, '').toLowerCase();
    const urlPrefix = pool.find((p) => {
      if (p.propertyType !== 'url_prefix') return false;
      const site = p.siteUrl.replace(/\/$/, '').toLowerCase();
      return normalizedPrimary.startsWith(site) || site.startsWith(normalizedPrimary);
    });
    if (urlPrefix) return urlPrefix;
  }

  if (pool[0]) return pool[0];
  return null;
}
