import type { Website } from '@prisma/client';
import { KeyDatesSection } from '@/components/KeyDatesSection';
import type { LifecycleInterval } from '@/lib/websites/lifecycle';

export function WebsiteLifecycle({
  website,
  intervals,
}: {
  website: Website;
  intervals: LifecycleInterval[];
}) {
  return (
    <section className="space-y-4">
      <KeyDatesSection website={website} />
      {intervals.length > 0 ? (
        <div className="rounded border border-ink-700/60 bg-ink-950/30 px-4 py-3">
          <h3 className="text-sm font-medium text-sand-100">Интервалы</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {intervals.map((item) => (
              <li key={item.key} className="text-sm text-ink-200">
                {item.label}:{' '}
                <span className="text-ink-50">
                  {item.days} {pluralDays(item.days)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}
