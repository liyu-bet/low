/**
 * Guards that prevent e2e tooling from targeting production.
 * Pure helpers — safe to unit-test without Playwright.
 */

const PRODUCTION_HOST_MARKERS = [
  'low.liyu.bet',
  'liyu.bet',
];

export function assertSafeE2eBaseUrl(baseUrl: string | undefined | null): string {
  const url = (baseUrl ?? 'http://127.0.0.1:8082').trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid E2E_BASE_URL: ${url}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    throw new Error(
      `Refusing e2e against non-local host "${host}". Use http://127.0.0.1:8082 only.`,
    );
  }

  const lower = url.toLowerCase();
  for (const marker of PRODUCTION_HOST_MARKERS) {
    if (lower.includes(marker)) {
      throw new Error(`Refusing e2e against production marker "${marker}".`);
    }
  }

  return url.replace(/\/$/, '');
}

export function assertSafeE2eDatabaseUrl(databaseUrl: string | undefined | null): string {
  const url = (databaseUrl ?? '').trim();
  if (!url) {
    throw new Error('DATABASE_URL is required for e2e seed.');
  }

  const lower = url.toLowerCase();
  for (const marker of PRODUCTION_HOST_MARKERS) {
    if (lower.includes(marker)) {
      throw new Error(`Refusing e2e seed against production marker "${marker}".`);
    }
  }

  // Obvious production-ish hostnames (not loopback / docker service names).
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      host.includes('amazonaws.com') ||
      host.includes('neon.tech') ||
      host.includes('supabase.co') ||
      host.includes('railway.app') ||
      host.endsWith('.liyu.bet')
    ) {
      throw new Error(`Refusing e2e seed against remote host "${host}".`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Refusing')) throw error;
    // URL() may fail for some postgres URLs without protocol normalization
  }

  return url;
}

export function assertE2eSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const nodeEnv = (env.NODE_ENV ?? '').trim();
  const allow = env.E2E_ALLOW_SEED === '1';
  if (nodeEnv !== 'test' && !allow) {
    throw new Error(
      'e2e seed refused: set NODE_ENV=test or E2E_ALLOW_SEED=1 for a dedicated test database.',
    );
  }
  assertSafeE2eDatabaseUrl(env.DATABASE_URL);
}

export const E2E_USERS = {
  admin: {
    email: 'admin@example.test',
    name: 'Admin Test',
    password: 'admin-test-password',
  },
  member: {
    email: 'member@example.test',
    name: 'Member Test',
    password: 'member-test-password',
  },
} as const;

export const E2E_SITES = {
  complete: {
    domain: 'complete.example.test',
    normalizedDomain: 'complete.example.test',
    name: 'Complete Site',
  },
  missingLaunch: {
    domain: 'missing-launch.example.test',
    normalizedDomain: 'missing-launch.example.test',
    name: 'Missing Launch Site',
  },
  nextStage: {
    domain: 'next-stage.example.test',
    normalizedDomain: 'next-stage.example.test',
    name: 'Next Stage Site',
  },
  favoriteCandidate: {
    domain: 'favorite-candidate.example.test',
    normalizedDomain: 'favorite-candidate.example.test',
    name: 'Favorite Candidate Site',
  },
  archivable: {
    domain: 'archivable.example.test',
    normalizedDomain: 'archivable.example.test',
    name: 'Archivable Site',
  },
} as const;
