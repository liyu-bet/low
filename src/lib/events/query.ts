import type { EventCategory, EventSource, Prisma } from '@prisma/client';
import { EVENT_TYPE_BULK_WORK_RECORDED, EVENT_TYPE_TASK_COMPLETED } from '@/lib/constants';
import { todayDateOnlyUtc } from '@/lib/dates/date-only';

export const EVENT_PAGE_SIZE = 50;

export type EventFocusFilter =
  | 'all'
  | 'work'
  | 'technical'
  | 'seo'
  | 'content'
  | 'lifecycle'
  | 'integration'
  | 'notes';

export type EventPeriodFilter = '30' | '90' | '365' | 'all';

export type EventListQuery = {
  focus: EventFocusFilter;
  source: '' | EventSource;
  q: string;
  period: EventPeriodFilter;
  page: number;
};

const VALID_FOCUS = new Set<EventFocusFilter>([
  'all',
  'work',
  'technical',
  'seo',
  'content',
  'lifecycle',
  'integration',
  'notes',
]);

const VALID_SOURCE = new Set<EventSource>(['MANUAL', 'SYSTEM', 'DSD', 'GSC']);
const VALID_PERIOD = new Set<EventPeriodFilter>(['30', '90', '365', 'all']);

export function parseEventListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): EventListQuery {
  const raw = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
  };

  const focusRaw = raw('focus');
  const sourceRaw = raw('source');
  const periodRaw = raw('period');
  const pageRaw = Number.parseInt(raw('page') || '1', 10);

  return {
    focus: VALID_FOCUS.has(focusRaw as EventFocusFilter)
      ? (focusRaw as EventFocusFilter)
      : 'all',
    source: VALID_SOURCE.has(sourceRaw as EventSource) ? (sourceRaw as EventSource) : '',
    q: raw('q'),
    period: VALID_PERIOD.has(periodRaw as EventPeriodFilter)
      ? (periodRaw as EventPeriodFilter)
      : 'all',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function buildEventListWhere(
  websiteId: string,
  query: EventListQuery,
  now: Date = new Date(),
): Prisma.WebsiteEventWhereInput {
  const where: Prisma.WebsiteEventWhereInput = { websiteId };

  switch (query.focus) {
    case 'work':
      where.OR = [
        { eventType: 'work' },
        { eventType: EVENT_TYPE_BULK_WORK_RECORDED },
        { eventType: EVENT_TYPE_TASK_COMPLETED },
      ];
      break;
    case 'technical':
      where.category = 'TECHNICAL' satisfies EventCategory;
      break;
    case 'seo':
      where.category = 'SEO';
      break;
    case 'content':
      where.category = 'CONTENT';
      break;
    case 'lifecycle':
      where.category = 'LIFECYCLE';
      break;
    case 'integration':
      where.category = 'INTEGRATION';
      break;
    case 'notes':
      where.category = 'NOTE';
      break;
    default:
      break;
  }

  if (query.source) {
    where.source = query.source;
  }

  if (query.q.trim()) {
    const q = query.q.trim();
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  if (query.period !== 'all') {
    const days = Number(query.period);
    const from = todayDateOnlyUtc(now);
    from.setUTCDate(from.getUTCDate() - days);
    where.occurredAt = { gte: from };
  }

  return where;
}

export function eventListSkipTake(page: number): { skip: number; take: number } {
  const safePage = Math.max(1, page);
  return {
    skip: (safePage - 1) * EVENT_PAGE_SIZE,
    take: EVENT_PAGE_SIZE,
  };
}

export function buildEventListHref(
  websiteId: string,
  query: Partial<EventListQuery> & { page?: number },
): string {
  const params = new URLSearchParams();
  if (query.focus && query.focus !== 'all') params.set('focus', query.focus);
  if (query.source) params.set('source', query.source);
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.period && query.period !== 'all') params.set('period', query.period);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const qs = params.toString();
  const base = `/websites/${websiteId}`;
  return qs ? `${base}?${qs}#history` : `${base}#history`;
}
