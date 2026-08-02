import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BULK_WEBSITE_IDS_MAX } from '../constants';
import { parseDateOnly } from '../dates/date-only';
import {
  bulkAddTagsSchema,
  bulkArchiveSchema,
  bulkSetLifecycleStageSchema,
  bulkSetStatusSchema,
} from '../validations/bulk';
import { buildCsvWithBom, escapeCsvCell, csvFilenameForDate } from './csv';
import {
  assertWebsiteIdsLimit,
  bulkWorkDedupeKey,
  mergeWebsiteTags,
  normalizeWebsiteIds,
  removeWebsiteTags,
  shouldUpdateLastWorkAt,
  tagsEqual,
} from './bulk';
import { isWebsiteSelectableForNewTask } from '../tasks/classify';

describe('bulk website ids', () => {
  it('removes duplicate websiteIds', () => {
    assert.deepEqual(normalizeWebsiteIds(['a', 'b', 'a', '  ', 'b']), ['a', 'b']);
  });

  it('rejects more than 500 ids', () => {
    const ids = Array.from({ length: BULK_WEBSITE_IDS_MAX + 1 }, (_, i) => `id-${i}`);
    assert.throws(() => assertWebsiteIdsLimit(ids), /500/);
  });
});

describe('bulk tags helpers', () => {
  it('adds tags without duplicates and keeps order', () => {
    assert.deepEqual(mergeWebsiteTags(['alpha', 'beta'], ['Beta', 'gamma', '']), [
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('removes only requested tags', () => {
    assert.deepEqual(removeWebsiteTags(['a', 'b', 'c'], ['B', 'x']), ['a', 'c']);
  });

  it('detects no actual tag change', () => {
    assert.equal(tagsEqual(['a', 'b'], ['a', 'b']), true);
    assert.equal(tagsEqual(['a', 'b'], ['a', 'c']), false);
  });
});

describe('bulk status and stage validation', () => {
  it('generic status does not accept ARCHIVED', () => {
    assert.throws(() =>
      bulkSetStatusSchema.parse({
        websiteIds: JSON.stringify(['w1']),
        status: 'ARCHIVED',
      }),
    );
    assert.equal(
      bulkSetStatusSchema.parse({
        websiteIds: JSON.stringify(['w1']),
        status: 'ACTIVE',
      }).status,
      'ACTIVE',
    );
  });

  it('generic lifecycle stage does not accept ARCHIVED', () => {
    assert.throws(() =>
      bulkSetLifecycleStageSchema.parse({
        websiteIds: JSON.stringify(['w1']),
        lifecycleStage: 'ARCHIVED',
      }),
    );
  });
});

describe('bulk work helpers', () => {
  it('updates lastWorkAt when work date is later or equal', () => {
    const current = parseDateOnly('2026-08-01');
    assert.equal(shouldUpdateLastWorkAt(null, parseDateOnly('2026-08-02')), true);
    assert.equal(shouldUpdateLastWorkAt(current, parseDateOnly('2026-08-02')), true);
    assert.equal(shouldUpdateLastWorkAt(current, parseDateOnly('2026-08-01')), true);
    assert.equal(shouldUpdateLastWorkAt(current, parseDateOnly('2026-07-31')), false);
  });

  it('uses stable dedupe key for bulk work', () => {
    assert.equal(
      bulkWorkDedupeKey('op-1', 'site-1'),
      'bulk:work:op-1:site-1',
    );
  });
});

describe('bulk archive confirmation', () => {
  it('requires exact confirmation word', () => {
    assert.throws(() =>
      bulkArchiveSchema.parse({
        websiteIds: JSON.stringify(['w1']),
        confirmation: 'архивировать',
      }),
    );
    const parsed = bulkArchiveSchema.parse({
      websiteIds: JSON.stringify(['w1']),
      confirmation: 'АРХИВИРОВАТЬ',
    });
    assert.equal(parsed.confirmation, 'АРХИВИРОВАТЬ');
  });
});

describe('bulk task create skips archived conceptually', () => {
  it('treats archived websites as ineligible for new tasks', () => {
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
  });

  it('add-tags schema still accepts ids (archive skip is in service)', () => {
    const parsed = bulkAddTagsSchema.parse({
      websiteIds: JSON.stringify(['a', 'a', 'b']),
      tags: 'seo, content',
    });
    assert.deepEqual(parsed.websiteIds, ['a', 'b']);
    assert.deepEqual(parsed.tags, ['seo', 'content']);
  });
});

describe('csv export helpers', () => {
  it('escapes quotes and newlines', () => {
    assert.equal(escapeCsvCell('a"b'), '"a""b"');
    assert.equal(escapeCsvCell('line1\nline2'), '"line1\nline2"');
    assert.equal(escapeCsvCell('a,b'), '"a,b"');
  });

  it('builds bom csv and filename', () => {
    const csv = buildCsvWithBom([
      ['domain', 'name'],
      ['example.com', 'Say "hi"'],
    ]);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.match(csv, /"Say ""hi"""/);
    assert.equal(csvFilenameForDate(new Date('2026-08-02T12:00:00.000Z')), 'low-websites-2026-08-02.csv');
  });
});
