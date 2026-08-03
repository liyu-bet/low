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
  actorLabel?: string | null;
  /** Normalized Russian activity type for UI. */
  activityLabel?: string;
  category?: EventCategory | null;
};

export type WebsiteActivityTimeline = {
  manual: WebsiteLifeNode[];
  automatic: WebsiteLifeNode[];
};

export type LifeTreeTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  actorLabel?: string | null;
};

export type LifeTreeEvent = {
  id: string;
  eventType: string;
  category: EventCategory;
  title: string;
  description: string | null;
  source: EventSource;
  occurredAt: Date;
  actorLabel?: string | null;
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

function sortByDateDesc(a: WebsiteLifeNode, b: WebsiteLifeNode): number {
  return -sortByDateAsc(a, b);
}

export function activityLabelForNode(
  kind: WebsiteLifeNodeKind,
  category?: EventCategory | null,
): string {
  if (kind === 'completed_task' || kind === 'open_task') return 'Задача';
  if (kind === 'note') return 'Заметка';
  if (kind === 'milestone') return 'Этап';
  if (kind === 'work') {
    switch (category) {
      case 'TECHNICAL':
        return 'Техническая работа';
      case 'SEO':
        return 'SEO';
      case 'CONTENT':
        return 'Контент';
      default:
        return 'Работа';
    }
  }
  return 'Запись';
}

/**
 * Build activity timeline: user work vs automatic milestones.
 * Open tasks are omitted — they belong in the Tasks block.
 * TASK_COMPLETED events are omitted when completed tasks are present.
 */
export function buildWebsiteLifeTree(input: {
  website: MilestoneWebsite;
  tasks: LifeTreeTask[];
  events: LifeTreeEvent[];
}): WebsiteActivityTimeline {
  const milestones = buildWebsiteMilestones(input.website);
  const automatic: WebsiteLifeNode[] = [];
  const manual: WebsiteLifeNode[] = [];

  for (const m of milestones) {
    if (!m.reached || !m.date) continue;
    automatic.push({
      id: `milestone:${m.key}`,
      kind: 'milestone',
      date: m.date,
      title: milestoneTitle(m.key),
      source: 'automatic',
      status: 'completed',
      activityLabel: activityLabelForNode('milestone'),
    });
  }

  for (const task of input.tasks) {
    if (task.status !== 'DONE') continue;
    manual.push({
      id: `task-done:${task.id}`,
      kind: 'completed_task',
      date: task.completedAt ?? task.createdAt,
      title: task.title,
      description: task.description,
      source: 'manual',
      status: 'completed',
      actorLabel: task.actorLabel,
      activityLabel: activityLabelForNode('completed_task'),
    });
  }

  for (const event of input.events) {
    if (!isMeaningfulManualEvent(event)) continue;
    const kind: WebsiteLifeNodeKind =
      event.category === 'NOTE' || event.eventType === 'note' ? 'note' : 'work';
    manual.push({
      id: `event:${event.id}`,
      kind,
      date: event.occurredAt,
      title: event.title,
      description: event.description,
      source: 'manual',
      status: 'completed',
      actorLabel: event.actorLabel,
      category: event.category,
      activityLabel: activityLabelForNode(kind, event.category),
    });
  }

  automatic.sort(sortByDateAsc);
  manual.sort(sortByDateDesc);

  return { manual, automatic };
}

/** Limit newest-first manual history for profile UI. */
export function limitManualActivity(
  nodes: WebsiteLifeNode[],
  limit: number,
): { items: WebsiteLifeNode[]; total: number; hasMore: boolean } {
  const total = nodes.length;
  return {
    items: nodes.slice(0, Math.max(0, limit)),
    total,
    hasMore: total > limit,
  };
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

export type LifeTreeNodeView = {
  id: string;
  kind: WebsiteLifeNodeKind;
  date: string | null;
  title: string;
  description?: string | null;
  source: 'automatic' | 'manual';
  status?: 'completed' | 'in_progress' | 'planned';
  actorLabel?: string | null;
  activityLabel?: string;
};

export function toLifeTreeNodeViews(nodes: WebsiteLifeNode[]): LifeTreeNodeView[] {
  return nodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    date: n.date ? n.date.toISOString() : null,
    title: n.title,
    description: n.description,
    source: n.source,
    status: n.status,
    actorLabel: n.actorLabel,
    activityLabel: n.activityLabel ?? activityLabelForNode(n.kind, n.category),
  }));
}
