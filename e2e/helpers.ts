import { expect, type Page, type ConsoleMessage, type Response } from '@playwright/test';
import { E2E_SITES, E2E_USERS } from '../src/lib/e2e/guards';
import {
  isFatalBrowserMessage,
  isIgnorableBrowserMessage,
} from '../src/lib/e2e/browser-errors';

export { E2E_SITES, E2E_USERS };

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    dimensions.scrollWidth,
    `horizontal overflow: scrollWidth=${dimensions.scrollWidth} clientWidth=${dimensions.clientWidth}`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function assertDatabaseReady(page: Page) {
  const res = await page.request.get('/api/health/ready');
  if (!res.ok()) {
    throw new Error(
      'E2E database is not ready. Apply migrations and run npm run e2e:seed.',
    );
  }
  const body = (await res.json()) as { database?: string; status?: string };
  if (body.database !== 'up') {
    throw new Error(
      'E2E database is not ready. Apply migrations and run npm run e2e:seed.',
    );
  }
}

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

export async function expectLoginSuccess(page: Page) {
  await page.waitForURL(/\/websites/, { timeout: 20_000 });
}

export function attachBrowserErrorCollector(page: Page) {
  const errors: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isIgnorableBrowserMessage(text)) return;
    if (isFatalBrowserMessage(text) || true) {
      // Treat remaining console.error as fatal unless ignorable
      if (!isIgnorableBrowserMessage(text)) errors.push(`console.error: ${text}`);
    }
  };

  const onPageError = (error: Error) => {
    errors.push(`pageerror: ${error.message}`);
  };

  const onResponse = (response: Response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 500 && !url.includes('/_next/static')) {
      errors.push(`http ${status}: ${url}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  return {
    assertClean() {
      expect(errors, errors.join('\n')).toEqual([]);
    },
    dispose() {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
    },
  };
}

export async function openWebsiteByDomain(page: Page, domain: string) {
  await page.goto('/websites');
  await page.getByPlaceholder(/Поиск/i).fill(domain);
  const profileLink = page.getByRole('link', { name: `Открыть профиль ${domain}` });
  await expect(profileLink).toBeVisible();
  await profileLink.click();
  await expect(page.getByRole('heading', { name: domain })).toBeVisible();
}

/** Opens the websites list filters panel (idempotent: no-op if already open). */
export async function ensureWebsiteFiltersOpen(page: Page) {
  const archiveToggle = page.getByRole('link', { name: /Показать архив|Скрыть архив/ });
  if (await archiveToggle.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: 'Фильтры' }).click();
  await expect(archiveToggle).toBeVisible();
}

export async function profilePathForDomain(page: Page, domain: string): Promise<string> {
  await page.goto('/websites');
  await page.getByPlaceholder(/Поиск/i).fill(domain);
  const link = page.getByRole('link', { name: `Открыть профиль ${domain}` });
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  if (!href) throw new Error(`No href for domain ${domain}`);
  return href;
}
