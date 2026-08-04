import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildArchiveEventData,
  buildArchiveUpdateData,
  buildRestoreEventData,
  buildRestoreUpdateData,
  isWebsiteArchived,
} from './service';

const NOW = new Date('2026-08-04T10:00:00.000Z');

describe('isWebsiteArchived', () => {
  it('is true when archivedAt is set', () => {
    assert.equal(
      isWebsiteArchived({ archivedAt: NOW, status: 'ACTIVE', lifecycleStage: 'GROWING' }),
      true,
    );
  });

  it('is true when status is ARCHIVED', () => {
    assert.equal(
      isWebsiteArchived({ archivedAt: null, status: 'ARCHIVED', lifecycleStage: 'GROWING' }),
      true,
    );
  });

  it('is true when lifecycleStage is ARCHIVED', () => {
    assert.equal(
      isWebsiteArchived({ archivedAt: null, status: 'ACTIVE', lifecycleStage: 'ARCHIVED' }),
      true,
    );
  });

  it('is false for a normal active website', () => {
    assert.equal(
      isWebsiteArchived({ archivedAt: null, status: 'ACTIVE', lifecycleStage: 'GROWING' }),
      false,
    );
  });
});

describe('buildArchiveUpdateData', () => {
  it('saves before-archive fields and sets ARCHIVED status/stage', () => {
    const update = buildArchiveUpdateData(
      { archivedAt: null, status: 'ACTIVE', lifecycleStage: 'GROWING' },
      NOW,
    );
    assert.deepEqual(update, {
      statusBeforeArchive: 'ACTIVE',
      lifecycleStageBeforeArchive: 'GROWING',
      status: 'ARCHIVED',
      lifecycleStage: 'ARCHIVED',
      archivedAt: NOW,
    });
  });

  it('is idempotent: returns null when already archived', () => {
    assert.equal(
      buildArchiveUpdateData(
        { archivedAt: NOW, status: 'ARCHIVED', lifecycleStage: 'ARCHIVED' },
        NOW,
      ),
      null,
    );
  });
});

describe('buildRestoreUpdateData', () => {
  it('restores from before-archive fields and clears them', () => {
    const update = buildRestoreUpdateData({
      archivedAt: NOW,
      status: 'ARCHIVED',
      lifecycleStage: 'ARCHIVED',
      statusBeforeArchive: 'PAUSED',
      lifecycleStageBeforeArchive: 'MATURE',
    });
    assert.deepEqual(update, {
      status: 'PAUSED',
      lifecycleStage: 'MATURE',
      statusBeforeArchive: null,
      lifecycleStageBeforeArchive: null,
      archivedAt: null,
    });
  });

  it('falls back to ACTIVE/LAUNCHED when before-archive fields are missing', () => {
    const update = buildRestoreUpdateData({
      archivedAt: NOW,
      status: 'ARCHIVED',
      lifecycleStage: 'ARCHIVED',
      statusBeforeArchive: null,
      lifecycleStageBeforeArchive: null,
    });
    assert.deepEqual(update, {
      status: 'ACTIVE',
      lifecycleStage: 'LAUNCHED',
      statusBeforeArchive: null,
      lifecycleStageBeforeArchive: null,
      archivedAt: null,
    });
  });

  it('is idempotent: returns null when not archived', () => {
    assert.equal(
      buildRestoreUpdateData({
        archivedAt: null,
        status: 'ACTIVE',
        lifecycleStage: 'GROWING',
        statusBeforeArchive: null,
        lifecycleStageBeforeArchive: null,
      }),
      null,
    );
  });
});

describe('buildArchiveEventData', () => {
  it('records previous status/stage and defaults to system actor', () => {
    const event = buildArchiveEventData(
      { id: 'w1', domain: 'example.com', status: 'ACTIVE', lifecycleStage: 'GROWING' },
      undefined,
      NOW,
    );
    assert.equal(event.eventType, 'WEBSITE_ARCHIVED');
    assert.equal(event.source, 'SYSTEM');
    assert.equal(event.createdBy, 'admin');
    assert.equal(event.createdByUserId, null);
    assert.deepEqual(event.metadata, {
      previousStatus: 'ACTIVE',
      previousLifecycleStage: 'GROWING',
    });
  });

  it('uses MANUAL source and the actor label when an actor is provided', () => {
    const event = buildArchiveEventData(
      { id: 'w1', domain: 'example.com', status: 'ACTIVE', lifecycleStage: 'GROWING' },
      { userId: 'user_1', label: 'Иван' },
      NOW,
    );
    assert.equal(event.source, 'MANUAL');
    assert.equal(event.createdBy, 'Иван');
    assert.equal(event.createdByUserId, 'user_1');
  });
});

describe('buildRestoreEventData', () => {
  it('records restored status/stage and defaults to system actor', () => {
    const event = buildRestoreEventData(
      { id: 'w1', domain: 'example.com' },
      { status: 'ACTIVE', lifecycleStage: 'LAUNCHED' },
      undefined,
      NOW,
    );
    assert.equal(event.eventType, 'WEBSITE_RESTORED');
    assert.equal(event.source, 'SYSTEM');
    assert.deepEqual(event.metadata, {
      restoredStatus: 'ACTIVE',
      restoredLifecycleStage: 'LAUNCHED',
    });
  });

  it('uses MANUAL source and the actor label when an actor is provided', () => {
    const event = buildRestoreEventData(
      { id: 'w1', domain: 'example.com' },
      { status: 'ACTIVE', lifecycleStage: 'LAUNCHED' },
      { userId: 'user_1', label: 'Иван' },
      NOW,
    );
    assert.equal(event.source, 'MANUAL');
    assert.equal(event.createdBy, 'Иван');
    assert.equal(event.createdByUserId, 'user_1');
  });
});
