import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareWorkspaceRows, type WebsiteWorkspaceRow } from './workspace';

function row(
  domain: string,
  overrides: Partial<WebsiteWorkspaceRow> = {},
): WebsiteWorkspaceRow {
  return {
    id: domain,
    domain,
    name: null,
    primaryUrl: null,
    status: 'ACTIVE',
    lifecycleStage: 'GROWING',
    group: null,
    tags: [],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    launchedAt: null,
    launchedAtManual: null,
    firstHealthyAt: null,
    gscFirstSeenAt: null,
    gscAddedAtManual: null,
    firstImpressionAt: null,
    firstImpressionAtManual: null,
    firstClickAt: null,
    firstClickAtManual: null,
    archivedAt: null,
    availability: 'unknown',
    milestones: [],
    nextStageLabel: '',
    openTasksCount: 0,
    nearestTask: null,
    isFavorite: false,
    favoriteCreatedAt: null,
    performance: null,
    recommendation: null,
    ...overrides,
  } as WebsiteWorkspaceRow;
}

function order(rows: WebsiteWorkspaceRow[], recommendedIds: string[]): string[] {
  const rank = new Map(recommendedIds.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => compareWorkspaceRows(a, b, rank)).map((r) => r.domain);
}

describe('compareWorkspaceRows', () => {
  it('puts favorites first, then recommended, then the rest', () => {
    const rows = [
      row('zeta.example'),
      row('alpha.example'),
      row('recommended.example'),
      row('fav.example', {
        isFavorite: true,
        favoriteCreatedAt: new Date('2024-05-01T00:00:00.000Z'),
      }),
    ];

    assert.deepEqual(order(rows, ['recommended.example']), [
      'fav.example',
      'recommended.example',
      'alpha.example',
      'zeta.example',
    ]);
  });

  it('orders favorites by newest favorite first, then domain', () => {
    const sameMoment = new Date('2024-05-01T00:00:00.000Z');
    const rows = [
      row('older.example', {
        isFavorite: true,
        favoriteCreatedAt: new Date('2024-04-01T00:00:00.000Z'),
      }),
      row('tie-b.example', { isFavorite: true, favoriteCreatedAt: sameMoment }),
      row('tie-a.example', { isFavorite: true, favoriteCreatedAt: sameMoment }),
    ];

    assert.deepEqual(order(rows, []), [
      'tie-a.example',
      'tie-b.example',
      'older.example',
    ]);
  });

  it('keeps recommended rows in recommendation rank order, not alphabetical', () => {
    const rows = [row('a-weak.example'), row('z-strong.example'), row('m-other.example')];

    assert.deepEqual(order(rows, ['z-strong.example', 'a-weak.example']), [
      'z-strong.example',
      'a-weak.example',
      'm-other.example',
    ]);
  });

  it('never ranks a favorite below a recommendation', () => {
    const rows = [
      row('recommended.example'),
      row('fav.example', {
        isFavorite: true,
        favoriteCreatedAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ];

    assert.deepEqual(order(rows, ['recommended.example']), [
      'fav.example',
      'recommended.example',
    ]);
  });
});
