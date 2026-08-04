const BLOCKED_SCHEME = /^(javascript|data|file|vbscript|blob):/i;

function hrefWithoutRootSlash(parsed: URL): string {
  const path = parsed.pathname === '/' ? '' : parsed.pathname;
  return `${parsed.protocol}//${parsed.host}${path}${parsed.search}${parsed.hash}`;
}

/**
 * Builds a safe external http(s) URL for opening a website in a new tab.
 * Returns null when no safe URL can be formed (caller should disable the control).
 */
export function resolveSafeWebsiteOpenUrl(
  primaryUrl: string | null | undefined,
  normalizedDomain: string,
): string | null {
  const trimmed = primaryUrl?.trim();
  if (trimmed) {
    if (BLOCKED_SCHEME.test(trimmed)) return null;

    let candidate = trimmed;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      if (!/^https?:\/\//i.test(trimmed)) return null;
    } else {
      candidate = `https://${trimmed}`;
    }

    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return hrefWithoutRootSlash(parsed);
    } catch {
      return null;
    }
  }

  const domain = normalizedDomain.trim().toLowerCase();
  if (!domain || domain.includes('/') || domain.includes(' ') || domain.includes('..')) {
    return null;
  }
  if (BLOCKED_SCHEME.test(domain)) return null;

  try {
    const parsed = new URL(`https://${domain}`);
    if (parsed.protocol !== 'https:') return null;
    return hrefWithoutRootSlash(parsed);
  } catch {
    return null;
  }
}

/**
 * Profile/list fallback that always returns an http(s) string when a domain exists.
 * Prefer {@link resolveSafeWebsiteOpenUrl} when a disabled UI state is available.
 */
export function resolveWebsiteOpenUrl(
  primaryUrl: string | null | undefined,
  domain: string,
): string {
  const safe = resolveSafeWebsiteOpenUrl(primaryUrl, domain);
  if (safe) return safe;
  const fallbackDomain = domain.trim() || 'invalid.invalid';
  return `https://${fallbackDomain}`;
}
