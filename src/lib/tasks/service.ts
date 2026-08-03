import {
  EventCategory,
  EventSource,
  Prisma,
  TaskPriority,
  TaskStatus,
  type WebsiteTask,
} from '@prisma/client';
import { resolveActorLabel } from '@/lib/auth/actor-label';
import { EVENT_TYPE_TASK_COMPLETED } from '@/lib/constants';
import { dateOnlyToInputValue } from '@/lib/dates/date-only';
import { prisma } from '@/lib/db/prisma';
import {
  classifyTaskDue,
  daysUntilDue,
  formatDueRelative,
  isOpenTaskStatus,
  isUpcomingWithinDays,
  isWebsiteSelectableForNewTask,
  OPEN_TASK_STATUSES,
  resolveCompleteTaskDecision,
  sortOpenTasks,
  taskCompletedDedupeKey,
} from '@/lib/tasks/classify';
import type {
  DashboardTaskItem,
  OverdueTasksByWebsite,
  TaskFilters,
  TaskFocus,
  TaskListItem,
  TasksPageData,
  TaskSummary,
  WebsiteOption,
  WebsiteTasksBlockData,
} from '@/lib/tasks/types';
import {
  taskCompleteSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from '@/lib/validations/task';
import { WebsiteNotFoundError } from '@/lib/websites/service';

const VALID_FOCUS = new Set<TaskFocus>([
  'open',
  'overdue',
  'today',
  'upcoming',
  'no_due',
  'in_progress',
  'done',
  'canceled',
  'mine',
]);

const VALID_PRIORITY = new Set<TaskPriority>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const VALID_STATUS = new Set<TaskStatus>(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELED']);

const taskUserSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const taskInclude = {
  website: {
    select: {
      id: true,
      domain: true,
      name: true,
      group: true,
      archivedAt: true,
    },
  },
  createdByUser: { select: taskUserSelect },
  assignedToUser: { select: taskUserSelect },
  completedByUser: { select: taskUserSelect },
} as const;

export class TaskNotFoundError extends Error {
  constructor(message = 'Задача не найдена') {
    super(message);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskStateError';
  }
}

export function parseTaskFilters(
  searchParams: Record<string, string | string[] | undefined>,
): TaskFilters {
  const raw = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  };

  const focusRaw = raw('focus');
  const priorityRaw = raw('priority');
  const statusRaw = raw('status');
  const actionRaw = raw('action');

  return {
    focus: VALID_FOCUS.has(focusRaw as TaskFocus) ? (focusRaw as TaskFocus) : 'open',
    q: raw('q'),
    websiteId: raw('websiteId'),
    group: raw('group'),
    priority: VALID_PRIORITY.has(priorityRaw as TaskPriority)
      ? (priorityRaw as TaskPriority)
      : '',
    status: VALID_STATUS.has(statusRaw as TaskStatus) ? (statusRaw as TaskStatus) : '',
    action: actionRaw === 'create' ? 'create' : '',
    assignedToUserId: raw('assignedToUserId'),
    createdByUserId: raw('createdByUserId'),
  };
}

export function buildTasksQuery(filters: Partial<TaskFilters>): string {
  const params = new URLSearchParams();
  if (filters.focus && filters.focus !== 'open') params.set('focus', filters.focus);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.websiteId) params.set('websiteId', filters.websiteId);
  if (filters.group) params.set('group', filters.group);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  if (filters.assignedToUserId) params.set('assignedToUserId', filters.assignedToUserId);
  if (filters.createdByUserId) params.set('createdByUserId', filters.createdByUserId);
  if (filters.action === 'create') params.set('action', 'create');
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : '/tasks';
}

type TaskUserLite = { id: string; name: string; email: string };

type TaskWithWebsite = WebsiteTask & {
  website: {
    id: string;
    domain: string;
    name: string | null;
    group: string | null;
    archivedAt: Date | null;
  };
  createdByUser?: TaskUserLite | null;
  assignedToUser?: TaskUserLite | null;
  completedByUser?: TaskUserLite | null;
};

function toListItem(task: TaskWithWebsite, now: Date): TaskListItem {
  return {
    id: task.id,
    websiteId: task.websiteId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    dueBucket: classifyTaskDue(task.dueAt, now),
    dueRelative: formatDueRelative(task.dueAt, now),
    daysUntil: daysUntilDue(task.dueAt, now),
    createdByUserId: task.createdByUserId,
    assignedToUserId: task.assignedToUserId,
    completedByUserId: task.completedByUserId,
    createdByLabel: resolveActorLabel({
      user: task.createdByUser,
      legacy: task.createdBy,
    }),
    assignedToLabel: task.assignedToUser
      ? resolveActorLabel({ user: task.assignedToUser })
      : null,
    completedByLabel: task.completedByUser
      ? resolveActorLabel({ user: task.completedByUser })
      : null,
    website: task.website,
  };
}

