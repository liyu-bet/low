'use client';

import { WebsiteCard } from '@/components/websites/WebsiteCard';
import type { WebsiteWorkspaceClientRow } from '@/components/websites/types';

function CardList({
  rows,
  isAdmin,
  inlineTaskFor,
  onToggleInline,
  bulkMode,
  selected,
  onToggleSelect,
  onNotice,
  variant,
}: {
  rows: WebsiteWorkspaceClientRow[];
  isAdmin: boolean;
  inlineTaskFor: string | null;
  onToggleInline: (id: string) => void;
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onNotice?: (message: string) => void;
  variant?: 'default' | 'favorite' | 'recommended';
}) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <WebsiteCard
          key={row.id}
          row={row}
          isAdmin={isAdmin}
          inlineOpen={inlineTaskFor === row.id}
          onToggleInline={() => onToggleInline(row.id)}
          bulkMode={bulkMode}
          selected={selected.has(row.id)}
          onToggleSelect={() => onToggleSelect(row.id)}
          onNotice={onNotice}
          variant={variant}
        />
      ))}
    </ul>
  );
}

export function WebsiteSections({
  mode,
  favorites,
  recommendations,
  regular,
  isAdmin,
  inlineTaskFor,
  onToggleInline,
  bulkMode,
  selected,
  onToggleSelect,
  onNotice,
}: {
  mode: 'default' | 'search' | 'archived';
  favorites: WebsiteWorkspaceClientRow[];
  recommendations: WebsiteWorkspaceClientRow[];
  regular: WebsiteWorkspaceClientRow[];
  isAdmin: boolean;
  inlineTaskFor: string | null;
  onToggleInline: (id: string) => void;
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onNotice?: (message: string) => void;
}) {
  const listProps = {
    isAdmin,
    inlineTaskFor,
    onToggleInline,
    bulkMode,
    selected,
    onToggleSelect,
    onNotice,
  };

  if (mode === 'archived') {
    return (
      <section className="space-y-2" aria-label="Архив сайтов">
        {regular.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-200">Сайты не найдены.</p>
        ) : (
          <CardList rows={regular} {...listProps} />
        )}
      </section>
    );
  }

  if (mode === 'search') {
    const resultRows = [...favorites, ...regular];
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
          Результаты · {resultRows.length}
        </h2>
        {resultRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-200">Сайты не найдены.</p>
        ) : (
          <CardList rows={resultRows} {...listProps} />
        )}
      </section>
    );
  }

  const hasBuckets = favorites.length > 0 || recommendations.length > 0;

  return (
    <div className="space-y-4">
      {favorites.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
            Избранное · {favorites.length}
          </h2>
          <CardList rows={favorites} {...listProps} variant="favorite" />
        </section>
      ) : null}

      {recommendations.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
            Рекомендуем добавить
          </h2>
          <CardList rows={recommendations} {...listProps} variant="recommended" />
        </section>
      ) : null}

      {hasBuckets ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-200">
            Все сайты · {regular.length}
          </h2>
          {regular.length === 0 ? (
            <p className="text-sm text-ink-200">Других сайтов нет.</p>
          ) : (
            <CardList rows={regular} {...listProps} />
          )}
        </section>
      ) : regular.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-200">Сайты не найдены.</p>
      ) : (
        <section className="space-y-2" aria-label="Сайты">
          <CardList rows={regular} {...listProps} />
        </section>
      )}
    </div>
  );
}
