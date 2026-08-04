import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  openWebsiteByDomain,
  E2E_SITES,
  E2E_USERS,
} from './helpers';

test.describe('tasks', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('quick create keeps layout stable and attributes author', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWebsiteByDomain(page, E2E_SITES.nextStage.domain);

    const form = page
      .locator('form')
      .filter({ has: page.getByPlaceholder('Что нужно сделать?') })
      .first();
    const title = form.getByPlaceholder('Что нужно сделать?');
    const addBtn = form.getByRole('button', { name: /Добавить/ });
    const widthBefore = await addBtn.evaluate((el) => el.getBoundingClientRect().width);
    const beforeY = await page.evaluate(() => window.scrollY);
    const unique = `E2E quick ${Date.now()}`;

    await title.fill(unique);
    await addBtn.click();

    await expect(page.getByText('Добавлено').first()).toBeVisible();
    await expect(title).toHaveValue('');
    await expect(title).toBeFocused();
    await expect(page.getByText(unique).first()).toBeVisible();
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(beforeY + 80);
    await expect(page.getByText('Добавлено').first()).toBeHidden({ timeout: 5000 });

    const widthAfter = await addBtn.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(2);

    // Open task meta should mention assignee (default self = Admin Test)
    const row = page.locator('li').filter({ hasText: unique }).first();
    await expect(row.getByText(E2E_USERS.admin.name)).toBeVisible();

    collector.assertClean();
    collector.dispose();
  });

  test('start and complete task records completer; action menu works', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWebsiteByDomain(page, E2E_SITES.complete.domain);

    const row = page.locator('li').filter({ hasText: 'E2E TODO no due' }).first();
    await expect(row).toBeVisible();

    const menuBtn = row.getByRole('button', { name: 'Дополнительные действия' });
    await menuBtn.click();
    const menu = page.locator('[role="menu"]').first();
    await expect(menu).toBeVisible();
    await expect
      .poll(async () => {
        const box = await menu.boundingBox();
        if (!box) return false;
        return box.x >= -1 && box.x + box.width <= 391;
      })
      .toBeTruthy();
    await page.getByRole('button', { name: 'В работу' }).click();

    await expect(
      page.locator('#tasks li').filter({ hasText: 'E2E TODO no due' }).getByText('В работе'),
    ).toBeVisible({ timeout: 15_000 });

    const inProgress = page.locator('#tasks li').filter({ hasText: 'E2E TODO no due' }).first();
    await inProgress.getByRole('button', { name: /Выполнить/ }).click();
    await expect(page.locator('#tasks li').filter({ hasText: 'E2E TODO no due' })).toHaveCount(0, {
      timeout: 15_000,
    });

    await expect(
      page.locator('#life-tree').getByText('E2E TODO no due', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('#life-tree').getByText(E2E_USERS.admin.name).first()).toBeVisible();
  });

  test('double submit does not create duplicate titles for one click cycle', async ({
    page,
  }) => {
    await openWebsiteByDomain(page, E2E_SITES.missingLaunch.domain);
    const unique = `E2E once ${Date.now()}`;
    const form = page
      .locator('#tasks form')
      .filter({ has: page.getByPlaceholder('Что нужно сделать?') })
      .first();
    await form.getByPlaceholder('Что нужно сделать?').fill(unique);
    const addBtn = form.getByRole('button', { name: /Добавить/ });
    await addBtn.click();
    await expect(page.getByText('Добавлено').first()).toBeVisible();
    await expect(page.locator('#tasks').getByText(unique)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#tasks').getByText(unique)).toHaveCount(1);
  });
});
