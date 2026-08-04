import { TASK_PRIORITY_RANK, classifyTaskDue, isOpenTaskStatus } from '@/lib/tasks/classify';
import type { TaskListItem } from '@/lib/tasks/types';
import { toDateOnlyUtc } from '@/lib/dates/date-only';

export type TaskSections = {
  overdue: TaskListItem[];
  today: TaskListItem[];
  upcoming: TaskListItem[];
  noDue: TaskListItem[];
};

export type DoneTaskSections = {
  today: TaskListItem[];
  earlier: TaskListItem[];
};

function dueTime(dueAt: Date): number {
  return toDateOnlyUtc(dueAt).getTime();
}

function compareByDuePriorityCreated(a: TaskListItem, b: TaskListItem): number {
  if (a.dueAt && b.dueAt) {
    const dueCmp = dueTime(a.dueAt) - dueTime(b.dueAt);
    if (dueCmp !== 0) return dueCmp;
  }
  const pr = TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority];
  if (pr !== 0) return pr;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

function compareNoDue(a: TaskListItem, b: TaskListItem): number {
  const statusRank = (status: TaskListItem['status']) => (status === 'IN_PROGRESS' ? 0 : 1);
  const sr = statusRank(a.status) - statusRank(b.status);
  if (sr !== 0) return sr;
  const pr = TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority];
  if (pr !== 0) return pr;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * Split open tasks into four mutually exclusive due sections.
 * Uses date-only UTC helpers via classifyTaskDue — never browser local midnight.
 */
export function partitionOpenTasks(
  items: TaskListItem[],
  now: Date = new Date(),
): TaskSections {
  const overdue: TaskListItem[] = [];
  const today: TaskListItem[] = [];
  const upcoming: TaskListItem[] = [];
  const noDue: TaskListItem[] = [];

  for (const item of items) {
    if (!isOpenTaskStatus(item.status)) continue;
    const bucket = classifyTaskDue(item.dueAt, now);
    if (bucket === 'overdue') overdue.push(item);
    else if (bucket === 'today') today.push(item);
    else if (bucket === 'upcoming') upcoming.push(item);
    else noDue.push(item);
  }

  overdue.sort(compareByDuePriorityCreated);
  today.sort(compareByDuePriorityCreated);
  upcoming.sort(compareByDuePriorityCreated);
  noDue.sort(compareNoDue);

  return { overdue, today, upcoming, noDue };
}

export function partitionDoneTasks(
  items: TaskListItem[],
  now: Date = new Date(),
): DoneTaskSections {
  const todayBucket: TaskListItem[] = [];
  const earlier: TaskListItem[] = [];
  const todayStart = toDateOnlyUtc(now).getTime();

  for (const item of items) {
    if (item.status !== 'DONE') continue;
    const completed = item.completedAt ? toDateOnlyUtc(item.completedAt).getTime() : null;
    if (completed != null && completed === todayStart) todayBucket.push(item);
    else earlier.push(item);
  }

  const byCompletedDesc = (a: TaskListItem, b: TaskListItem) =>
    (b.completedAt?.getTime() ?? b.updatedAt.getTime()) -
    (a.completedAt?.getTime() ?? a.updatedAt.getTime());

  todayBucket.sort(byCompletedDesc);
  earlier.sort(byCompletedDesc);
  return { today: todayBucket, earlier };
}

export function countOpenInSections(sections: TaskSections): number {
  return (
    sections.overdue.length +
    sections.today.length +
    sections.upcoming.length +
    sections.noDue.length
  );
}
