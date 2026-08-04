import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  loginWithCredentials,
  E2E_USERS,
} from './helpers';

test.describe('admin users', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('admin manages users with last-admin protection', async ({ page }) => {
    test.setTimeout(90_000);
    const collector = attachBrowserErrorCollector(page);
    await page.goto('/settings/users');
    await expect(page.getByRole('heading', { name: /Пользователи/i })).toBeVisible();

    const tempEmail = `temp-${Date.now()}@e2e-temp.test`;
    const tempPassword = 'temp-password-123';
    const createForm = page.locator('form').filter({ hasText: 'Новый пользователь' });
    await createForm.locator('input[name="name"]').fill('Temp Member');
    await createForm.locator('input[name="email"]').fill(tempEmail);
    await createForm.locator('select[name="role"]').selectOption('MEMBER');
    await createForm.locator('input[name="temporaryPassword"]').fill(tempPassword);
    await createForm.getByRole('button', { name: /Создать/i }).click();
    await expect(page.getByText(tempEmail)).toBeVisible({ timeout: 15_000 });

    const row = page.locator('li').filter({ hasText: tempEmail }).first();
    await row.locator('input[name="name"]').fill('Temp Member Renamed');
    await row.getByRole('button', { name: /Сохранить/i }).click();
    await expect(page.getByText('Temp Member Renamed')).toBeVisible({ timeout: 10_000 });

    await row.locator('select[name="isActive"]').selectOption('0');
    await row.getByRole('button', { name: /Сохранить/i }).click();
    await expect(row.getByRole('paragraph').filter({ hasText: /^Отключён/ })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'Меню пользователя' }).click();
    await page.getByRole('menuitem', { name: 'Выйти' }).click();
    await page.waitForURL(/\/login/, { timeout: 20_000 });

    await loginWithCredentials(page, tempEmail, tempPassword);
    await expect(page.getByText(/Учётная запись отключена|Неверный email или пароль/i)).toBeVisible({
      timeout: 15_000,
    });

    await loginWithCredentials(page, E2E_USERS.admin.email, E2E_USERS.admin.password);
    await page.waitForURL(/\/websites/, { timeout: 20_000 });
    await page.goto('/settings/users');

    const adminRow = page.locator('li').filter({ hasText: E2E_USERS.admin.email }).first();
    await expect(adminRow.locator('select[name="isActive"]')).toBeDisabled();

    await adminRow.locator('select[name="role"]').selectOption('MEMBER');
    await adminRow.getByRole('button', { name: /Сохранить/i }).click();
    await expect(
      page.getByText(/последнего активного администратора|Нельзя/i),
    ).toBeVisible({ timeout: 10_000 });

    await adminRow.locator('select[name="isActive"]').evaluate((el: HTMLSelectElement) => {
      el.disabled = false;
    });
    await adminRow.locator('select[name="isActive"]').selectOption('0');
    await adminRow.getByRole('button', { name: /Сохранить/i }).click();
    await expect(
      page.getByText(/последнего активного администратора|Нельзя/i),
    ).toBeVisible({ timeout: 10_000 });

    collector.assertClean();
    collector.dispose();
  });
});
