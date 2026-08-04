import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countUniqueWebsiteIds,
  partitionWebsiteSections,
  sectionTotalCount,
  type WebsiteSectionRow,
} from './website-sections';

function row(
  id: string,
  domain: string,
  isFavorite = false,
): WebsiteSectionRow {
  return { id, domain, isFavorite };
}

describe('partitionWebsiteSections', () => {
  const rows = [
    row('fav-1', 'a.example.test', true),
    row('rec-1', 'b.example.test', false),
    row('reg-1', 'c.example.test', false),
    row('reg-2', 'd.example.test', false),
  ];
  const recommended = new Set(['rec-1']);

  it('keeps favorite, recommended and regular sections disjoint', () => {
    const sections = partitionWebsiteSections(rows, recommended, 'default');
    assert.deepEqual(
      sections.favorites.map((r) => r.id),
      ['fav-1'],
    );
    assert.deepEqual(
      sections.recommendations.map((r) => r.id),
      ['rec-1'],
    );
    assert.deepEqual(
      sections.regular.map((r) => r.id),
      ['reg-1', 'reg-2'],
    );

    const ids = [
      ...sections.favorites,
      ...sections.recommendations,
      ...sections.regular,
    ].map((r) => r.id);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('shows each website id at most once', () => {
    const duplicated = [...rows, row('rec-1', 'b.example.test', false)];
    const sections = partitionWebsiteSections(duplicated, recommended, 'default');
    const ids = [
      ...sections.favorites,
      ...sections.recommendations,
      ...sections.regular,
    ].map((r) => r.id);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('section lengths sum to unique row count', () => {
    const sections = partitionWebsiteSections(rows, recommended, 'default');
    assert.equal(sectionTotalCount(sections), countUniqueWebsiteIds(rows));
  });

  it('excludes favorites from recommendations and regular', () => {
    const withFavRec = [
      row('both', 'both.example.test', true),
      row('reg-1', 'c.example.test', false),
    ];
    const sections = partitionWebsiteSections(withFavRec, new Set(['both']), 'default');
    assert.equal(sections.favorites.length, 1);
    assert.equal(sections.recommendations.length, 0);
    assert.equal(sections.regular.length, 1);
    assert.equal(sections.regular[0]!.id, 'reg-1');
  });

  it('excludes recommendations from regular', () => {
    const sections = partitionWebsiteSections(rows, recommended, 'default');
    assert.ok(!sections.regular.some((r) => r.id === 'rec-1'));
  });

  it('search results keep each site once with favorites first', () => {
    const sections = partitionWebsiteSections(rows, recommended, 'search');
    assert.deepEqual(
      sections.favorites.map((r) => r.id),
      ['fav-1'],
    );
    assert.equal(sections.recommendations.length, 0);
    assert.deepEqual(
      sections.regular.map((r) => r.id),
      ['rec-1', 'reg-1', 'reg-2'],
    );
    const ids = [...sections.favorites, ...sections.regular].map((r) => r.id);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('archived view is a single flat list without recommendations', () => {
    const sections = partitionWebsiteSections(rows, recommended, 'archived');
    assert.equal(sections.favorites.length, 0);
    assert.equal(sections.recommendations.length, 0);
    assert.equal(sections.regular.length, 4);
    assert.equal(countUniqueWebsiteIds(sections.regular), 4);
  });
});
