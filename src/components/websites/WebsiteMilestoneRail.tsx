import { cn } from '@/lib/ui/cn';
import {
  formatMilestoneDate,
  type MilestoneRailItem,
} from '@/lib/websites/milestones';

export type { MilestoneRailItem };

export function WebsiteMilestoneRail({
  items,
  className,
}: {
  items: MilestoneRailItem[];
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <ol className="flex min-w-[20rem] items-start gap-0">
        {items.map((item, index) => {
          const dateLabel = item.date
            ? formatMilestoneDate(new Date(item.date))
            : '';
          const title = item.reached
            ? `${item.label}: ${dateLabel}`
            : item.isMissingData
              ? `${item.label}: нужно уточнить`
              : item.label;
          return (
            <li key={item.key} className="flex min-w-0 flex-1 flex-col items-center px-0.5">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    'h-px flex-1',
                    index === 0
                      ? 'bg-transparent'
                      : item.reached || items[index - 1]?.reached
                        ? 'bg-teal-500/60'
                        : 'bg-ink-700',
                  )}
                />
                <span
                  title={title}
                  className={cn(
                    'relative z-[1] h-2 w-2 shrink-0 rounded-full border-2',
                    item.reached
                      ? 'border-teal-600 bg-teal-500'
                      : item.isNext
                        ? 'border-teal-500 bg-white ring-2 ring-teal-100'
                        : 'border-ink-500 bg-white',
                  )}
                />
                <div
                  className={cn(
                    'h-px flex-1',
                    index === items.length - 1
                      ? 'bg-transparent'
                      : item.reached
                        ? 'bg-teal-500/60'
                        : 'bg-ink-700',
                  )}
                />
              </div>
              <p
                className={cn(
                  'mt-1 max-w-[4.25rem] truncate text-center text-[10px] leading-tight sm:text-[11px]',
                  item.reached
                    ? 'font-medium text-ink-50'
                    : item.isNext
                      ? 'font-semibold text-teal-800'
                      : 'text-ink-200',
                )}
                title={title}
              >
                {item.shortLabel}
              </p>
              {item.reached && dateLabel ? (
                <p className="mt-0.5 text-center text-[10px] leading-tight text-ink-200" title={title}>
                  {dateLabel}
                </p>
              ) : (
                <p className="mt-0.5 h-3 text-center text-[10px] text-transparent">.</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
