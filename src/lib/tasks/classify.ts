import type { TaskPriority, TaskStatus } from '@prisma/client';
import { daysBetweenUtc, toDateOnlyUtc, todayDateOnlyUtc } from '@/lib/dates/date-only';

export type TaskDueBucket = 'overdue' | 'today' | 'upcoming' | 'none';

export type TaskSortable = {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  createdAt: Date;
};

export const OPEN_TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS'];

export const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const BUCKET_RANK: Record<TaskDueBucket, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  none: 3,
};

export function isOpenTaskStatus(status: TaskStatus): boolean {
  return status === 'TODO' || status === 'IN_PROGRESS';
}

export function classifyTaskDue(
  dueAt: Date | null | undefined,
  now: Date = new Date(),
): TaskDueBucket {
  if (!dueAt) return 'none';
  const today = todayDateOnlyUtc(now);
  const due = toDateOnlyUtc(dueAt);
  const delta = daysBetweenUtc(today, due);
  if (delta < 0) return 'overdue';
  if (delta === 0) return 'today';
  return 'upcoming';
}

export function daysUntilDue(dueAt: Date | null | undefined, now: Date = new Date()): number | null {
  if (!dueAt) return null;
  return daysBetweenUtc(todayDateOnlyUtc(now), toDateOnlyUtc(dueAt));
}

export function formatDueRelative(dueAt: Date | null | undefined, now: Date = new Date()): string {
  const days = daysUntilDue(dueAt, now);
  if (days == null) return 'Без срока';
  if (days < 0) {
    const n = Math.abs(days);
    return `Просрочено на ${n} ${pluralDays(n)}`;
  }
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  return `Через ${days} ${pluralDays(days)}`;
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

/** Open-task sort: overdue → today → upcoming → none, then priority, then createdAt. */
export function compareOpenTasks(a: TaskSortable, b: TaskSortable, now: Date = new Date()): number {
  const bucketA = classifyTaskDue(a.dueAt, now);
  const bucketB = classifyTaskDue(b.dueAt, now);
  const br = BUCKET_RANK[bucketA] - BUCKET_RANK[bucketB];
  if (br !== 0) return br;

  const pr = TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority];
  if (pr !== 0) return pr;

  if (a.dueAt && b.dueAt) {
    const dueCmp = toDateOnlyUtc(a.dueAt).getTime() - toDateOnlyUtc(b.dueAt).getTime();
    if (dueCmp !== 0) return dueCmp;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function sortOpenTasks<T extends TaskSortable>(tasks: T[], now: Date = new Date()): T[] {
  return [...tasks].sort((a, b) => compareOpenTasks(a, b, now));
}

export function isUpcomingWithinDays(
  dueAt: Date | null | undefined,
  days: number,
  now: Date = new Date(),
): boolean {
  if (!dueAt) return false;
  const delta = daysUntilDue(dueAt, now);
  return delta != null && delta >= 1 && delta <= days;
}

export function overdueTaskAttentionPriority(
  priorities: TaskPriority[],
): 'critical' | 'high' | 'medium' | null {
  if (priorities.length === 0) return null;
  if (priorities.includes('CRITICAL')) return 'critical';
  if (priorities.includes('HIGH')) return 'high';
  return 'medium';
}

export function taskCompletedDedupeKey(taskId: string): string {
  return `task:completed:${taskId}`;
}

export function isWebsiteSelectableForNewTask(website: {
  archivedAt: Date | null;
  status: string;
}): boolean {
  return !website.archivedAt && website.status !== 'ARCHIVED';
}

/** Pure decision helper for completeTaskAction idempotency. */
export function resolveCompleteTaskDecision(
  status: TaskStatus,
): 'complete' | 'already_done' | 'reject_canceled' {
  if (status === 'DONE') return 'already_done';
  if (status === 'CANCELED') return 'reject_canceled';
  return 'complete';
}
