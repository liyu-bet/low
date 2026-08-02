import { z } from 'zod';

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const gscHealthSchema = z.object({
  ok: z.literal(true),
  service: z.literal('gsc'),
  generatedAt: z.string().min(1),
});

export const gscPropertyConnectionSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().nullable(),
});

export const gscPropertySchema = z.object({
  id: z.string().min(1),
  siteUrl: z.string().min(1),
  permissionLevel: z.string().nullable(),
  label: z.string().nullable(),
  isSelected: z.boolean(),
  firstSeenAt: z.string().min(1),
  updatedAt: z.string().min(1),
  connection: gscPropertyConnectionSchema,
});

export const gscPropertiesPageSchema = z.object({
  items: z.array(gscPropertySchema),
  nextCursor: z.string().nullable(),
  generatedAt: z.string().min(1),
});

export const gscLifecycleSchema = z
  .object({
    propertyId: z.string().min(1),
    siteUrl: z.string().min(1),
    firstImpressionDate: ymdSchema.nullable(),
    firstClickDate: ymdSchema.nullable(),
    searchedFrom: ymdSchema,
    searchedTo: ymdSchema,
    dateMeaning: z.literal('earliest_available_in_search_console_api'),
    generatedAt: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.searchedFrom > value.searchedTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'searchedFrom must be <= searchedTo',
        path: ['searchedFrom'],
      });
    }
    if (
      value.firstImpressionDate != null &&
      (value.firstImpressionDate < value.searchedFrom ||
        value.firstImpressionDate > value.searchedTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'firstImpressionDate must be within searchedFrom..searchedTo',
        path: ['firstImpressionDate'],
      });
    }
    if (
      value.firstClickDate != null &&
      (value.firstClickDate < value.searchedFrom || value.firstClickDate > value.searchedTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'firstClickDate must be within searchedFrom..searchedTo',
        path: ['firstClickDate'],
      });
    }
  });

export type GscHealth = z.infer<typeof gscHealthSchema>;
export type GscProperty = z.infer<typeof gscPropertySchema>;
export type GscPropertiesPage = z.infer<typeof gscPropertiesPageSchema>;
export type GscLifecycle = z.infer<typeof gscLifecycleSchema>;

export type GscPropertyType = 'domain' | 'url_prefix';

export type GscExternalSnapshot = {
  siteUrl: string;
  propertyType: GscPropertyType;
  permissionLevel: string | null;
  label: string | null;
  isSelected: boolean;
  gscFirstSeenAt: string;
  gscUpdatedAt: string;
  connection: {
    id: string;
    email: string;
    name: string | null;
  };
};

const FORBIDDEN_SNAPSHOT_KEYS = [
  'encryptedAccess',
  'encryptedRefresh',
  'access_token',
  'refresh_token',
  'accessToken',
  'refreshToken',
  'tokenExpiry',
  'GOOGLE_CLIENT_SECRET',
  'GSC_LOW_API_TOKEN',
  'Authorization',
  'authorization',
] as const;

export function buildSafeGscExternalSnapshot(
  property: GscProperty,
  propertyType: GscPropertyType,
): GscExternalSnapshot {
  return {
    siteUrl: property.siteUrl,
    propertyType,
    permissionLevel: property.permissionLevel,
    label: property.label,
    isSelected: property.isSelected,
    gscFirstSeenAt: property.firstSeenAt,
    gscUpdatedAt: property.updatedAt,
    connection: {
      id: property.connection.id,
      email: property.connection.email,
      name: property.connection.name,
    },
  };
}

export function assertSafeGscSnapshot(snapshot: GscExternalSnapshot): void {
  const json = JSON.stringify(snapshot);
  for (const key of FORBIDDEN_SNAPSHOT_KEYS) {
    if (json.includes(`"${key}"`) || Object.prototype.hasOwnProperty.call(snapshot, key)) {
      throw new Error(`Запрещённое поле в GSC snapshot: ${key}`);
    }
  }
}
