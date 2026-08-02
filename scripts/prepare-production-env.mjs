/**
 * Build production .env from local .env without printing secrets.
 * Usage: node scripts/prepare-production-env.mjs
 * Writes: .env.production.local (gitignored)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, '.env');
const outPath = path.join(root, '.env.production.local');

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    map.set(line.slice(0, idx).trim(), line.slice(idx + 1));
  }
  return map;
}

function isUnsafePlaceholder(value) {
  if (!value) return true;
  return /replace-with|ВАШ_EMAIL|ТОКЕН_ИЗ|change-me-low-db-password/i.test(value);
}

function requireKey(map, key) {
  const value = map.get(key)?.trim();
  if (!value) throw new Error(`Missing required key: ${key}`);
  return value;
}

const raw = fs.readFileSync(sourcePath, 'utf8');
const src = parseEnv(raw);

if (!src.get('POSTGRES_USER')?.trim()) {
  src.set('POSTGRES_USER', 'low');
}

const postgresUser = requireKey(src, 'POSTGRES_USER');
let postgresPassword = src.get('POSTGRES_PASSWORD')?.trim() || '';
if (!postgresPassword || isUnsafePlaceholder(postgresPassword)) {
  postgresPassword = crypto.randomBytes(24).toString('base64url');
  src.set('POSTGRES_PASSWORD', postgresPassword);
  console.log('Generated strong POSTGRES_PASSWORD for production');
}
const postgresDb = requireKey(src, 'POSTGRES_DB');
requireKey(src, 'ADMIN_EMAIL');
requireKey(src, 'ADMIN_PASSWORD');
let sessionSecret = src.get('SESSION_SECRET')?.trim();
if (!sessionSecret || sessionSecret.length < 16 || isUnsafePlaceholder(sessionSecret)) {
  sessionSecret = crypto.randomBytes(48).toString('hex');
  src.set('SESSION_SECRET', sessionSecret);
  console.log('Generated strong SESSION_SECRET for production');
}
requireKey(src, 'DSD_LOW_API_TOKEN');
requireKey(src, 'GSC_LOW_API_TOKEN');

let dsdBase = src.get('DSD_BASE_URL')?.trim() || '';
if (!dsdBase || /localhost|127\.0\.0\.1/i.test(dsdBase)) {
  dsdBase = 'https://dsd.liyu.bet';
}
src.set('DSD_BASE_URL', dsdBase.replace(/\/+$/, ''));

let gscBase = src.get('GSC_BASE_URL')?.trim() || '';
let workerEnabled = (src.get('WORKER_ENABLED') || 'true').trim();
if (!gscBase || /localhost|127\.0\.0\.1/i.test(gscBase)) {
  // Confirmed production URL from live deployment / DNS / prior health checks
  gscBase = 'https://gsc.liyu.bet';
}
src.set('GSC_BASE_URL', gscBase.replace(/\/+$/, ''));

src.set('NODE_ENV', 'production');
src.set('APP_URL', 'https://low.liyu.bet');
src.set('PORT', '8082');
src.set(
  'DATABASE_URL',
  `postgresql://${encodeURIComponent(postgresUser)}:${encodeURIComponent(postgresPassword)}@postgres:5432/${encodeURIComponent(postgresDb)}`,
);
src.set('WORKER_ENABLED', workerEnabled || 'true');

const orderedKeys = [
  'NODE_ENV',
  'APP_URL',
  'PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'SESSION_SECRET',
  'DSD_BASE_URL',
  'DSD_LOW_API_TOKEN',
  'DSD_REQUEST_TIMEOUT_MS',
  'DSD_SYNC_PAGE_SIZE',
  'GSC_BASE_URL',
  'GSC_LOW_API_TOKEN',
  'GSC_REQUEST_TIMEOUT_MS',
  'GSC_SYNC_PAGE_SIZE',
  'GSC_LIFECYCLE_CONCURRENCY',
  'GSC_LIFECYCLE_MAX_PROPERTIES_PER_RUN',
  'WORKER_ENABLED',
  'WORKER_TIMEZONE',
  'WORKER_STARTUP_DELAY_SECONDS',
  'WORKER_HEARTBEAT_INTERVAL_SECONDS',
  'WORKER_STALE_HEARTBEAT_SECONDS',
  'WORKER_SHUTDOWN_TIMEOUT_SECONDS',
  'WORKER_JOB_TIMEOUT_MINUTES',
  'WORKER_ERROR_BACKOFF_SECONDS',
  'WORKER_MAX_ERROR_BACKOFF_SECONDS',
  'DSD_SYNC_INTERVAL_MINUTES',
  'DSD_FULL_RECONCILIATION_HOUR',
  'GSC_PROPERTIES_SYNC_INTERVAL_HOURS',
  'GSC_FULL_RECONCILIATION_HOUR',
  'GSC_LIFECYCLE_SYNC_HOUR',
  'JOB_LOCK_DSD_TTL_MINUTES',
  'JOB_LOCK_GSC_PROPERTIES_TTL_MINUTES',
  'JOB_LOCK_GSC_LIFECYCLE_TTL_MINUTES',
];

const lines = ['# LOW production env — generated; do not commit', ''];
const used = new Set();
for (const key of orderedKeys) {
  const value = src.get(key);
  if (value == null || value === '') continue;
  if (isUnsafePlaceholder(value) && ['DSD_LOW_API_TOKEN', 'GSC_LOW_API_TOKEN'].includes(key)) {
    throw new Error(`Placeholder-like value for ${key}`);
  }
  lines.push(`${key}=${value}`);
  used.add(key);
}

const text = `${lines.join('\n')}\n`;

// Safety checks without printing values
if (/localhost|127\.0\.0\.1/.test(text.match(/^APP_URL=.*/m)?.[0] || '')) {
  throw new Error('APP_URL must not use localhost');
}
if (!/^APP_URL=https:\/\//m.test(text)) {
  throw new Error('APP_URL must be https');
}
if (!/^DATABASE_URL=postgresql:\/\/.+@postgres:5432\//m.test(text)) {
  throw new Error('DATABASE_URL must use host postgres:5432');
}
if (!/^DSD_BASE_URL=https:\/\//m.test(text)) {
  throw new Error('DSD_BASE_URL must be https');
}
if (!/^GSC_BASE_URL=https:\/\//m.test(text)) {
  throw new Error('GSC_BASE_URL must be https');
}

fs.writeFileSync(outPath, text, { mode: 0o600 });
try {
  fs.chmodSync(outPath, 0o600);
} catch {
  // Windows may ignore chmod
}

console.log('Wrote production env file (path omitted).');
console.log(`Keys written: ${used.size}`);
console.log(`DSD host: ${new URL(dsdBase).host}`);
console.log(`GSC host: ${new URL(gscBase).host}`);
console.log(`WORKER_ENABLED set: yes`);
