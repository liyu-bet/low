import { prisma } from '@/lib/db/prisma';

export class JobLockBusyError extends Error {
  constructor(message = 'Синхронизация уже выполняется') {
    super(message);
    this.name = 'JobLockBusyError';
  }
}

export type AcquireJobLockResult =
  | { ok: true; lockId: string; owner: string; expiresAt: Date }
  | { ok: false; reason: 'busy'; owner: string | null; expiresAt: Date | null };

/**
 * Acquire a Postgres JobLock. Does not hold an open transaction during sync.
 * Expired locks (expiresAt <= now) may be taken over.
 */
export async function acquireJobLock(input: {
  lockId: string;
  owner: string;
  ttlMs: number;
  now?: Date;
}): Promise<AcquireJobLockResult> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + Math.max(1_000, input.ttlMs));

  const existing = await prisma.jobLock.findUnique({ where: { id: input.lockId } });
  if (existing && existing.expiresAt.getTime() > now.getTime() && existing.owner !== input.owner) {
    return {
      ok: false,
      reason: 'busy',
      owner: existing.owner,
      expiresAt: existing.expiresAt,
    };
  }

  if (!existing) {
    try {
      await prisma.jobLock.create({
        data: {
          id: input.lockId,
          lockedAt: now,
          expiresAt,
          owner: input.owner,
        },
      });
      return { ok: true, lockId: input.lockId, owner: input.owner, expiresAt };
    } catch {
      const raced = await prisma.jobLock.findUnique({ where: { id: input.lockId } });
      if (raced && raced.expiresAt.getTime() > now.getTime() && raced.owner !== input.owner) {
        return {
          ok: false,
          reason: 'busy',
          owner: raced.owner,
          expiresAt: raced.expiresAt,
        };
      }
    }
  }

  const updated = await prisma.jobLock.updateMany({
    where: {
      id: input.lockId,
      OR: [{ expiresAt: { lte: now } }, { owner: input.owner }],
    },
    data: {
      lockedAt: now,
      expiresAt,
      owner: input.owner,
    },
  });

  if (updated.count === 0) {
    const current = await prisma.jobLock.findUnique({ where: { id: input.lockId } });
    return {
      ok: false,
      reason: 'busy',
      owner: current?.owner ?? null,
      expiresAt: current?.expiresAt ?? null,
    };
  }

  return { ok: true, lockId: input.lockId, owner: input.owner, expiresAt };
}

/** Release lock only if owner matches (or lock is already expired). */
export async function releaseJobLock(input: {
  lockId: string;
  owner: string;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const result = await prisma.jobLock.deleteMany({
    where: {
      id: input.lockId,
      OR: [{ owner: input.owner }, { expiresAt: { lte: now } }],
    },
  });
  return result.count > 0;
}

export async function getActiveJobLock(lockId: string, now: Date = new Date()) {
  const row = await prisma.jobLock.findUnique({ where: { id: lockId } });
  if (!row) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;
  return row;
}
