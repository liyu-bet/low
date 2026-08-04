import Link from 'next/link';
import type { TaskFocus } from '@/lib/tasks/types';
import { PRIMARY_TASK_TABS } from '@/lib/tasks/view';
import { cn } from '@/lib/ui/cn';

export function TaskTabs({
  activeFocus,
  counts,
  hrefFor,
}: {
  activeFocus: TaskFocus;
  counts: { mine: number; open: number; done: number };
  hrefFor: (focus: TaskFocus) => string;
}) {
  const primaryActive =
    activeFocus === 'mine' || activeFocus === 'open' || activeFocus === 'done'
      ? activeFocus
      : null;

  return (
    <nav
      aria-label="Вкладки задач"
      className="grid grid-cols-3 gap-1 rounded-[12px] bg-ink-900 p-1 sm:inline-grid sm:w-auto"
    >
      {PRIMARY_TASK_TABS.map((tab) => {
        const active = primaryActive === tab.focus;
        const count =
          tab.focus === 'mine' ? counts.mine : tab.focus === 'open' ? counts.open : counts.done;
        return (
          <Link
            key={tab.focus}
            href={hrefFor(tab.focus)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-[10px] px-2 py-2 text-center text-sm font-medium transition-colors',
              active
                ? 'bg-white text-ink-50 shadow-sm ring-1 ring-ink-700'
                : 'text-ink-200 hover:text-ink-50',
            )}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span
              className={cn(
                'mt-0.5 block text-xs font-normal sm:mt-0 sm:ml-1.5 sm:inline',
                'text-ink-200',
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
