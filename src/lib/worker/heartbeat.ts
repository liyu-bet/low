import { prisma } from '@/lib/db/prisma';

export type HeartbeatStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'disabled';

export async function upsertWorkerHeartbeat(input: {
  workerId: string;
  status: HeartbeatStatus;
  currentJob?: string | null;
  lastError?: string | null;
  version?: string | null;
  startedAt?: Date;
}) {
  const now = new Date();
  return prisma.workerHeartbeat.upsert({
    where: { workerId: input.workerId },
    create: {
      workerId: input.workerId,
      status: input.status,
      startedAt: input.startedAt ?? now,
      lastHeartbeatAt: now,
      currentJob: input.currentJob ?? null,
      lastError: input.lastError ?? null,
      version: input.version ?? null,
    },
    update: {
      status: input.status,
      lastHeartbeatAt: now,
      currentJob: input.currentJob === undefined ? undefined : input.currentJob,
      lastError: input.lastError === undefined ? undefined : input.lastError,
      version: input.version === undefined ? undefined : input.version,
    },
  });
}

export async function getLatestWorkerHeartbeat() {
  return prisma.workerHeartbeat.findFirst({
    orderBy: { lastHeartbeatAt: 'desc' },
  });
}

export type WorkerPresence = 'online' | 'stale' | 'offline';

export function classifyHeartbeatAge(input: {
  lastHeartbeatAt: Date | null | undefined;
  staleMs: number;
  now?: Date;
}): WorkerPresence {
  if (!input.lastHeartbeatAt) return 'offline';
  const now = input.now ?? new Date();
  const age = now.getTime() - input.lastHeartbeatAt.getTime();
  if (age <= input.staleMs) return 'online';
  if (age <= input.staleMs * 3) return 'stale';
  return 'offline';
}
