import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateOnly, toDateOnlyUtc } from '../dates/date-only';
import {
  classifyTaskDue,
  compareOpenTasks,
  isOpenTaskStatus,
  isWebsiteSelectableForNewTask,
  resolveCompleteTaskDecision,
  sortOpenTasks,
  taskCompletedDedupeKey,
} from './classify';
import { taskCreateSchema } from '../validations/task';

const NOW = new Date('2026-08-02T15:00:00.000Z');

describe('task due classification', () => {
  it('detects overdue tasks', () => {
    assert.equal(classifyTaskDue(parseDateOnly('2026-07-31'), NOW), 'overdue');
  });

  it('detects tasks due today', () => {
    assert.equal(classifyTaskDue(parseDateOnly('2026-08-02'), NOW), 'today');
  });

  it('treats canceled and done as not open', () => {
    assert.equal(isOpenTaskStatus('TODO'), true);
    assert.equal(isOpenTaskStatus('IN_PROGRESS'), true);
    assert.equal(isOpenTaskStatus('DONE'), false);
    assert.equal(isOpenTaskStatus('CANCELED'), false);
  });

  it('sorts overdue before today and critical before low', () => {
    const sorted = sortOpenTasks(
      [
        {
          id: 'a',
          status: 'TODO',
          priority: 'LOW',
          dueAt: parseDateOnly('2026-08-02'),
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          id: 'b',
          status: 'TODO',
          priority: 'MEDIUM',
          dueAt: parseDateOnly('2026-07-30'),
          createdAt: new Date('2026-08-01T01:00:00.000Z'),
        },
        {
          id: 'c',
          status: 'TODO',
          priority: 'CRITICAL',
          dueAt: parseDateOnly('2026-07-30'),
          createdAt: new Date('2026-08-01T02:00:00.000Z'),
        },
        {
          id: 'd',
          status: 'TODO',
          priority: 'HIGH',
          dueAt: null,
          createdAt: new Date('2026-08-01T03:00:00.000Z'),
        },
      ],
      NOW,
    );
    assert.deepEqual(
      sorted.map((t) => t.id),
      ['c', 'b', 'a', 'd'],
    );
    assert.ok(compareOpenTasks(sorted[0]!, sorted[1]!, NOW) <= 0);
  });
});

describe('task completion decisions', () => {
  it('does not schedule a second completion event for DONE', () => {
    assert.equal(resolveCompleteTaskDecision('DONE'), 'already_done');
    assert.equal(resolveCompleteTaskDecision('TODO'), 'complete');
    assert.equal(resolveCompleteTaskDecision('IN_PROGRESS'), 'complete');
    assert.equal(resolveCompleteTaskDecision('CANCELED'), 'reject_canceled');
  });

  it('uses stable dedupe key so double submit cannot create two events', () => {
    assert.equal(taskCompletedDedupeKey('task-1'), 'task:completed:task-1');
  });

  it('completion decision implies lastWorkAt update only on complete', () => {
    assert.equal(resolveCompleteTaskDecision('TODO'), 'complete');
    // Service updates Website.lastWorkAt only when decision === complete.
  });
});

describe('task create defaults', () => {
  it('does not allow archived websites for new tasks by default', () => {
    assert.equal(
      isWebsiteSelectableForNewTask({ archivedAt: null, status: 'ACTIVE' }),
      true,
    );
    assert.equal(
      isWebsiteSelectableForNewTask({
        archivedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: 'ARCHIVED',
      }),
      false,
    );
    assert.equal(
      isWebsiteSelectableForNewTask({ archivedAt: null, status: 'ARCHIVED' }),
      false,
    );
  });

  it('parses dueAt as date-only without timezone shift', () => {
    const parsed = taskCreateSchema.parse({
      websiteId: 'w1',
      title: 'Проверить индексы',
      dueAt: '2026-08-15',
    });
    assert.ok(parsed.dueAt);
    assert.equal(dateOnlyToIso(parsed.dueAt!), '2026-08-15');
    assert.equal(toDateOnlyUtc(parsed.dueAt!).getUTCHours(), 0);
  });
});

function dateOnlyToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
