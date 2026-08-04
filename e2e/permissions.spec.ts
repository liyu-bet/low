import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  ensureWebsiteFiltersOpen,
  openWebsiteByDomain,
  E2E_SITES,
  E2E_USERS,
} from './helpers';

test.describe('member permissions', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('member can use websites/tasks and cannot access admin surfaces', async ({
    page,
  }) => {
    const collector = attachBrowserErrorCollector(page);

    await page.goto('/websites');
    await expect(page.getByRole('heading', { name: 'Сайты', level: 1 })).toBeVisible();
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Задачи', level: 1 })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/websites');
    await page.getByRole('button', { name: 'Меню' }).click();
    await expect(page.getByRole('menuitem', { name: 'Пользователи' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto('/settings/users');
    await page.waitForURL(/\/websites/);
    expect(page.url()).not.toContain('/settings/users');

    await page.setViewportSize({ width: 1440, height: 900 });
    await openWebsiteByDomain(page, E2E_SITES.complete.domain);
    await expect(page.locator('details').filter({ hasText: 'Настройки' })).toHaveCount(0);

    const unique = `Member task ${Date.now()}`;
    const form = page
      .locator('#tasks form')
      .filter({ has: page.getByPlaceholder('Что нужно сделать?') })
      .first();
    await form.getByPlaceholder('Что нужно сделать?').fill(unique);
    await form.getByRole('button', { name: /Добавить/ }).click();
    await expect(page.getByText('Добавлено').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(unique)).toBeVisible({ timeout: 10_000 });

    const assigned = page.locator('li').filter({ hasText: 'E2E assigned to MEMBER' }).first();
    await expect(assigned).toBeVisible();
    await assigned.getByRole('button', { name: /Выполнить/ }).click();
    await expect(
      page.locator('#tasks li').filter({ hasText: 'E2E assigned to MEMBER' }),
    ).toHaveCount(0, { timeout: 15_000 });

    await openWebsiteByDomain(page, E2E_SITES.nextStage.domain);
    const foreign = page.locator('li').filter({ hasText: 'E2E foreign admin-only task' });
    await expect(foreign).toBeVisible();
    const menu = foreign.first().getByRole('button', { name: 'Дополнительные действия' });
    await menu.click();
    await page.getByText('Редактировать').click();
    await foreign.first().locator('input[name="title"]').fill('hacked by member');
    await foreign.first().getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByText(/Недостаточно прав|Нельзя изменить эту задачу|прав/i)).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/integrations');
    await page.waitForURL(/\/websites/);
    expect(page.url()).not.toContain('/integrations');

    collector.assertClean();
    collector.dispose();
  });

  test('member cannot archive or restore sites but can still use favorites', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    const domain = E2E_SITES.archivable.domain;

    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    const card = page.getByRole('listitem').filter({ hasText: domain });
    await expect(card).toBeVisible();

    // Archive/restore icon actions are ADMIN-only.
    await expect(card.getByRole('button', { name: 'Убрать из LOW' })).toHaveCount(0);

    await ensureWebsiteFiltersOpen(page);
    await page.getByRole('link', { name: 'Показать архив' }).click();
    await expect(page).toHaveURL(/archived=1/);
    await expect(page.getByRole('button', { name: 'Вернуть в LOW' })).toHaveCount(0);

    // Favorites are per-user and available to every role.
    await page.goto('/websites');
    await page.getByPlaceholder(/Поиск/i).fill(domain);
    await card.getByRole('button', { name: 'Добавить в избранное' }).click();
    await expect(card.getByRole('button', { name: 'Убрать из избранного' })).toBeVisible({
      timeout: 10_000,
    });

    // Leave no favorite behind so re-runs start from the same state.
    await card.getByRole('button', { name: 'Убрать из избранного' }).click();
    await expect(card.getByRole('button', { name: 'Добавить в избранное' })).toBeVisible({
      timeout: 10_000,
    });

    collector.assertClean();
    collector.dispose();
  });

  test('member can record manual work', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    await openWebsiteByDomain(page, E2E_SITES.complete.domain);

    const journal = page.locator('details').filter({ hasText: 'Полный журнал' }).first();
    await journal.locator('summary').click();

    const noteTitle = `Member note ${Date.now()}`;
    const eventForm = page.locator('form').filter({ hasText: 'Записать работу' }).first();
    await eventForm.locator('input[name="title"], textarea[name="title"]').first().fill(noteTitle);
    await eventForm.getByRole('button', { name: /Добавить событие/i }).click();
    await expect(page.getByText(noteTitle).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(E2E_USERS.member.name).first()).toBeVisible();

    collector.assertClean();
    collector.dispose();
  });
});
