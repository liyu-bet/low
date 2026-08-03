import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activityLabelForNode,
  buildWebsiteLifeTree,
  limitManualActivity,
} from './life-tree';
import {
  buildWebsiteMilestones,
  computeMilestoneProgress,
  nextMilestoneLabel,
} from './milestones';

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
    assert.equal(milestones.find((m) => m.key === 'gsc')?.isMissingData, false);
    assert.equal(nextMilestoneLabel(milestones), 'Следующий этап: подключение к GSC');
  });

  it('prefers manual override dates without mutating other fields', () => {
    const input = {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: new Date('2024-02-01T00:00:00.000Z'),
      launchedAtManual: new Date('2024-01-15T00:00:00.000Z'),
      firstHealthyAt: null as Date | null,
      gscFirstSeenAt: null as Date | null,
      firstImpressionAt: null as Date | null,
      firstClickAt: null as Date | null,
    };
    const before = { ...input, launchedAt: input.launchedAt };
    const milestones = buildWebsiteMilestones(input);

    assert.equal(
      milestones.find((m) => m.key === 'launched')?.date?.toISOString(),
      '2024-01-15T00:00:00.000Z',
    );
    assert.equal(input.launchedAt.toISOString(), before.launchedAt.toISOString());
    assert.equal(input.launchedAtManual.toISOString(), '2024-01-15T00:00:00.000Z');
  });

  it('treats early gap with later reached stages as missing data, not next', () => {
    const milestones = buildWebsiteMilestones({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: null,
      firstHealthyAt: new Date('2024-02-05T00:00:00.000Z'),
      gscFirstSeenAt: new Date('2024-02-10T00:00:00.000Z'),
      firstImpressionAt: new Date('2024-03-01T00:00:00.000Z'),
      firstClickAt: new Date('2024-03-05T00:00:00.000Z'),
    });

    const launched = milestones.find((m) => m.key === 'launched');
    assert.equal(launched?.reached, false);
    assert.equal(launched?.isMissingData, true);
    assert.equal(launched?.isNext, false);

    const progress = computeMilestoneProgress(milestones);
    assert.deepEqual(progress.missingEarlier, ['launched']);
    assert.equal(progress.next, null);
    assert.equal(progress.complete, false);
    assert.equal(nextMilestoneLabel(milestones), 'Не указана дата запуска');
    assert.notEqual(nextMilestoneLabel(milestones), 'Следующий этап: запуск');
  });

  it('keeps first unreached without later reached as next', () => {
    const milestones = buildWebsiteMilestones({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: new Date('2024-02-01T00:00:00.000Z'),
      firstHealthyAt: null,
      gscFirstSeenAt: null,
      firstImpressionAt: null,
      firstClickAt: null,
    });

    assert.equal(milestones.find((m) => m.key === 'healthy')?.isNext, true);
    assert.equal(milestones.find((m) => m.key === 'healthy')?.isMissingData, false);
    assert.equal(computeMilestoneProgress(milestones).next, 'healthy');
  });

  it('marks progress complete when all stages reached', () => {
    const milestones = buildWebsiteMilestones({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: new Date('2024-02-01T00:00:00.000Z'),
      firstHealthyAt: new Date('2024-02-05T00:00:00.000Z'),
      gscFirstSeenAt: new Date('2024-02-10T00:00:00.000Z'),
      firstImpressionAt: new Date('2024-03-01T00:00:00.000Z'),
      firstClickAt: new Date('2024-03-05T00:00:00.000Z'),
    });

    const progress = computeMilestoneProgress(milestones);
    assert.equal(progress.complete, true);
    assert.equal(progress.next, null);
    assert.deepEqual(progress.missingEarlier, []);
    assert.equal(nextMilestoneLabel(milestones), 'Все основные этапы достигнуты');
  });

  it('returns multiple earlier gaps in order', () => {
    const milestones = buildWebsiteMilestones({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      launchedAt: null,
      firstHealthyAt: null,
      gscFirstSeenAt: null,
      firstImpressionAt: new Date('2024-03-01T00:00:00.000Z'),
      firstClickAt: new Date('2024-03-05T00:00:00.000Z'),
    });

    const progress = computeMilestoneProgress(milestones);
    assert.deepEqual(progress.missingEarlier, ['launched', 'healthy', 'gsc']);
    assert.equal(progress.next, null);
    assert.equal(milestones.find((m) => m.key === 'launched')?.isNext, false);
    assert.equal(milestones.find((m) => m.key === 'impressions')?.reached, true);
  });
});

