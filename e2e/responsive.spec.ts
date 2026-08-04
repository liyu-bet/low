import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  expectNoHorizontalOverflow,
  openWebsiteByDomain,
  profilePathForDomain,
  E2E_SITES,
} from './helpers';

test.describe('responsive', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('no page overflow across key routes and viewports', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    const profilePath = await profilePathForDomain(page, E2E_SITES.complete.domain);

    const checks: Array<{ width: number; height: number; path: string }> = [
      { width: 390, height: 844, path: '/websites' },
      { width: 390, height: 844, path: profilePath },
      { width: 390, height: 844, path: '/tasks' },
      { width: 768, height: 900, path: profilePath },
      { width: 768, height: 900, path: '/tasks' },
      { width: 1440, height: 900, path: '/websites' },
      { width: 1440, height: 900, path: profilePath },
      { width: 1440, height: 900, path: '/tasks' },
    ];

    for (const check of checks) {
      await page.setViewportSize({ width: check.width, height: check.height });
      await page.goto(check.path);
      await expectNoHorizontalOverflow(page);
    }

    collector.assertClean();
    collector.dispose();
  });

  test('milestone rail has no horizontal scroll containers', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWebsiteByDomain(page, E2E_SITES.missingLaunch.domain);
    const rail = page.locator('[data-milestone-rail]');
    await expect(rail).toBeVisible();
    expect(await rail.locator('.overflow-x-auto, .overflow-x-scroll').count()).toBe(0);
    const dims = await rail.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth + 1);

    // Mobile vertical stepper visible (sm:hidden branch)
    await expect(rail.locator('.sm\\:hidden')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload();
    await expect(rail.locator('.hidden.sm\\:block')).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await expect(rail.locator('.hidden.sm\\:block')).toBeVisible();
    const cols = await rail.locator('.hidden.sm\\:block ol').evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
    );
    expect(cols).toBe(6);
  });

  test('mobile menu and action menu stay in viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/websites');

    const menuBtn = page.getByRole('button', { name: 'Меню' });
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
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    await menuBtn.click();
    await expect(menu).toBeVisible();
    await page.locator('body').click({ position: { x: 10, y: 200 } });
    await expect(menu).toBeHidden();

    await page.goto('/tasks');
    const actionBtn = page.getByRole('button', { name: 'Дополнительные действия' }).first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();
    const actionMenu = page.locator('[role="menu"]').first();
    await expect(actionMenu).toBeVisible();
    await expect
      .poll(async () => {
        const box = await actionMenu.boundingBox();
        if (!box) return false;
        return box.x >= -1 && box.x + box.width <= 391;
      })
      .toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(actionMenu).toBeHidden();
  });
});
