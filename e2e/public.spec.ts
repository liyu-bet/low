import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  expectLoginSuccess,
  expectNoHorizontalOverflow,
  loginWithCredentials,
  E2E_USERS,
} from './helpers';

test.describe('public', () => {
  test('login opens and has no overflow at 390px', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    collector.assertClean();
    collector.dispose();
  });

  test('wrong credentials share the same message', async ({ page }) => {
    await assertDatabaseReady(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'missing@example.test');
    await page.fill('input[name="password"]', 'wrong-password-123');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Неверный email или пароль')).toBeVisible();

    await page.fill('input[name="email"]', E2E_USERS.admin.email);
    await page.fill('input[name="password"]', 'wrong-password-123');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Неверный email или пароль')).toBeVisible();
  });

  test('anonymous websites redirects to login', async ({ page }) => {
    await page.goto('/websites');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('ADMIN and MEMBER login reach websites; logout clears session', async ({
    page,
  }) => {
    await assertDatabaseReady(page);

    await loginWithCredentials(page, E2E_USERS.admin.email, E2E_USERS.admin.password);
    await expectLoginSuccess(page);

    await page.getByRole('button', { name: 'Меню пользователя' }).click();
    await expect(page.getByRole('menuitem', { name: 'Выйти' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Выйти' }).click();
    await page.waitForURL(/\/login/, { timeout: 20_000 });

    await page.goto('/websites');
    await page.waitForURL(/\/login/);

    await loginWithCredentials(page, E2E_USERS.member.email, E2E_USERS.member.password);
    await expectLoginSuccess(page);
  });
});
