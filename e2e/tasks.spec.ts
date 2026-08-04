import { test, expect } from '@playwright/test';
import {
  assertDatabaseReady,
  attachBrowserErrorCollector,
  expectNoHorizontalOverflow,
  openWebsiteByDomain,
  E2E_SITES,
  E2E_USERS,
} from './helpers';

test.describe('tasks', () => {
  test.beforeEach(async ({ page }) => {
    await assertDatabaseReady(page);
  });

  test('workspace tabs default to mine with three primary tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Задачи', level: 1 })).toBeVisible();

    const tabs = page.getByRole('navigation', { name: 'Вкладки задач' });
    await expect(tabs.getByRole('link')).toHaveCount(3);
    await expect(tabs.getByRole('link', { name: /Мои/ })).toHaveAttribute('aria-current', 'page');
    await expect(tabs.getByRole('link', { name: /Открытые/ })).toHaveCount(0);

    const tabBox = await tabs.boundingBox();
    expect(tabBox).toBeTruthy();
    const overflow = await tabs.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);

    await tabs.getByRole('link', { name: /Все/ }).click();
    await expect(page).toHaveURL(/focus=open/);
    await expect(page.getByRole('heading', { name: 'Просрочено' }).or(page.getByText('Открытых задач нет.'))).toBeVisible();

    await tabs.getByRole('link', { name: /Готово|Выполненные/ }).click();
    await expect(page).toHaveURL(/focus=done/);
    await expect(page.getByText('E2E DONE by admin')).toBeVisible();
  });

  test('open tasks land in exclusive due sections once', async ({ page }) => {
    await page.goto('/tasks?focus=open');
    const overdue = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Просрочено' }) });
    const today = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Сегодня' }) });
    const upcoming = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Ближайшие' }) });
    const noDue = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Без срока' }) });

    await expect(overdue.getByText('E2E overdue task')).toBeVisible();
    await expect(today.getByText('E2E due today')).toBeVisible();
    await expect(upcoming.getByText('E2E upcoming task')).toBeVisible();
    await expect(noDue.getByText('E2E TODO no due')).toBeVisible();

    await expect(page.locator('[data-task-id]').filter({ hasText: 'E2E overdue task' })).toHaveCount(1);
    await expect(page.locator('[data-task-id]').filter({ hasText: 'E2E due today' })).toHaveCount(1);
  });

  test('quick create on /tasks keeps site and clears title', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tasks');

    const form = page
      .locator('form')
      .filter({ has: page.getByPlaceholder('Что нужно сделать?') })
      .first();
    const site = form.locator('select[name="websiteId"]');
    await site.selectOption({ label: E2E_SITES.nextStage.domain });
    const selected = await site.inputValue();
    const title = form.getByPlaceholder('Что нужно сделать?');
    const addBtn = form.getByRole('button', { name: /Добавить/ });
    const widthBefore = await addBtn.evaluate((el) => el.getBoundingClientRect().width);
    const beforeY = await page.evaluate(() => window.scrollY);
    const unique = `E2E workspace ${Date.now()}`;

    await title.fill(unique);
    await addBtn.dblclick();
    await expect(page.getByText('Добавлено').first()).toBeVisible();
    await expect(title).toHaveValue('');
    await expect(title).toBeFocused();
    await expect(site).toHaveValue(selected);
    await expect(page.locator('[data-task-id]').filter({ hasText: unique })).toHaveCount(1);
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThanOrEqual(beforeY + 80);
    await expect(page.getByText('Добавлено').first()).toBeHidden({ timeout: 5000 });
    const widthAfter = await addBtn.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(2);

    collector.assertClean();
    collector.dispose();
  });

  test('quick create keeps layout stable and attributes author', async ({ page }) => {
    const collector = attachBrowserErrorCollector(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    // Use a site with few/no open tasks so the new card stays in the visible list.
    await openWebsiteByDomain(page, E2E_SITES.favoriteCandidate.domain);

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

    const row = page.locator('[data-task-id]').filter({ hasText: unique }).first();
    await expect(row).toBeVisible();
    // Current user as assignee renders as «Вы» across /tasks and profile rows.
    await expect(row.getByText('Вы', { exact: true })).toBeVisible();

    collector.assertClean();
    collector.dispose();
  });

  test('complete is direct; edit opens dialog outside menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tasks?focus=mine');

    const row = page.locator('[data-task-id]').filter({ hasText: 'E2E ADMIN owned open' }).first();
    await expect(row).toBeVisible();
    const complete = row.getByRole('button', { name: /Выполнить/ });
    await expect(complete).toBeVisible();
    const box = await complete.boundingBox();
    expect(box).toBeTruthy();
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(36);

    await row.getByRole('button', { name: 'Дополнительные действия' }).click();
    const menu = page.locator('[role="menu"]').first();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'В работу' })).toBeVisible();
    await expect(menu.locator('form input[name="title"]')).toHaveCount(0);
    await menu.getByRole('button', { name: 'Редактировать' }).click();
    await expect(menu).toBeHidden();

    const dialog = page.getByRole('dialog', { name: 'Редактировать задачу' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="title"]')).toBeFocused();
    const renamed = `E2E ADMIN owned open edited ${Date.now()}`;
    await dialog.locator('input[name="title"]').fill(renamed);
    await dialog.getByRole('button', { name: 'Сохранить' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(renamed)).toBeVisible();

    await page.locator('[data-task-id]').filter({ hasText: renamed }).first()
      .getByRole('button', { name: 'Дополнительные действия' })
      .click();
    await page.getByRole('button', { name: 'Редактировать' }).click();
    await expect(page.getByRole('dialog', { name: 'Редактировать задачу' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Редактировать задачу' })).toBeHidden();
  });

  test('start and complete task records completer; action menu works', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWebsiteByDomain(page, E2E_SITES.complete.domain);

    const row = page.locator('li').filter({ hasText: 'E2E TODO with due' }).first();
    await expect(row).toBeVisible();

    const menuBtn = row.getByRole('button', { name: 'Дополнительные действия' });
    await menuBtn.click();
    const menu = page.locator('[role="menu"]').first();
    await expect(menu).toBeVisible();
    await expect
      .poll(async () => {
        const menuBox = await menu.boundingBox();
        if (!menuBox) return false;
        return menuBox.x >= -1 && menuBox.x + menuBox.width <= 391;
      })
      .toBeTruthy();
    await page.getByRole('button', { name: 'В работу' }).click();

    await expect(
      page.locator('#tasks li').filter({ hasText: 'E2E TODO with due' }).getByText('В работе'),
    ).toBeVisible({ timeout: 15_000 });

    const inProgress = page.locator('#tasks li').filter({ hasText: 'E2E TODO with due' }).first();
    await inProgress.getByRole('button', { name: /Выполнить/ }).click();
    await expect(page.locator('#tasks li').filter({ hasText: 'E2E TODO with due' })).toHaveCount(0, {
      timeout: 15_000,
    });

    await expect(
      page.locator('#life-tree').getByText('E2E TODO with due', { exact: true }),
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
    await form.getByRole('button', { name: /Добавить/ }).dblclick();
    await expect(page.getByText('Добавлено').first()).toBeVisible();
    await expect(page.locator('#tasks li').filter({ hasText: unique })).toHaveCount(1, {
      timeout: 15_000,
    });
  });

  test('admin can edit any seeded open task from dialog', async ({ page }) => {
    await page.goto('/tasks?focus=open');
    const row = page.locator('[data-task-id]').filter({ hasText: 'E2E overdue task' }).first();
    await row.getByRole('button', { name: 'Дополнительные действия' }).click();
    await page.getByRole('button', { name: 'Редактировать' }).click();
    const dialog = page.getByRole('dialog', { name: 'Редактировать задачу' });
    await expect(dialog).toBeVisible();
    const next = `E2E overdue task ${Date.now()}`;
    await dialog.locator('input[name="title"]').fill(next);
    await dialog.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByText(next)).toBeVisible({ timeout: 15_000 });
  });

  test('/tasks responsive touch targets and dialog fit', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/tasks');
      await expectNoHorizontalOverflow(page);
      const complete = page.getByRole('button', { name: /Выполнить/ }).first();
      if (await complete.count()) {
        const b = await complete.boundingBox();
        expect(b).toBeTruthy();
        if (width <= 390) {
          expect(Math.min(b!.width, b!.height)).toBeGreaterThanOrEqual(40);
        }
      }
      const menuBtn = page.getByRole('button', { name: 'Дополнительные действия' }).first();
      if (await menuBtn.count()) {
        await menuBtn.click();
        const menu = page.locator('[role="menu"]').first();
        await expect(menu).toBeVisible();
        const menuBox = await menu.boundingBox();
        expect(menuBox!.x).toBeGreaterThanOrEqual(-1);
        expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width + 1);
        await page.getByRole('button', { name: 'Редактировать' }).click();
        const dialog = page.getByRole('dialog', { name: 'Редактировать задачу' });
        await expect(dialog).toBeVisible();
        const dBox = await dialog.boundingBox();
        expect(dBox!.x).toBeGreaterThanOrEqual(-1);
        expect(dBox!.x + dBox!.width).toBeLessThanOrEqual(width + 1);
        await page.keyboard.press('Escape');
      }
    }
  });
});
