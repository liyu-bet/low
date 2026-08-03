import { formatDateRu } from '@/lib/ui/labels';
import { cn } from '@/lib/ui/cn';
import type { LifeTreeNodeView } from '@/lib/websites/life-tree';

export type { LifeTreeNodeView };

function kindLabel(kind: LifeTreeNodeView['kind']): string {
  switch (kind) {
    case 'milestone':
      return 'Автоматически';
    case 'work':
      return 'Работа';
    case 'completed_task':
    case 'open_task':
      return 'Задача';
    case 'note':
      return 'Заметка';
    default:
      return '';
  }
}

function nodeDotClass(node: LifeTreeNodeView): string {
  if (node.kind === 'milestone') return 'border-teal-600 bg-teal-500';
  if (node.kind === 'completed_task') return 'border-moss-600 bg-moss-500';
  if (node.kind === 'work') return 'border-sky-600 bg-sky-500';
  if (node.kind === 'note') return 'border-ink-500 bg-ink-400';
  if (node.status === 'in_progress') return 'border-amber-600 bg-amber-400';
  return 'border-ink-500 bg-white';
}

function NodeList({
  nodes,
  muted,
}: {
  nodes: LifeTreeNodeView[];
  muted?: boolean;
}) {
  if (nodes.length === 0) {
    return <p className="py-2 pl-8 text-sm text-ink-200">Записей нет</p>;
  }

  return (
    <ul className="space-y-0">
      {nodes.map((node) => (
        <li key={node.id} className="relative flex gap-3 pb-5 last:pb-0">
          <div className="absolute bottom-0 left-[0.4375rem] top-2 w-px bg-ink-700" />
          <span
            className={cn(
              'relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2',
              nodeDotClass(node),
            )}
          />
          <div className={cn('min-w-0 flex-1', muted && 'opacity-90')}>
            <p className="text-xs text-ink-200">
              {node.date ? formatDateRu(new Date(node.date)) : 'Без срока'}
              <span className="mx-1.5 text-ink-700">·</span>
              {kindLabel(node.kind)}
              {node.status === 'in_progress' ? (
                <span className="ml-1.5 text-amber-800">в работе</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-sm font-medium text-ink-50">{node.title}</p>
            {node.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-ink-200">{node.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WebsiteLifeTree({
  past,
  future,
}: {
  past: LifeTreeNodeView[];
  future: LifeTreeNodeView[];
}) {
  return (
    <section id="life-tree" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">Дерево жизни проекта</h2>
        <p className="mt-1 text-sm text-ink-200">Ключевые этапы, работы и задачи по времени.</p>
      </div>

      <div className="rounded-card border border-ink-700 bg-white p-4 sm:p-5">
        <NodeList nodes={past} />

        <div className="relative my-4 flex items-center gap-3">
          <span className="relative z-[1] h-3 w-3 shrink-0 rounded-full border-2 border-ink-50 bg-ink-50" />
          <div className="h-px flex-1 bg-ink-700" />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-100">
            Сегодня
          </span>
          <div className="h-px flex-1 bg-ink-700" />
        </div>

        <NodeList nodes={future} muted />
      </div>
    </section>
  );
}
