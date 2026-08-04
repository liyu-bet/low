import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  openWebsiteByDomain,
  E2E_SITES,
} from './helpers';

test.describe('websites', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('search and open seeded profiles with correct milestone states', async ({
    page,
  }) => {
    const collector = attachBrowserErrorCollector(page);
    await page.goto('/websites');

    await page.getByPlaceholder(/Поиск/i).fill(E2E_SITES.complete.domain);
    await expect(
      page.getByRole('link', { name: `Открыть профиль ${E2E_SITES.complete.domain}` }),
    ).toBeVisible();

    await page.getByPlaceholder(/Поиск/i).fill(E2E_SITES.complete.name);
    await expect(
      page.getByRole('link', { name: `Открыть профиль ${E2E_SITES.complete.domain}` }),
    ).toBeVisible();

    await openWebsiteByDomain(page, E2E_SITES.complete.domain);
    await expect(page.getByText('Все основные этапы достигнуты')).toBeVisible();

    await openWebsiteByDomain(page, E2E_SITES.missingLaunch.domain);
    await expect(page.getByText('Не указана дата запуска')).toBeVisible();
    await expect(page.getByText('Следующий этап: запуск')).toHaveCount(0);

    await openWebsiteByDomain(page, E2E_SITES.nextStage.domain);
    await expect(page.getByText(/Следующий этап:/)).toBeVisible();
    await expect(page.getByText('Не указана дата запуска')).toHaveCount(0);

    collector.assertClean();
    collector.dispose();
  });

  test('history shows authors; automatic events toggle; disclosures work', async ({
    page,
  }) => {
    await openWebsiteByDomain(page, E2E_SITES.complete.domain);

    const lifeTree = page.locator('#life-tree');
    await expect(lifeTree.getByText('Показать автоматические события')).toBeVisible();
    await expect(lifeTree.getByText('Сайт добавлен в LOW')).toHaveCount(0);
    await lifeTree.getByLabel('Показать автоматические события').check();
    await expect(lifeTree.getByText('Сайт добавлен в LOW')).toBeVisible();

    await expect(lifeTree.getByText('Admin Test').first()).toBeVisible();
    await expect(lifeTree.getByText('E2E technical work by admin')).toBeVisible();

    await openWebsiteByDomain(page, E2E_SITES.missingLaunch.domain);
    await expect(
      page.locator('#life-tree').getByText('legacy-author@example.test', { exact: true }),
    ).toBeVisible();

    await openWebsiteByDomain(page, E2E_SITES.complete.domain);
    const integrations = page.locator('details').filter({ hasText: 'Интеграции' }).first();
    await integrations.locator('summary').click();
    await expect(integrations).toHaveAttribute('open', '');
    await integrations.locator('summary').click();

    // ADMIN sees settings disclosure
    await expect(page.locator('details').filter({ hasText: 'Настройки' })).toHaveCount(1);
  });
});
