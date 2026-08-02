/**
 * Domain normalization for cross-system matching (LOW ↔ DSD ↔ GSC).
 *
 * Rules (see SPEC.md §6):
 * - trim
 * - accept bare domains and URLs
 * - lowercase
 * - strip scheme, path, query, hash, credentials, port
 * - strip trailing dot
 * - strip leading www.
 * - IDN → punycode via URL (Node / modern runtimes)
 */

export class DomainNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainNormalizationError';
  }
}

const LABEL_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/;

function hasScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function stripWww(host: string): string {
  return host.startsWith('www.') ? host.slice(4) : host;
}

function stripTrailingDot(host: string): string {
  return host.endsWith('.') ? host.slice(0, -1) : host;
}

function assertValidHostname(host: string): void {
  if (!host) {
    throw new DomainNormalizationError('Domain is empty after normalization');
  }
  if (host.length > 253) {
    throw new DomainNormalizationError('Domain exceeds 253 characters');
  }
  if (host.includes('..') || host.startsWith('-') || host.endsWith('-')) {
    throw new DomainNormalizationError(`Invalid domain: ${host}`);
  }

  const labels = host.split('.');
  for (const label of labels) {
    if (!label || label.length > 63 || !LABEL_RE.test(label)) {
      throw new DomainNormalizationError(`Invalid domain label in: ${host}`);
    }
  }
}

/**
 * Extract and canonicalize a hostname from a domain or URL-like string.
 */
export function normalizeDomain(input: string): string {
  if (typeof input !== 'string') {
    throw new DomainNormalizationError('Domain must be a string');
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new DomainNormalizationError('Domain is empty');
  }

  let host: string;

  try {
    const candidate = hasScheme(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    host = url.hostname;
  } catch {
    throw new DomainNormalizationError(`Cannot parse domain: ${input}`);
  }

  if (!host) {
    throw new DomainNormalizationError(`Cannot parse domain: ${input}`);
  }

  // URL.hostname is already lowercased and IDN-punycoded in Node/modern runtimes.
  host = stripTrailingDot(host.toLowerCase());
  host = stripWww(host);
  host = stripTrailingDot(host);

  assertValidHostname(host);
  return host;
}

/**
 * Effective GSC-added date: manual override wins over first automatic discovery.
 */
export function resolveGscAddedAt(values: {
  gscAddedAtManual: Date | null | undefined;
  gscFirstSeenAt: Date | null | undefined;
}): Date | null {
  return values.gscAddedAtManual ?? values.gscFirstSeenAt ?? null;
}
