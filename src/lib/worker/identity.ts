import { hostname } from 'node:os';
import { randomBytes } from 'node:crypto';

export function createWorkerId(): string {
  const host = hostname().replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40) || 'host';
  const suffix = randomBytes(3).toString('hex');
  return `${host}-${process.pid}-${suffix}`;
}

/** Short form for UI — never expose full hostname/PID alone as the only signal. */
export function shortWorkerId(workerId: string): string {
  const parts = workerId.split('-');
  if (parts.length >= 2) {
    return parts.slice(-2).join('-');
  }
  return workerId.slice(-12);
}
