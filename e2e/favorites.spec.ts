import { test, expect, type Page } from '@playwright/test';
import { assertDatabaseReady, attachBrowserErrorCollector, E2E_SITES } from './helpers';

/**
 * A recommended site is listed twice on an unfiltered list: once as a compact
 * recommendation card and once as a normal row. Every locator must therefore be
 * scoped to a section, otherwise Playwright strict mode matches both.
 */
function section(page: Page, headingPattern: RegExp) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: headingPattern }) });
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

    const recommendationCard = recommendations.getByRole('listitem').filter({ hasText: domain });
    await expect(recommendationCard).toBeVisible();
    await expect(recommendationCard.getByText(/Показы:/)).toBeVisible();

    await recommendationCard.getByRole('button', { name: 'Добавить в избранное' }).click();

    const favorites = section(page, /^Избранное/);
    await expect(favorites.getByText(domain)).toBeVisible({ timeout: 10_000 });
    await expect(favorites.getByText('Избранное', { exact: true }).first()).toBeVisible();

    // No longer a recommendation once favorited (it was the only eligible candidate).
    await expect(page.getByRole('heading', { name: 'Рекомендуем добавить' })).toHaveCount(0);

    const favoriteCard = favorites.getByRole('listitem').filter({ hasText: domain });
    await favoriteCard.getByRole('button', { name: 'Убрать из избранного' }).click();

    await expect(page.getByRole('heading', { name: /^Избранное/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Рекомендуем добавить' })).toBeVisible({
      timeout: 10_000,
    });

    collector.assertClean();
    collector.dispose();
  });

  test('favorite star on the website profile stays in sync with the list', async ({ page }) => {
    const domain = E2E_SITES.favoriteCandidate.domain;

    await page.goto('/websites');
    // Searching hides the recommendation section, leaving a single row for this domain.
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    await page.getByRole('link', { name: domain }).first().click();
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

    // Clean up so re-running this spec without reseeding stays idempotent.
    const favoriteCard = favorites.getByRole('listitem').filter({ hasText: domain });
    await favoriteCard.getByRole('button', { name: 'Убрать из избранного' }).click();
    await expect(page.getByRole('heading', { name: /^Избранное/ })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
