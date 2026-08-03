import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const VERSION = 'v1';

export class PasswordHashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordHashError';
  }
}

/**
 * Versioned scrypt hash: v1$<n>$<r>$<p>$<saltB64>$<hashB64>
 */
export function hashPassword(password: string): string {
  if (!password || password.length < 8) {
    throw new PasswordHashError('Пароль должен быть не короче 8 символов');
  }
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    VERSION,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 6) return false;
  const [version, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  if (version !== VERSION || !nRaw || !rRaw || !pRaw || !saltB64 || !hashB64) return false;

  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (N < 1024 || N > 1_048_576 || r < 1 || p < 1) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64url');
    expected = Buffer.from(hashB64, 'base64url');
  } catch {
    return false;
  }
  if (salt.length < 8 || expected.length < 16) return false;

  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length, { N, r, p });
  } catch {
    return false;
  }

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
