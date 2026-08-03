import { formatMilestoneDate, type MilestoneRailItem } from '@/lib/websites/milestones';
import { cn } from '@/lib/ui/cn';

export type { MilestoneRailItem };

function Dot({
  reached,
  isNext,
  isMissingData,
}: {
  reached: boolean;
  isNext: boolean;
  isMissingData: boolean;
}) {
  return (
    <span
      className={cn(
        'relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full border-2',
        reached
          ? 'border-teal-600 bg-teal-500'
          : isMissingData
            ? 'border-amber-500 bg-white'
            : isNext
              ? 'border-teal-500 bg-white ring-2 ring-teal-100'
              : 'border-ink-500 bg-white',
      )}
    />
  );
}

function dateText(item: MilestoneRailItem): string {
  if (item.reached && item.date) return formatMilestoneDate(new Date(item.date));
  if (item.isMissingData) return 'Дата не указана';
  return '';
}

function DesktopOrTabletRow({ items }: { items: MilestoneRailItem[] }) {
  return (
    <ol className="grid w-full grid-cols-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item, index) => {
        const inRowStart = index % 3 === 0;
        const inRowEnd = index % 3 === 2;
        const lgStart = index === 0;
        const lgEnd = index === items.length - 1;
        const title = `${item.label}: ${dateText(item) || '—'}`;
        return (
          <li key={item.key} className="flex min-w-0 flex-col items-center px-0.5">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  'h-px flex-1',
                  // tablet row connectors
                  inRowStart ? 'bg-transparent sm:bg-transparent' : '',
                  !inRowStart && (item.reached || items[index - 1]?.reached)
                    ? 'bg-teal-500/60'
                    : !inRowStart
                      ? 'bg-ink-700'
                      : 'bg-transparent',
                  // desktop continuous line overrides
                  lgStart ? 'lg:bg-transparent' : '',
                  !lgStart && (item.reached || items[index - 1]?.reached)
                    ? 'lg:bg-teal-500/60'
                    : !lgStart
                      ? 'lg:bg-ink-700'
                      : '',
                )}
              />
              <span title={title}>
                <Dot
                  reached={item.reached}
                  isNext={item.isNext}
                  isMissingData={item.isMissingData}
                />
              </span>
              <div
                className={cn(
                  'h-px flex-1',
                  inRowEnd ? 'bg-transparent' : '',
                  !inRowEnd && item.reached ? 'bg-teal-500/60' : !inRowEnd ? 'bg-ink-700' : '',
                  lgEnd ? 'lg:bg-transparent' : '',
                  !lgEnd && item.reached ? 'lg:bg-teal-500/60' : !lgEnd ? 'lg:bg-ink-700' : '',
                )}
              />
            </div>
            <p
              className={cn(
                'mt-1 max-w-full truncate text-center text-[11px] leading-tight',
                item.reached
                  ? 'font-medium text-ink-50'
                  : item.isNext
                    ? 'font-semibold text-teal-800'
                    : item.isMissingData
                      ? 'font-medium text-amber-800'
                      : 'text-ink-200',
              )}
              title={title}
            >
              {item.shortLabel}
            </p>
            <p
              className={cn(
                'mt-0.5 text-center text-[10px] leading-tight',
                item.isMissingData ? 'text-amber-700' : 'text-ink-200',
              )}
              title={title}
            >
              {dateText(item) || '\u00A0'}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function MobileStepper({ items }: { items: MilestoneRailItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const title = `${item.label}: ${dateText(item) || '—'}`;
        const last = index === items.length - 1;
        return (
          <li key={item.key} className="relative flex gap-3 pb-3 last:pb-0">
            {!last ? (
              <div
                className={cn(
                  'absolute bottom-0 left-[0.4375rem] top-3 w-px',
                  item.reached ? 'bg-teal-500/60' : 'bg-ink-700',
                )}
              />
            ) : null}
            <div className="relative z-[1] mt-1">
              <Dot
                reached={item.reached}
                isNext={item.isNext}
                isMissingData={item.isMissingData}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p
                  className={cn(
                    'text-sm',
                    item.reached
                      ? 'font-medium text-ink-50'
                      : item.isNext
                        ? 'font-semibold text-teal-800'
                        : item.isMissingData
                          ? 'font-medium text-amber-800'
                          : 'text-ink-200',
                  )}
                  title={title}
                >
                  {item.label}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    item.isMissingData ? 'text-amber-700' : 'text-ink-200',
                  )}
                >
                  {dateText(item) || '—'}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact dots for website list rows — no labels, no scroll. */
export function MilestoneProgressDots({
  items,
  className,
}: {
  items: MilestoneRailItem[];
  className?: string;
}) {
  const reached = items.filter((i) => i.reached).length;
  const label = items
    .map((i) => {
      const state = i.reached
        ? 'достигнут'
        : i.isMissingData
          ? 'дата не указана'
          : i.isNext
            ? 'следующий'
            : 'не достигнут';
      return `${i.label}: ${state}`;
    })
    .join('; ');

  return (
    <div
      className={cn('inline-flex items-center gap-1.5', className)}
      title={label}
      aria-label={`${reached} из ${items.length} этапов. ${label}`}
    >
      {items.map((item) => (
        <span
          key={item.key}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            item.reached
              ? 'bg-teal-500'
              : item.isMissingData
                ? 'border border-amber-500 bg-white'
                : 'border border-ink-500 bg-white',
          )}
        />
      ))}
      <span className="ml-1 text-xs text-ink-200">
        {reached} из {items.length}
      </span>
    </div>
  );
}

/**
 * Profile milestone presentation:
 * - mobile: vertical stepper
 * - tablet: 3×2 grid
 * - desktop: 6 columns
 * No horizontal scroll containers.
 */
export function WebsiteMilestoneRail({
  items,
  className,
}: {
  items: MilestoneRailItem[];
  className?: string;
}) {
  return (
    <div className={cn('w-full max-w-full', className)} data-milestone-rail>
      <div className="sm:hidden">
        <MobileStepper items={items} />
      </div>
      <div className="hidden sm:block">
        <DesktopOrTabletRow items={items} />
      </div>
    </div>
  );
}
