import { cn } from '@/lib/ui/cn';
import {
  formatMilestoneDate,
  type MilestoneItem,
} from '@/lib/websites/milestones';

export type MilestoneRailItem = {
  key: string;
  label: string;
  shortLabel: string;
  date: string | null;
  reached: boolean;
  isNext: boolean;
};

export function toMilestoneRailItems(milestones: MilestoneItem[]): MilestoneRailItem[] {
  return milestones.map((m) => ({
    key: m.key,
    label: m.label,
    shortLabel: m.shortLabel,
    date: m.date ? m.date.toISOString() : null,
    reached: m.reached,
    isNext: m.isNext,
  }));
}

export function WebsiteMilestoneRail({
  items,
  className,
}: {
  items: MilestoneRailItem[];
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <ol className="flex min-w-[22rem] items-start gap-0">
        {items.map((item, index) => {
          const dateLabel = item.date
            ? formatMilestoneDate(new Date(item.date))
            : '—';
          const title = `${item.label}: ${dateLabel}`;
          return (
            <li key={item.key} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    'h-px flex-1',
                    index === 0
                      ? 'bg-transparent'
                      : item.reached || items[index - 1]?.reached
                        ? 'bg-teal-500/70'
                        : 'bg-ink-700',
                  )}
                />
                <span
                  title={title}
                  className={cn(
                    'relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full border-2',
                    item.reached
                      ? 'border-teal-600 bg-teal-500'
                      : item.isNext
                        ? 'border-teal-500 bg-white ring-2 ring-teal-200'
                        : 'border-ink-600 bg-white',
                  )}
                />
                <div
                  className={cn(
                    'h-px flex-1',
                    index === items.length - 1
                      ? 'bg-transparent'
                      : item.reached
                        ? 'bg-teal-500/70'
                        : 'bg-ink-700',
                  )}
                />
              </div>
              <p
                className={cn(
                  'mt-1.5 max-w-[4.5rem] truncate text-center text-[10px] leading-tight sm:text-xs',
                  item.isNext ? 'font-semibold text-teal-800' : 'text-ink-200',
                )}
                title={title}
              >
                {item.shortLabel}
              </p>
              <p className="mt-0.5 text-center text-[10px] text-ink-200" title={title}>
                {item.reached ? dateLabel : '—'}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
