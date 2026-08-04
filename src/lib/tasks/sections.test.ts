import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateOnly } from '../dates/date-only';
import { partitionOpenTasks } from './sections';
import { buildTasksQuery, parseTaskFilters } from './service';
import type { TaskListItem } from './types';
import {
  assigneeDisplayLabel,
  collectActiveFilterChips,
  countActiveFilters,
} from './view';

const NOW = new Date('2026-08-04T15:00:00.000Z');

function item(
  partial: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title' | 'status'>,
): TaskListItem {
  return {
    websiteId: 'w1',
    description: null,
    priority: 'MEDIUM',
    dueAt: null,
    completedAt: null,
    result: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    dueBucket: 'none',
    dueRelative: 'Без срока',
    daysUntil: null,
    createdByUserId: 'u1',
    assignedToUserId: 'u1',
    completedByUserId: null,
    createdByLabel: 'Author',
    assignedToLabel: 'Assignee',
    completedByLabel: null,
    website: {
      id: 'w1',
      domain: 'example.com',
      name: null,
      group: null,
      archivedAt: null,
    },
    ...partial,
  };
}

describe('parseTaskFilters default focus', () => {
  it('defaults /tasks without focus to mine', () => {
    assert.equal(parseTaskFilters({}).focus, 'mine');
  });

  it('keeps explicit focus=open', () => {
    assert.equal(parseTaskFilters({ focus: 'open' }).focus, 'open');
  });

  it('preserves legacy focus values', () => {
    for (const focus of [
      'today',
      'overdue',
      'upcoming',
      'no_due',
      'in_progress',
      'canceled',
      'done',
      'mine',
    ]) {
      assert.equal(parseTaskFilters({ focus }).focus, focus);
    }
  });
});

describe('buildTasksQuery', () => {
  it('omits default mine focus and empty filters', () => {
    assert.equal(buildTasksQuery({ focus: 'mine' }), '/tasks');
    assert.equal(buildTasksQuery({}), '/tasks');
  });

  it('encodes focus=open explicitly', () => {
    assert.equal(buildTasksQuery({ focus: 'open' }), '/tasks?focus=open');
  });

  it('preserves legacy focus after other filters', () => {
    assert.equal(
      buildTasksQuery({ focus: 'overdue', q: 'links' }),
      '/tasks?focus=overdue&q=links',
    );
  });

  it('does not emit empty parameters', () => {
    const href = buildTasksQuery({
      focus: 'mine',
      q: '  ',
      websiteId: '',
      group: '',
      priority: '',
      status: '',
      assignedToUserId: '',
      createdByUserId: '',
    });
    assert.equal(href, '/tasks');
  });
});

describe('partitionOpenTasks', () => {
  it('separates overdue from today and keeps each task once', () => {
    const overdue = item({
      id: 'o',
      title: 'O',
      status: 'TODO',
      dueAt: parseDateOnly('2026-08-01'),
      dueBucket: 'overdue',
      dueRelative: 'Просрочено на 3 дня',
    });
    const today = item({
      id: 't',
      title: 'T',
      status: 'TODO',
      dueAt: parseDateOnly('2026-08-04'),
      dueBucket: 'today',
      dueRelative: 'Сегодня',
    });
    const upcoming = item({
      id: 'u',
      title: 'U',
      status: 'TODO',
      dueAt: parseDateOnly('2026-08-10'),
      dueBucket: 'upcoming',
      dueRelative: 'Через 6 дней',
      priority: 'HIGH',
    });
    const upcomingLater = item({
      id: 'u2',
      title: 'U2',
      status: 'TODO',
      dueAt: parseDateOnly('2026-08-20'),
      dueBucket: 'upcoming',
      dueRelative: 'Через 16 дней',
      priority: 'LOW',
    });
    const noDueIp = item({
      id: 'n1',
      title: 'N1',
      status: 'IN_PROGRESS',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    const noDueTodo = item({
      id: 'n2',
      title: 'N2',
      status: 'TODO',
      createdAt: new Date('2026-08-03T00:00:00.000Z'),
    });
    const done = item({ id: 'd', title: 'D', status: 'DONE' });
    const canceled = item({ id: 'c', title: 'C', status: 'CANCELED' });

    const sections = partitionOpenTasks(
      [upcomingLater, done, noDueTodo, overdue, canceled, today, upcoming, noDueIp],
      NOW,
    );

    assert.deepEqual(
      sections.overdue.map((t) => t.id),
      ['o'],
    );
    assert.deepEqual(
      sections.today.map((t) => t.id),
      ['t'],
    );
    assert.deepEqual(
      sections.upcoming.map((t) => t.id),
      ['u', 'u2'],
    );
    assert.deepEqual(
      sections.noDue.map((t) => t.id),
      ['n1', 'n2'],
    );

    const allIds = [
      ...sections.overdue,
      ...sections.today,
      ...sections.upcoming,
      ...sections.noDue,
    ].map((t) => t.id);
    assert.equal(new Set(allIds).size, allIds.length);
    assert.ok(!allIds.includes('d'));
    assert.ok(!allIds.includes('c'));
  });
});

describe('task display helpers', () => {
  it('uses Вы for current assignee and safe fallback', () => {
    assert.equal(
      assigneeDisplayLabel(
        { assignedToUserId: 'me', assignedToLabel: 'Anna' },
        'me',
      ),
      'Вы',
    );
    assert.equal(
      assigneeDisplayLabel({ assignedToUserId: null, assignedToLabel: null }),
      'Не назначена',
    );
  });

  it('counts active filters independently of focus', () => {
    const filters = {
      focus: 'mine' as const,
      q: 'x',
      websiteId: 'w',
      group: '',
      priority: 'HIGH' as const,
      status: '' as const,
      action: '' as const,
      assignedToUserId: '',
      createdByUserId: '',
    };
    assert.equal(countActiveFilters(filters), 3);
    const chips = collectActiveFilterChips(filters, {
      websites: [{ id: 'w', domain: 'example.com' }],
      users: [],
      buildHref: () => '/tasks',
    });
    assert.equal(chips.length, 3);
  });
});
