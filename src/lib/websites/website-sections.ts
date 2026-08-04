export type WebsiteSectionRow = {
  id: string;
  domain: string;
  isFavorite: boolean;
};

export type WebsiteSections<T extends WebsiteSectionRow> = {
  favorites: T[];
  recommendations: T[];
  regular: T[];
};

export type PartitionMode = 'default' | 'search' | 'archived';

/**
 * Partitions filtered workspace rows into mutually exclusive section lists.
 * Each website id appears in at most one section.
 */
export function partitionWebsiteSections<T extends WebsiteSectionRow>(
  rows: readonly T[],
  recommendedIds: ReadonlySet<string>,
  mode: PartitionMode,
): WebsiteSections<T> {
  const unique = dedupeWebsiteRows(rows);

  if (mode === 'archived') {
    return { favorites: [], recommendations: [], regular: unique };
  }

  if (mode === 'search') {
    const favorites = unique.filter((row) => row.isFavorite);
    const regular = unique.filter((row) => !row.isFavorite);
    return { favorites, recommendations: [], regular };
  }

  const favorites = unique.filter((row) => row.isFavorite);
  const favoriteIds = new Set(favorites.map((row) => row.id));

  const recommendations = unique.filter(
    (row) => !favoriteIds.has(row.id) && recommendedIds.has(row.id),
  );
  const recommendationIds = new Set(recommendations.map((row) => row.id));

  const regular = unique.filter(
    (row) => !favoriteIds.has(row.id) && !recommendationIds.has(row.id),
  );

  assertExclusiveSections(favorites, recommendations, regular);

  return { favorites, recommendations, regular };
}

/** Deduplicate by id, keeping first occurrence. Logs a warning in non-production. */
export function dedupeWebsiteRows<T extends WebsiteSectionRow>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  let duplicates = 0;
  for (const row of rows) {
    if (seen.has(row.id)) {
      duplicates += 1;
      continue;
    }
    seen.add(row.id);
    out.push(row);
  }
  if (duplicates > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[websites] dropped ${duplicates} duplicate website row(s) while partitioning sections`,
    );
  } else if (duplicates > 0) {
    console.warn('[websites] dropped duplicate website rows while partitioning sections');
  }
  return out;
}

export function countUniqueWebsiteIds(rows: readonly { id: string }[]): number {
  return new Set(rows.map((row) => row.id)).size;
}

export function assertExclusiveSections(
  favorites: readonly { id: string }[],
  recommendations: readonly { id: string }[],
  regular: readonly { id: string }[],
): void {
  if (process.env.NODE_ENV === 'production') return;

  const seen = new Set<string>();
  for (const row of [...favorites, ...recommendations, ...regular]) {
    if (seen.has(row.id)) {
      throw new Error(`Website section overlap detected for id ${row.id}`);
    }
    seen.add(row.id);
  }
}

export function sectionTotalCount(sections: {
  favorites: readonly { id: string }[];
  recommendations: readonly { id: string }[];
  regular: readonly { id: string }[];
}): number {
  return sections.favorites.length + sections.recommendations.length + sections.regular.length;
}
