'use client';

import { useMemo, useState } from 'react';
import { UserInitials } from '@/components/ui/layout';
import { formatDateRu } from '@/lib/ui/labels';
import { cn } from '@/lib/ui/cn';
import type { LifeTreeNodeView } from '@/lib/websites/life-tree';

export type { LifeTreeNodeView };

const INITIAL_VISIBLE = 10;

function ManualCard({ node }: { node: LifeTreeNodeView }) {
  const actor = node.actorLabel?.trim() || 'Неизвестный пользователь';
  const activity = node.activityLabel || 'Запись';
  const dateLabel = node.date ? formatDateRu(new Date(node.date)) : '';

  return (
    <li className="rounded-[10px] border border-ink-800/80 bg-moss-50/40">
      <div className="flex gap-3 rounded-[10px] border-l-[3px] border-l-moss-500 px-3 py-2.5">
        <UserInitials label={actor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
            <p className="min-w-0 text-xs text-ink-200">
              <span className="font-medium text-ink-100">{actor}</span>
              <span className="mx-1 text-ink-700">·</span>
              {activity}
            </p>
            {dateLabel ? (
              <time className="shrink-0 text-xs text-ink-200" dateTime={node.date ?? undefined}>
                {dateLabel}
              </time>
            ) : null}
          </div>
          <p className="mt-0.5 break-anywhere text-sm font-medium text-ink-50">{node.title}</p>
          {node.description ? (
            <p className="mt-1 line-clamp-3 text-sm text-ink-200">{node.description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function AutomaticList({ nodes }: { nodes: LifeTreeNodeView[] }) {
  if (nodes.length === 0) {
    return <p className="py-1 text-sm text-ink-200">Автоматических событий нет</p>;
  }

  return (
    <ul className="space-y-1.5">
      {nodes.map((node) => (
        <li key={node.id} className="flex items-start gap-2 text-sm text-ink-200">
          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-500" />
          <p className="min-w-0 break-anywhere">
            {node.date ? formatDateRu(new Date(node.date)) : '—'}
            <span className="mx-1.5 text-ink-700">·</span>
            {node.title}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function WebsiteLifeTree({
  manual,
  automatic,
}: {
  manual: LifeTreeNodeView[];
  automatic: LifeTreeNodeView[];
}) {
  const [showAutomatic, setShowAutomatic] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const visibleManual = useMemo(() => {
    if (expanded || manual.length <= INITIAL_VISIBLE) return manual;
    return manual.slice(0, INITIAL_VISIBLE);
  }, [expanded, manual]);

  const canExpand = manual.length > INITIAL_VISIBLE && !expanded;

  return (
    <section id="life-tree" className="space-y-3">
      <h2 className="text-lg font-semibold text-ink-50 sm:text-xl">История</h2>

      {manual.length === 0 ? (
        <p className="text-sm text-ink-200">Пока нет работ и выполненных задач.</p>
      ) : (
        <ul className="space-y-2.5">
          {visibleManual.map((node) => (
            <ManualCard key={node.id} node={node} />
          ))}
        </ul>
      )}

      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-moss-700 underline-offset-2 hover:underline"
        >
          Показать ещё
        </button>
      ) : null}

      <div className="pt-1">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={showAutomatic}
            onChange={(e) => setShowAutomatic(e.target.checked)}
            className="rounded border-ink-600 text-moss-600"
          />
          Показать автоматические события
        </label>
        {showAutomatic ? (
          <div className={cn('mt-2')}>
            <AutomaticList nodes={automatic} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
