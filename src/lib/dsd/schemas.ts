import { z } from 'zod';

export const dsdHealthSchema = z.object({
  ok: z.literal(true),
  service: z.literal('dsd'),
  generatedAt: z.string().min(1),
});

export const dsdServerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  ip: z.string(),
  status: z.string(),
});

export const dsdAccountSchema = z.object({
  provider: z.enum(['cloudflare', 'gcore', 'registrar', 'hosting']),
  externalId: z.string().min(1),
  name: z.string(),
  hasCredential: z.boolean(),
});

export const dsdSiteSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  status: z.string(),
  lastPingMs: z.number(),
  isDnsValid: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  firstHealthyAt: z.string().nullable(),
  domainExpiresAt: z.string().nullable(),
  apexARecord: z.string().nullable(),
  server: dsdServerSchema.nullable(),
  accounts: z.array(dsdAccountSchema),
});

export const dsdSitesPageSchema = z.object({
  items: z.array(dsdSiteSchema),
  nextCursor: z.string().nullable(),
  generatedAt: z.string().min(1),
});

export type DsdHealth = z.infer<typeof dsdHealthSchema>;
export type DsdSite = z.infer<typeof dsdSiteSchema>;
export type DsdSitesPage = z.infer<typeof dsdSitesPageSchema>;
export type DsdAccount = z.infer<typeof dsdAccountSchema>;

export type DsdExternalSnapshot = {
  status: string;
  lastPingMs: number;
  isDnsValid: boolean;
  domainExpiresAt: string | null;
  apexARecord: string | null;
  server: {
    id: string;
    name: string;
    ip: string;
    status: string;
  } | null;
  dsdCreatedAt: string;
  dsdUpdatedAt: string;
  accounts?: Array<{
    provider: string;
    externalId: string;
    name: string;
    hasCredential: boolean;
  }>;
};

const FORBIDDEN_SNAPSHOT_KEYS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'ciphertext',
  'login',
  'panelPassword',
  'sshPassword',
] as const;

export function buildSafeExternalSnapshot(site: DsdSite): DsdExternalSnapshot {
  return {
    status: site.status,
    lastPingMs: site.lastPingMs,
    isDnsValid: site.isDnsValid,
    domainExpiresAt: site.domainExpiresAt,
    apexARecord: site.apexARecord,
    server: site.server
      ? {
          id: site.server.id,
          name: site.server.name,
          ip: site.server.ip,
          status: site.server.status,
        }
      : null,
    dsdCreatedAt: site.createdAt,
    dsdUpdatedAt: site.updatedAt,
    accounts: site.accounts.map((account) => ({
      provider: account.provider,
      externalId: account.externalId,
      name: account.name,
      hasCredential: account.hasCredential,
    })),
  };
}

export function assertSafeSnapshot(snapshot: DsdExternalSnapshot): void {
  const json = JSON.stringify(snapshot);
  for (const key of FORBIDDEN_SNAPSHOT_KEYS) {
    if (json.toLowerCase().includes(`"${key.toLowerCase()}"`)) {
      throw new Error(`Snapshot contains forbidden key: ${key}`);
    }
  }
}
