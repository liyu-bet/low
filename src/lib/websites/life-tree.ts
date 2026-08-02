import type { EventCategory, EventSource, TaskStatus } from '@prisma/client';
import {
  EVENT_TYPE_GSC_FIRST_CLICK,
  EVENT_TYPE_GSC_FIRST_CLICK_REFINED,
  EVENT_TYPE_GSC_FIRST_IMPRESSION,
  EVENT_TYPE_GSC_FIRST_IMPRESSION_REFINED,
  EVENT_TYPE_GSC_PROPERTY_FIRST_SEEN,
  EVENT_TYPE_SITE_CREATED,
  EVENT_TYPE_SITE_HEALTHY,
  EVENT_TYPE_TASK_COMPLETED,
} from '@/lib/constants';
import {
  buildWebsiteMilestones,
  type MilestoneWebsite,
} from '@/lib/websites/milestones';

export type WebsiteLifeNodeKind =
  | 'milestone'
  | 'work'
  | 'completed_task'
  | 'open_task'
  | 'note';

export type WebsiteLifeNode = {
  id: string;
  kind: WebsiteLifeNodeKind;
  date: Date | null;
  title: string;
  description?: string | null;
  source: 'automatic' | 'manual';
  status?: 'completed' | 'in_progress' | 'planned';
  href?: string;
};

export type LifeTreeTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type LifeTreeEvent = {
  id: string;
  eventType: string;
  category: EventCategory;
  title: string;
  description: string | null;
  source: EventSource;
  occurredAt: Date;
};

const MILESTONE_EVENT_TYPES = new Set([
  EVENT_TYPE_SITE_CREATED,
  EVENT_TYPE_SITE_HEALTHY,
  EVENT_TYPE_GSC_PROPERTY_FIRST_SEEN,
  EVENT_TYPE_GSC_FIRST_IMPRESSION,
  EVENT_TYPE_GSC_FIRST_IMPRESSION_REFINED,
  EVENT_TYPE_GSC_FIRST_CLICK,
  EVENT_TYPE_GSC_FIRST_CLICK_REFINED,
  'launch',
  'SITE_LAUNCHED',
]);

const WORK_EVENT_TYPES = new Set(['work', 'technical', 'seo', 'content', 'note']);

function isMeaningfulManualEvent(event: LifeTreeEvent): boolean {
  if (event.source !== 'MANUAL') return false;
  if (event.eventType === EVENT_TYPE_TASK_COMPLETED) return false;
  if (MILESTONE_EVENT_TYPES.has(event.eventType)) return false;
  if (event.eventType.startsWith('DATE_OVERRIDE')) return false;

  if (WORK_EVENT_TYPES.has(event.eventType)) return true;
  if (
    event.category === 'TECHNICAL' ||
    event.category === 'SEO' ||
    event.category === 'CONTENT'
  ) {
    return true;
  }
  if (event.category === 'NOTE') {
    return Boolean(event.title.trim() || event.description?.trim());
  }
  return event.eventType === 'work' || event.eventType === 'note';
}

function sortByDateAsc(a: WebsiteLifeNode, b: WebsiteLifeNode): number {
  const at = a.date?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.date?.getTime() ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  return a.title.localeCompare(b.title, 'ru');
}

function sortOpenTasks(a: LifeTreeTask, b: LifeTreeTask): number {
  if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
  if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
  const ad = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bd = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Build past + future life-tree nodes from existing website data.
 * Deduplicates milestone facts and completed-task events.
 */
export function buildWebsiteLifeTree(input: {
  website: MilestoneWebsite;
  tasks: LifeTreeTask[];
  events: LifeTreeEvent[];
}): { past: WebsiteLifeNode[]; future: WebsiteLifeNode[] } {
  const milestones = buildWebsiteMilestones(input.website);
  const past: WebsiteLifeNode[] = [];

  for (const m of milestones) {
    if (!m.reached || !m.date) continue;
    past.push({
      id: `milestone:${m.key}`,
      kind: 'milestone',
      date: m.date,
      title: milestoneTitle(m.key),
      source: 'automatic',
      status: 'completed',
    });
  }

  for (const task of input.tasks) {
    if (task.status !== 'DONE') continue;
    past.push({
      id: `task-done:${task.id}`,
      kind: 'completed_task',
      date: task.completedAt ?? task.createdAt,
      title: task.title,
      description: task.description,
      source: 'manual',
      status: 'completed',
    });
  }

  for (const event of input.events) {
    if (!isMeaningfulManualEvent(event)) continue;
    const kind: WebsiteLifeNodeKind =
      event.category === 'NOTE' || event.eventType === 'note' ? 'note' : 'work';
    past.push({
      id: `event:${event.id}`,
      kind,
      date: event.occurredAt,
      title: event.title,
      description: event.description,
      source: 'manual',
      status: 'completed',
    });
  }

  past.sort(sortByDateAsc);

  const future: WebsiteLifeNode[] = input.tasks
    .filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
    .sort(sortOpenTasks)
    .map((task) => ({
      id: `task-open:${task.id}`,
      kind: 'open_task' as const,
      date: task.dueAt,
      title: task.title,
      description: task.description,
      source: 'manual' as const,
      status: task.status === 'IN_PROGRESS' ? ('in_progress' as const) : ('planned' as const),
    }));

  return { past, future };
}

function milestoneTitle(key: string): string {
  switch (key) {
    case 'created':
      return 'Сайт добавлен в LOW';
    case 'launched':
      return 'Сайт запущен';
    case 'healthy':
      return 'Впервые стал доступен';
    case 'gsc':
      return 'Добавлен в GSC';
    case 'impressions':
      return 'Появились первые показы';
    case 'click':
      return 'Появился первый клик';
    default:
      return key;
  }
}