function matchesFocus(item: TaskListItem, focus: TaskFocus, now: Date, currentUserId?: string): boolean {
  switch (focus) {
    case 'open':
      return isOpenTaskStatus(item.status);
    case 'overdue':
      return isOpenTaskStatus(item.status) && item.dueBucket === 'overdue';
    case 'today':
      return isOpenTaskStatus(item.status) && item.dueBucket === 'today';
    case 'upcoming':
      return (
        isOpenTaskStatus(item.status) && isUpcomingWithinDays(item.dueAt, 7, now)
      );
    case 'no_due':
      return isOpenTaskStatus(item.status) && item.dueBucket === 'none';
    case 'in_progress':
      return item.status === 'IN_PROGRESS';
    case 'done':
      return item.status === 'DONE';
    case 'canceled':
      return item.status === 'CANCELED';
    case 'mine':
      return (
        isOpenTaskStatus(item.status) &&
        Boolean(currentUserId) &&
        item.assignedToUserId === currentUserId
      );
    default:
      return true;
  }
}

function filterTaskItems(
  items: TaskListItem[],
  filters: TaskFilters,
  now: Date,
): TaskListItem[] {
  const q = filters.q.trim().toLowerCase();
  return items.filter((item) => {
    if (!matchesFocus(item, filters.focus, now, filters.currentUserId)) return false;
    if (filters.websiteId && item.websiteId !== filters.websiteId) return false;
    if (filters.group && (item.website.group ?? '') !== filters.group) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.assignedToUserId && item.assignedToUserId !== filters.assignedToUserId) {
      return false;
    }
    if (filters.createdByUserId && item.createdByUserId !== filters.createdByUserId) {
      return false;
    }
    if (q) {
      const hay = `${item.title} ${item.description ?? ''} ${item.website.domain} ${item.website.name ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function buildSummary(items: TaskListItem[], now: Date, currentUserId?: string): TaskSummary {
  const open = items.filter((i) => isOpenTaskStatus(i.status));
  return {
    overdue: open.filter((i) => i.dueBucket === 'overdue').length,
    today: open.filter((i) => i.dueBucket === 'today').length,
    upcoming7: open.filter((i) => isUpcomingWithinDays(i.dueAt, 7, now)).length,
    noDue: open.filter((i) => i.dueBucket === 'none').length,
    inProgress: items.filter((i) => i.status === 'IN_PROGRESS').length,
    done: items.filter((i) => i.status === 'DONE').length,
    mine: open.filter((i) => currentUserId && i.assignedToUserId === currentUserId).length,
  };
}

export async function listActiveWebsitesForTasks(): Promise<WebsiteOption[]> {
  const rows = await prisma.website.findMany({
    where: {
      archivedAt: null,
      status: { not: 'ARCHIVED' },
    },
    select: { id: true, domain: true, name: true, group: true },
    orderBy: { domain: 'asc' },
  });
  return rows;
}

export async function getTasksPageData(
  searchParams: Record<string, string | string[] | undefined> = {},
  options: { now?: Date; currentUserId?: string } = {},
): Promise<TasksPageData> {
  const now = options.now ?? new Date();
  const filters: TaskFilters = {
    ...parseTaskFilters(searchParams),
    currentUserId: options.currentUserId,
  };

  const [tasks, websites, users] = await Promise.all([
    prisma.websiteTask.findMany({
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    }),
    listActiveWebsitesForTasks(),
    prisma.user.findMany({
      where: { isActive: true },
      select: taskUserSelect,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    }),
  ]);

  const items = tasks.map((task) => toListItem(task, now));
  const openSorted = sortOpenTasks(
    items.filter((i) => isOpenTaskStatus(i.status)),
    now,
  );
  const closed = items
    .filter((i) => !isOpenTaskStatus(i.status))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const ordered = [...openSorted, ...closed];
  const filteredItems = filterTaskItems(ordered, filters, now);

  const groups = [
    ...new Set(
      websites.map((w) => w.group).filter((g): g is string => Boolean(g && g.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ru'));

  return {
    summary: buildSummary(items, now, options.currentUserId),
    items: ordered,
    filteredItems,
    filters,
    websites,
    groups,
    users,
  };
}

export async function getWebsiteTasksBlock(
  websiteId: string,
  now: Date = new Date(),
): Promise<WebsiteTasksBlockData> {
  const tasks = await prisma.websiteTask.findMany({
    where: { websiteId },
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
  });

  const items = tasks.map((task) => toListItem(task, now));
  return {
    openTasks: sortOpenTasks(
      items.filter((i) => isOpenTaskStatus(i.status)),
      now,
    ),
    recentDone: items.filter((i) => i.status === 'DONE').slice(0, 5),
  };
}

export async function listOpenTasksForDashboard(
  now: Date = new Date(),
): Promise<{
  summary: { overdue: number; today: number };
  upcoming: DashboardTaskItem[];
  overdueByWebsite: OverdueTasksByWebsite;
}> {
  const tasks = await prisma.websiteTask.findMany({
    where: { status: { in: OPEN_TASK_STATUSES } },
    include: {
      website: {
        select: { id: true, domain: true, name: true, group: true, archivedAt: true },
      },
    },
  });

  const items = sortOpenTasks(
    tasks.map((task) => toListItem(task, now)),
    now,
  );

  const overdueByWebsite: OverdueTasksByWebsite = new Map();
  for (const item of items) {
    if (item.dueBucket !== 'overdue') continue;
    if (item.website.archivedAt) continue;
    const existing = overdueByWebsite.get(item.websiteId) ?? {
      count: 0,
      priorities: [],
    };
    existing.count += 1;
    existing.priorities.push(item.priority);
    overdueByWebsite.set(item.websiteId, existing);
  }

  const upcomingSource = items.filter(
    (i) =>
      i.dueBucket === 'overdue' ||
      i.dueBucket === 'today' ||
      isUpcomingWithinDays(i.dueAt, 7, now),
  );

  return {
    summary: {
      overdue: items.filter((i) => i.dueBucket === 'overdue').length,
      today: items.filter((i) => i.dueBucket === 'today').length,
    },
    upcoming: upcomingSource.slice(0, 10).map((item) => ({
      id: item.id,
      websiteId: item.websiteId,
      title: item.title,
      priority: item.priority,
      status: item.status,
      dueAt: item.dueAt,
      dueRelative: item.dueRelative,
      dueBucket: item.dueBucket,
      domain: item.website.domain,
    })),
    overdueByWebsite,
  };
}

function formDataToObject(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

async function assertWebsiteExists(websiteId: string, options?: { allowArchived?: boolean }) {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) throw new WebsiteNotFoundError(websiteId);
  if (!options?.allowArchived && !isWebsiteSelectableForNewTask(website)) {
    throw new TaskStateError('Архивный сайт нельзя выбрать для новой задачи');
  }
  return website;
}

export async function createWebsiteTask(
  raw: unknown,
  options: {
    actor: { userId: string; label: string };
  },
): Promise<WebsiteTask> {
  const data = taskCreateSchema.parse(raw);
  // Ignore any forged author fields from the client.
  await assertWebsiteExists(data.websiteId);

  let assignedToUserId: string | null = options.actor.userId;
  if (data.assignedToUserId === 'none') {
    assignedToUserId = null;
  } else if (data.assignedToUserId !== 'self') {
    const assignee = await prisma.user.findFirst({
      where: { id: data.assignedToUserId, isActive: true },
      select: { id: true },
    });
    if (!assignee) throw new TaskStateError('Исполнитель не найден или отключён');
    assignedToUserId = assignee.id;
  }

  return prisma.websiteTask.create({
    data: {
      websiteId: data.websiteId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      dueAt: data.dueAt,
      createdBy: options.actor.label,
      createdByUserId: options.actor.userId,
      assignedToUserId,
    },
  });
}

export async function createWebsiteTaskFromForm(
  formData: FormData,
  options: { actor: { userId: string; label: string } },
): Promise<WebsiteTask> {
  return createWebsiteTask(formDataToObject(formData), options);
}

export async function updateWebsiteTask(
  taskId: string,
  raw: unknown,
  options?: { actorUserId?: string },
): Promise<WebsiteTask> {
  const existing = await prisma.websiteTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new TaskNotFoundError();
  if (!isOpenTaskStatus(existing.status)) {
    throw new TaskStateError('Изменять можно только открытые задачи');
  }

  const data = taskUpdateSchema.parse(raw);
  let assignedToUserId = existing.assignedToUserId;
  if (data.assignedToUserId != null) {
    if (data.assignedToUserId === 'none') {
      assignedToUserId = null;
    } else if (data.assignedToUserId === 'self') {
      assignedToUserId = options?.actorUserId ?? existing.assignedToUserId;
    } else {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedToUserId, isActive: true },
        select: { id: true },
      });
      if (!assignee) throw new TaskStateError('Исполнитель не найден или отключён');
      assignedToUserId = assignee.id;
    }
  }

  return prisma.websiteTask.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      dueAt: data.dueAt,
      assignedToUserId,
    },
  });
}

export async function updateWebsiteTaskFromForm(
  taskId: string,
  formData: FormData,
  options?: { actorUserId?: string },
): Promise<WebsiteTask> {
  return updateWebsiteTask(taskId, formDataToObject(formData), options);
}

export async function getWebsiteTaskAuthFields(taskId: string): Promise<{
  id: string;
  websiteId: string;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  status: TaskStatus;
} | null> {
  return prisma.websiteTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      websiteId: true,
      createdByUserId: true,
      assignedToUserId: true,
      status: true,
    },
  });
}

export async function startWebsiteTask(taskId: string): Promise<WebsiteTask> {
  const existing = await prisma.websiteTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new TaskNotFoundError();
  if (existing.status === 'DONE' || existing.status === 'CANCELED') {
    throw new TaskStateError('Нельзя взять в работу завершённую или отменённую задачу');
  }
  if (existing.status === 'IN_PROGRESS') return existing;

  return prisma.websiteTask.update({
    where: { id: taskId },
    data: { status: TaskStatus.IN_PROGRESS },
  });
}

export async function cancelWebsiteTask(taskId: string): Promise<WebsiteTask> {
  const existing = await prisma.websiteTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new TaskNotFoundError();
  if (existing.status === 'DONE') {
    throw new TaskStateError('Выполненную задачу нельзя отменить');
  }
  if (existing.status === 'CANCELED') return existing;

  return prisma.websiteTask.update({
    where: { id: taskId },
    data: { status: TaskStatus.CANCELED },
  });
}

export type CompleteTaskResult = {
  task: WebsiteTask;
  eventCreated: boolean;
  alreadyDone: boolean;
};

/**
 * Completes a task, writes WebsiteEvent, updates lastWorkAt — one transaction.
 * Idempotent: second call on DONE returns safely without a second event.
 */
export async function completeWebsiteTask(
  taskId: string,
  raw: unknown,
  options: {
    actor: { userId: string; label: string };
    now?: Date;
  },
): Promise<CompleteTaskResult> {
  const input = taskCompleteSchema.parse(raw ?? {});
  const now = options.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.websiteTask.findUnique({ where: { id: taskId } });
    if (!existing) throw new TaskNotFoundError();

    if (existing.status === 'DONE') {
      return { task: existing, eventCreated: false, alreadyDone: true };
    }
    const decision = resolveCompleteTaskDecision(existing.status);
    if (decision === 'reject_canceled') {
      throw new TaskStateError('Отменённую задачу нельзя выполнить');
    }

    const completedAt = now;
    const task = await tx.websiteTask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.DONE,
        completedAt,
        result: input.result ?? null,
        completedByUserId: options.actor.userId,
      },
    });

    await tx.website.update({
      where: { id: task.websiteId },
      data: { lastWorkAt: completedAt },
    });

    let eventCreated = true;
    try {
      await tx.websiteEvent.create({
        data: {
          websiteId: task.websiteId,
          eventType: EVENT_TYPE_TASK_COMPLETED,
          category: EventCategory.NOTE,
          source: EventSource.MANUAL,
          sourceSystem: 'LOW',
          title: `Выполнена задача: ${task.title}`,
          description: input.result ?? task.description ?? null,
          occurredAt: completedAt,
          createdBy: options.actor.label,
          createdByUserId: options.actor.userId,
          dedupeKey: taskCompletedDedupeKey(task.id),
          metadata: {
            taskId: task.id,
            priority: task.priority,
            dueAt: task.dueAt ? dateOnlyToInputValue(task.dueAt) : null,
            result: input.result ?? null,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        eventCreated = false;
      } else {
        throw error;
      }
    }

    return { task, eventCreated, alreadyDone: false };
  });
}

export async function completeWebsiteTaskFromForm(
  taskId: string,
  formData: FormData,
  options: { actor: { userId: string; label: string } },
): Promise<CompleteTaskResult> {
  return completeWebsiteTask(taskId, formDataToObject(formData), options);
}

export function isTaskNotFoundError(error: unknown): error is TaskNotFoundError {
  return error instanceof TaskNotFoundError;
}

export function isTaskStateError(error: unknown): error is TaskStateError {
  return error instanceof TaskStateError;
}
