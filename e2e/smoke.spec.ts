import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, loginAsTestUser } from './helpers';

async function databaseReady(page: import('@playwright/test').Page): Promise<boolean> {
  try {
    const res = await page.request.get('/api/health/ready');
    if (!res.ok()) return false;
    const body = await res.json();
    return body?.database === 'up' || body?.status === 'ok';
  } catch {
    return false;
  }
}

test.describe('UI smoke', () => {
  test('login page has no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expectNoHorizontalOverflow(page);
  });

  test('authenticated pages have no overflow; milestones have no x-scroll', async ({
    page,
  }) => {
    test.skip(
      !(process.env.E2E_EMAIL || process.env.ADMIN_EMAIL),
      'No e2e credentials',
    );
    test.skip(!(await databaseReady(page)), 'Local database is not ready');

    await loginAsTestUser(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/websites');
    await expectNoHorizontalOverflow(page);

    const menuBtn = page.getByRole('button', { name: 'Меню' });
    await menuBtn.click();
    await expect(page.getByRole('menuitem', { name: 'Обзор' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');

    await page.goto('/tasks');
    await expectNoHorizontalOverflow(page);

    await page.goto('/websites');
    const href = await page.locator('a[href^="/websites/"]').evaluateAll((nodes) =>
      nodes
        .map((n) => (n as HTMLAnchorElement).getAttribute('href'))
        .find((h) => h && /^\/websites\/[^/]+$/.test(h) && h !== '/websites/new'),
    );
    test.skip(!href, 'No website profile available');
    await page.goto(href!);

    for (const width of [390, 768, 1440] as const) {
      await page.setViewportSize({
        width,
        height: width === 390 ? 844 : 900,
      });
      await expectNoHorizontalOverflow(page);
      const rail = page.locator('[data-milestone-rail]');
      await expect(rail).toBeVisible();
      const nestedScroll = await rail.locator('.overflow-x-auto, .overflow-x-scroll').count();
      expect(nestedScroll).toBe(0);
      const overflowX = await rail.evaluate((el) => getComputedStyle(el).overflowX);
      expect(['visible', 'clip', 'hidden']).toContain(overflowX);
    }

    const integrations = page.locator('details').filter({ hasText: 'Интеграции' }).first();
    await integrations.locator('summary').click();
    await expect(integrations).toHaveAttribute('open', '');
    await integrations.locator('summary').click();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(href!);
    const beforeY = await page.evaluate(() => window.scrollY);
    const form = page.locator('form').filter({
      has: page.getByPlaceholder('Что нужно сделать?'),
    }).first();
    const addBtn = form.getByRole('button', { name: /Добавить/ });
    const widthBefore = await addBtn.evaluate((el) => el.getBoundingClientRect().width);
    await form.getByPlaceholder('Что нужно сделать?').fill(`e2e smoke ${Date.now()}`);
    await addBtn.click();
    await expect(page.getByText('Добавлено').first()).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5_000 })
      .toBeLessThanOrEqual(beforeY + 80);
    await expect(page.getByText('Добавлено').first()).toBeHidden({ timeout: 5_000 });
    const widthAfter = await addBtn.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(2);
  });

  test('action menu stays in viewport', async ({ page }) => {
    test.skip(
      !(process.env.E2E_EMAIL || process.env.ADMIN_EMAIL),
      'No e2e credentials',
    );
    test.skip(!(await databaseReady(page)), 'Local database is not ready');
    await loginAsTestUser(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tasks');
    const menuBtn = page.getByRole('button', { name: 'Дополнительные действия' }).first();
    if ((await menuBtn.count()) === 0) {
      test.skip(true, 'No open tasks with action menu');
    }
    await menuBtn.click();
    const box = await page.locator('[role="menu"]').first().boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(391);
    }
    await expectNoHorizontalOverflow(page);
  });
});
