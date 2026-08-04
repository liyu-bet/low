import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  ensureWebsiteFiltersOpen,
  E2E_SITES,
} from './helpers';

test.describe('website archive and restore', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('admin can archive a site, see it in the archive, and restore it', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    const domain = E2E_SITES.archivable.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);

    const card = page.getByRole('listitem').filter({ hasText: domain });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Убрать из LOW' }).click();

    const dialog = page.getByRole('dialog', { name: 'Убрать сайт из LOW?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Убрать из LOW' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    // Archived sites are hidden from the default (active) list.
    await expect(page.getByRole('listitem').filter({ hasText: domain })).toHaveCount(0, {
      timeout: 10_000,
    });

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await expect(page).toHaveURL(/archived=1/);

    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const archivedCard = page.getByRole('listitem').filter({ hasText: domain });
    await expect(archivedCard).toBeVisible();
    await expect(archivedCard.getByText(/В архиве/)).toBeVisible();

    await archivedCard.getByRole('button', { name: 'Вернуть в LOW' }).click();

    // The archived view lists every site, so a restored site stays visible but
    // switches back to its pre-archive status.
    await expect(archivedCard.getByText(/Активен/)).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Скрыть архив' }).click();
    await expect(page).not.toHaveURL(/archived=1/);

    await page.getByPlaceholder(/Поиск/i).fill(domain);
    await expect(page.getByRole('listitem').filter({ hasText: domain })).toBeVisible({
      timeout: 10_000,
    });

    collector.assertClean();
    collector.dispose();
  });

  test('archived site cannot be newly favorited from the list', async ({ page }) => {
    const domain = E2E_SITES.archivable.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const card = page.getByRole('listitem').filter({ hasText: domain });
    await card.getByRole('button', { name: 'Убрать из LOW' }).click();
    const dialog = page.getByRole('dialog', { name: 'Убрать сайт из LOW?' });
    await dialog.getByRole('button', { name: 'Убрать из LOW' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await page.getByPlaceholder(/Поиск/i).fill(domain);

    const archivedCard = page.getByRole('listitem').filter({ hasText: domain });
    await expect(archivedCard).toBeVisible();
    const disabledStar = archivedCard.locator('[title="Архивный сайт нельзя добавить в избранное"]');
    await expect(disabledStar).toBeVisible();

    // Restore for the next test run / other specs.
    await archivedCard.getByRole('button', { name: 'Вернуть в LOW' }).click();
    await expect(archivedCard.getByText(/Активен/)).toBeVisible({ timeout: 10_000 });
  });
});
