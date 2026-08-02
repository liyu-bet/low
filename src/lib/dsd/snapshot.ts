import type { DsdExternalSnapshot } from '@/lib/dsd/schemas';

/**
 * Safely parse WebsiteIntegration.externalData for DSD.
 * Returns null for unknown/legacy/invalid shapes — never throws.
 */
export function parseDsdExternalSnapshot(value: unknown): DsdExternalSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  if (typeof raw.status !== 'string') return null;
  if (typeof raw.lastPingMs !== 'number' || !Number.isFinite(raw.lastPingMs)) return null;
  if (typeof raw.isDnsValid !== 'boolean') return null;
  if (raw.domainExpiresAt != null && typeof raw.domainExpiresAt !== 'string') return null;
  if (raw.apexARecord != null && typeof raw.apexARecord !== 'string') return null;
  if (typeof raw.dsdCreatedAt !== 'string' || typeof raw.dsdUpdatedAt !== 'string') return null;

  let server: DsdExternalSnapshot['server'] = null;
  if (raw.server != null) {
    if (typeof raw.server !== 'object' || Array.isArray(raw.server)) return null;
    const s = raw.server as Record<string, unknown>;
    if (
      typeof s.id !== 'string' ||
      typeof s.name !== 'string' ||
      typeof s.ip !== 'string' ||
      typeof s.status !== 'string'
    ) {
      return null;
    }
    server = { id: s.id, name: s.name, ip: s.ip, status: s.status };
  }

  return {
    status: raw.status,
    lastPingMs: raw.lastPingMs,
    isDnsValid: raw.isDnsValid,
    domainExpiresAt: raw.domainExpiresAt ?? null,
    apexARecord: raw.apexARecord ?? null,
    server,
    dsdCreatedAt: raw.dsdCreatedAt,
    dsdUpdatedAt: raw.dsdUpdatedAt,
  };
}

export function isDsdOnlineStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'online' || normalized === 'up' || normalized === 'ok';
}

export function isDsdOfflineStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'offline' ||
    normalized === 'down' ||
    normalized === 'error' ||
    normalized === 'unreachable' ||
    normalized === 'unhealthy'
  );
}
