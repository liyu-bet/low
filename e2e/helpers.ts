import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function loginAsTestUser(page: Page) {
  const email = process.env.E2E_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.E2E_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_EMAIL/E2E_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD required for e2e');
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(websites|account)/, { timeout: 20_000 });
}