describe('buildWebsiteLifeTree activity', () => {
  const website = {
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    launchedAt: new Date('2024-02-01T00:00:00.000Z'),
    firstHealthyAt: null as Date | null,
    gscFirstSeenAt: null as Date | null,
    firstImpressionAt: null as Date | null,
    firstClickAt: null as Date | null,
  };

  it('keeps manual work, notes, completed tasks and separates automatic milestones', () => {
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
          actorLabel: 'Анна',
        },
        {
          id: 't2',
          title: 'Open plan',
          description: null,
          status: 'TODO',
          dueAt: new Date('2024-04-01T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2024-03-10T00:00:00.000Z'),
          actorLabel: 'Иван',
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
          actorLabel: 'Li',
        },
        {
          id: 'e3',
          eventType: 'note',
          category: 'NOTE',
          title: 'Check later',
          description: null,
          source: 'MANUAL',
          occurredAt: new Date('2024-02-16T00:00:00.000Z'),
          actorLabel: 'Иван',
        },
        {
          id: 'e4',
          eventType: 'SITE_CREATED',
          category: 'LIFECYCLE',
          title: 'created',
          description: null,
          source: 'SYSTEM',
          occurredAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
    });

    assert.equal(
      tree.manual.some((n) => n.kind === 'milestone'),
      false,
    );
    assert.ok(tree.manual.some((n) => n.id === 'task-done:t1'));
    assert.ok(tree.manual.some((n) => n.id === 'event:e2'));
    assert.ok(tree.manual.some((n) => n.id === 'event:e3'));
    assert.equal(tree.manual.some((n) => n.id === 'event:e1'), false);
    assert.equal(tree.manual.some((n) => n.id === 'task-open:t2'), false);

    assert.ok(tree.automatic.some((n) => n.id === 'milestone:created'));
    assert.ok(tree.automatic.some((n) => n.id === 'milestone:launched'));
    assert.equal(tree.automatic.every((n) => n.source === 'automatic'), true);

    const done = tree.manual.find((n) => n.id === 'task-done:t1');
    assert.equal(done?.actorLabel, 'Анна');
    assert.equal(done?.activityLabel, 'Задача');

    const work = tree.manual.find((n) => n.id === 'event:e2');
    assert.equal(work?.activityLabel, 'Техническая работа');
    assert.equal(work?.actorLabel, 'Li');

    const note = tree.manual.find((n) => n.id === 'event:e3');
    assert.equal(note?.activityLabel, 'Заметка');
  });

  it('sorts manual history newest first and limits count', () => {
    const tree = buildWebsiteLifeTree({
      website,
      tasks: [
        {
          id: 'old',
          title: 'Old',
          description: null,
          status: 'DONE',
          dueAt: null,
          completedAt: new Date('2024-01-10T00:00:00.000Z'),
          createdAt: new Date('2024-01-10T00:00:00.000Z'),
        },
        {
          id: 'new',
          title: 'New',
          description: null,
          status: 'DONE',
          dueAt: null,
          completedAt: new Date('2024-05-01T00:00:00.000Z'),
          createdAt: new Date('2024-04-01T00:00:00.000Z'),
        },
      ],
      events: [],
    });

    assert.equal(tree.manual[0]?.id, 'task-done:new');
    assert.equal(tree.manual[1]?.id, 'task-done:old');

    const limited = limitManualActivity(tree.manual, 1);
    assert.equal(limited.items.length, 1);
    assert.equal(limited.items[0]?.id, 'task-done:new');
    assert.equal(limited.total, 2);
    assert.equal(limited.hasMore, true);
  });

  it('maps activity labels for SEO and content work', () => {
    assert.equal(activityLabelForNode('work', 'SEO'), 'SEO');
    assert.equal(activityLabelForNode('work', 'CONTENT'), 'Контент');
    assert.equal(activityLabelForNode('completed_task'), 'Задача');
    assert.equal(activityLabelForNode('note'), 'Заметка');
  });
});
