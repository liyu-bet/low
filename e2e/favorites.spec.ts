import { test, expect, type Page } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  expectNoHorizontalOverflow,
  E2E_SITES,
} from './helpers';

function section(page: Page, headingPattern: RegExp) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: headingPattern }),
  });
}

function cardsWithDomain(page: Page, domain: string) {
  return page.locator(`[data-website-id]`).filter({ hasText: domain });
}

test.describe('favorites and recommendations', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('recommendation card can be favorited, moves into Избранное, and can be unfavorited', async ({
    page,
  }) => {
    const collector = attachBrowserErrorCollector(page);
    const domain = E2E_SITES.favoriteCandidate.domain;

    await page.goto('/websites');

    const recommendations = section(page, /^Рекомендуем добавить$/);
    await expect(recommendations).toBeVisible();

    const recommendationCard = recommendations.locator('[data-website-id]').filter({
      hasText: domain,
    });
    await expect(recommendationCard).toBeVisible();
    await expect(recommendationCard.getByText(/кликов/)).toBeVisible();
    await expect(recommendationCard.getByText(/Данные за/)).toBeVisible();
    await expect(cardsWithDomain(page, domain)).toHaveCount(1);

    await recommendationCard.getByRole('button', { name: 'Добавить в избранное' }).click();

    const favorites = section(page, /^Избранное/);
    await expect(favorites.getByText(domain)).toBeVisible({ timeout: 10_000 });
    await expect(favorites.getByText('Избранное', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Рекомендуем добавить' })).toHaveCount(0);
    await expect(cardsWithDomain(page, domain)).toHaveCount(1);

    const favoriteCard = favorites.locator('[data-website-id]').filter({ hasText: domain });
    await favoriteCard.getByRole('button', { name: 'Убрать из избранного' }).click();

    await expect(page.getByRole('heading', { name: /^Избранное/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Рекомендуем добавить' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(cardsWithDomain(page, domain)).toHaveCount(1);

    collector.assertClean();
    collector.dispose();
  });

  test('favorite star on the website profile stays in sync with the list', async ({ page }) => {
    const domain = E2E_SITES.favoriteCandidate.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    await page.getByRole('link', { name: `Открыть профиль ${domain}` }).click();
    await expect(page.getByRole('heading', { name: domain })).toBeVisible();

    const star = page.getByRole('button', { name: 'Добавить в избранное' });
    await expect(star).toBeVisible();
    await star.click();

    await expect(page.getByRole('button', { name: 'Убрать из избранного' })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/websites');
    const favorites = section(page, /^Избранное/);
    await expect(favorites.getByText(domain)).toBeVisible();
    await expect(cardsWithDomain(page, domain)).toHaveCount(1);

    const favoriteCard = favorites.locator('[data-website-id]').filter({ hasText: domain });
    await favoriteCard.getByRole('button', { name: 'Убрать из избранного' }).click();
    await expect(page.getByRole('heading', { name: /^Избранное/ })).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test('search and archived views keep each site unique', async ({ page }) => {
    const domain = E2E_SITES.favoriteCandidate.domain;
    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    await expect(page.getByRole('heading', { name: /^Результаты/ })).toBeVisible();
    await expect(cardsWithDomain(page, domain)).toHaveCount(1);

    await page.getByPlaceholder(/Поиск/i).fill('');
    await page.getByRole('button', { name: 'Фильтры' }).click();
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await expect(page).toHaveURL(/archived=1/);
    const ids = await page.locator('[data-website-id]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-website-id')),
    );
    expect(ids.length).toBe(new Set(ids).size);
  });

  test('mobile card actions stay in viewport at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/websites');
    const card = page.locator('[data-website-id]').first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    await expectNoHorizontalOverflow(page);

    const action = card.getByRole('link', { name: /Открыть сайт .+ в новой вкладке/ }).first();
    const actionBox = await action.boundingBox();
    expect(actionBox).toBeTruthy();
    expect(actionBox!.height).toBeGreaterThanOrEqual(40);
    expect(actionBox!.width).toBeGreaterThanOrEqual(40);
  });
});
