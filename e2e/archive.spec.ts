import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  ensureWebsiteFiltersOpen,
  expectNoHorizontalOverflow,
  E2E_SITES,
} from './helpers';

test.describe('website card actions', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('domain opens profile; external icon opens real site; plus toggles task form', async ({
    page,
  }) => {
    const collector = attachBrowserErrorCollector(page);
    const domain = E2E_SITES.complete.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const card = page.locator('[data-website-id]').filter({ hasText: domain });
    await expect(card).toBeVisible();
    await expect(card).toHaveCount(1);

    const external = card.getByRole('link', { name: `Открыть сайт ${domain} в новой вкладке` });
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
    const href = await external.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href!).toContain(domain);
    expect(href!).not.toContain('/websites/');

    const profilePromise = page.waitForURL(new RegExp(`/websites/[^/?]+$`));
    await card.getByRole('link', { name: `Открыть профиль ${domain}` }).click();
    await profilePromise;
    await expect(page.getByRole('heading', { name: domain })).toBeVisible();
    expect(page.url()).toMatch(/\/websites\/[^/?]+$/);

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const listCard = page.locator('[data-website-id]').filter({ hasText: domain });
    await listCard.getByRole('button', { name: 'Добавить задачу' }).click();
    await expect(listCard.locator('input[name="title"]')).toBeVisible();
    await listCard.getByRole('button', { name: 'Скрыть форму задачи' }).click();
    await expect(listCard.getByRole('button', { name: 'Добавить задачу' })).toBeVisible();

    collector.assertClean();
    collector.dispose();
  });

  test('admin sees archive; archived card shows restore and hides plus', async ({ page }) => {
    const domain = E2E_SITES.archivable.domain;
    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const card = page.locator('[data-website-id]').filter({ hasText: domain });
    await expect(card.getByRole('button', { name: 'Убрать из LOW' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Добавить задачу' })).toBeVisible();

    await card.getByRole('button', { name: 'Убрать из LOW' }).click();
    const dialog = page.getByRole('dialog', { name: 'Убрать сайт из LOW?' });
    await expect(dialog).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await dialog.getByRole('button', { name: 'Убрать из LOW' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const archivedCard = page.locator('[data-website-id]').filter({ hasText: domain });
    await expect(archivedCard.getByRole('button', { name: 'Вернуть в LOW' })).toBeVisible();
    await expect(archivedCard.getByRole('button', { name: 'Добавить задачу' })).toHaveCount(0);
    await expect(archivedCard.getByRole('button', { name: 'Убрать из LOW' })).toHaveCount(0);

    await archivedCard.getByRole('button', { name: 'Вернуть в LOW' }).click();
    await expect(archivedCard.getByText(/Активен/)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('website archive and restore', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('admin can archive a site, see it in the archive, and restore it', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    const domain = E2E_SITES.archivable.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);

    const card = page.locator('[data-website-id]').filter({ hasText: domain });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Убрать из LOW' }).click();

    const dialog = page.getByRole('dialog', { name: 'Убрать сайт из LOW?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(domain)).toBeVisible();
    await dialog.getByRole('button', { name: 'Убрать из LOW' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    await expect(page.locator('[data-website-id]').filter({ hasText: domain })).toHaveCount(0, {
      timeout: 10_000,
    });

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await expect(page).toHaveURL(/archived=1/);

    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const archivedCard = page.locator('[data-website-id]').filter({ hasText: domain });
    await expect(archivedCard).toBeVisible();
    await expect(archivedCard.getByText(/В архиве/)).toBeVisible();
    await expect(archivedCard).toHaveCount(1);

    await archivedCard.getByRole('button', { name: 'Вернуть в LOW' }).click();

    await expect(archivedCard.getByText(/Активен/)).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Скрыть архив' }).click();
    await expect(page).not.toHaveURL(/archived=1/);

    await page.getByPlaceholder(/Поиск/i).fill(domain);
    await expect(page.locator('[data-website-id]').filter({ hasText: domain })).toBeVisible({
      timeout: 10_000,
    });

    collector.assertClean();
    collector.dispose();
  });

  test('archived site cannot be newly favorited from the list', async ({ page }) => {
    const domain = E2E_SITES.archivable.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const card = page.locator('[data-website-id]').filter({ hasText: domain });
    await card.getByRole('button', { name: 'Убрать из LOW' }).click();
    const dialog = page.getByRole('dialog', { name: 'Убрать сайт из LOW?' });
    await dialog.getByRole('button', { name: 'Убрать из LOW' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await page.getByPlaceholder(/Поиск/i).fill(domain);

    const archivedCard = page.locator('[data-website-id]').filter({ hasText: domain });
    await expect(archivedCard).toBeVisible();
    await expect(
      archivedCard.getByRole('button', { name: 'Архивный сайт нельзя добавить в избранное' }),
    ).toBeVisible();

    await archivedCard.getByRole('button', { name: 'Вернуть в LOW' }).click();
    await expect(archivedCard.getByText(/Активен/)).toBeVisible({ timeout: 10_000 });
  });
});
