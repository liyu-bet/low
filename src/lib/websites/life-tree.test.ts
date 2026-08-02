import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildWebsiteLifeTree } from './life-tree';
import { buildWebsiteMilestones, nextMilestoneLabel } from './milestones';

describe('buildWebsiteMilestones', () => {
  it('marks reached steps and next open step', () => {
    const milestones = buildWebsiteMilestones({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: new Date('2024-02-01T00:00:00.000Z'),
      firstHealthyAt: new Date('2024-02-05T00:00:00.000Z'),
      gscFirstSeenAt: null,
      firstImpressionAt: null,
      firstClickAt: null,
    });

    assert.equal(milestones.filter((m) => m.reached).length, 3);
    assert.equal(milestones.find((m) => m.key === 'gsc')?.isNext, true);
    assert.equal(nextMilestoneLabel(milestones), 'Следующий этап: подключение к GSC');
  });

  it('prefers manual override dates', () => {
    const milestones = buildWebsiteMilestones({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: new Date('2024-02-01T00:00:00.000Z'),
      launchedAtManual: new Date('2024-01-15T00:00:00.000Z'),
      firstHealthyAt: null,
      gscFirstSeenAt: null,
      firstImpressionAt: null,
      firstClickAt: null,
    });

    assert.equal(
      milestones.find((m) => m.key === 'launched')?.date?.toISOString(),
      '2024-01-15T00:00:00.000Z',
    );
  });
});

describe('buildWebsiteLifeTree', () => {
  it('builds past milestones and future open tasks without duplicating task completion events', () => {
    const website = {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: new Date('2024-02-01T00:00:00.000Z'),
      firstHealthyAt: null,
      gscFirstSeenAt: null,
      firstImpressionAt: null,
      firstClickAt: null,
    };

    const tree = buildWebsiteLifeTree({
      website,
      tasks: [
        {
          id: 't1',
          title: 'Done work',
          description: null,
          status: 'DONE',
          dueAt: null,
          completedAt: new Date('2024-03-01T00:00:00.000Z'),
          createdAt: new Date('2024-02-20T00:00:00.000Z'),
        },
        {
          id: 't2',
          title: 'Open plan',
          description: null,
          status: 'TODO',
          dueAt: new Date('2024-04-01T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2024-03-10T00:00:00.000Z'),
        },
        {
          id: 't3',
          title: 'In progress',
          description: null,
          status: 'IN_PROGRESS',
          dueAt: null,
          completedAt: null,
          createdAt: new Date('2024-03-11T00:00:00.000Z'),
        },
      ],
      events: [
        {
          id: 'e1',
          eventType: 'TASK_COMPLETED',
          category: 'NOTE',
          title: 'Задача выполнена: Done work',
          description: null,
          source: 'MANUAL',
          occurredAt: new Date('2024-03-01T00:00:00.000Z'),
        },
        {
          id: 'e2',
          eventType: 'work',
          category: 'TECHNICAL',
          title: 'SSL renew',
          description: 'certs',
          source: 'MANUAL',
          occurredAt: new Date('2024-02-15T00:00:00.000Z'),
        },
        {
          id: 'e3',
          eventType: 'SITE_CREATED',
          category: 'LIFECYCLE',
          title: 'created',
          description: null,
          source: 'SYSTEM',
          occurredAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
    });

    assert.ok(tree.past.some((n) => n.id === 'milestone:created'));
    assert.ok(tree.past.some((n) => n.id === 'milestone:launched'));
    assert.ok(tree.past.some((n) => n.id === 'task-done:t1'));
    assert.ok(tree.past.some((n) => n.id === 'event:e2'));
    assert.equal(tree.past.some((n) => n.id === 'event:e1'), false);
    assert.equal(tree.past.some((n) => n.id === 'event:e3'), false);

    assert.equal(tree.future.length, 2);
    assert.equal(tree.future[0]?.id, 'task-open:t3');
    assert.equal(tree.future[1]?.id, 'task-open:t2');
  });
});
