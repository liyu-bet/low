import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import {
  assertDatabaseReady,
  expectLoginSuccess,
  loginWithCredentials,
  E2E_USERS,
} from './helpers';

setup('authenticate as member', async ({ page }) => {
  fs.mkdirSync('.playwright', { recursive: true });
  await assertDatabaseReady(page);
  await loginWithCredentials(page, E2E_USERS.member.email, E2E_USERS.member.password);
  await expectLoginSuccess(page);
  await expect(page.getByText('Сайты').first()).toBeVisible();
  await page.context().storageState({ path: '.playwright/member.json' });
});
