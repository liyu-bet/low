import { DomainNormalizationError, normalizeDomain } from '@/lib/domain/normalize';
import type { GscPropertyType } from '@/lib/gsc/schemas';

export type NormalizedGscProperty = {
  originalPropertyUrl: string;
  propertyType: GscPropertyType;
  normalizedDomain: string;
  displayDomain: string;
  primaryUrl: string | null;
};

/**
 * Map a GSC siteUrl to LOW domain matching fields without dropping the original URL.
 */
export function normalizeGscPropertyUrl(siteUrl: string): NormalizedGscProperty {
  const trimmed = siteUrl.trim();
  if (!trimmed) {
    throw new DomainNormalizationError('GSC siteUrl is empty');
  }

  if (trimmed.toLowerCase().startsWith('sc-domain:')) {
    const rawDomain = trimmed.slice('sc-domain:'.length).trim();
    const normalizedDomain = normalizeDomain(rawDomain);
    return {
      originalPropertyUrl: trimmed,
      propertyType: 'domain',
      normalizedDomain,
      displayDomain: rawDomain.replace(/\.$/, '').toLowerCase().replace(/^www\./, '') || normalizedDomain,
      primaryUrl: `https://${normalizedDomain}/`,
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new DomainNormalizationError(`Cannot parse GSC siteUrl: ${siteUrl}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new DomainNormalizationError(`Unsupported GSC property URL scheme: ${siteUrl}`);
  }

  const normalizedDomain = normalizeDomain(trimmed);
  return {
    originalPropertyUrl: trimmed,
    propertyType: 'url_prefix',
    normalizedDomain,
    displayDomain: url.hostname.replace(/\.$/, ''),
    primaryUrl: trimmed,
  };
}
