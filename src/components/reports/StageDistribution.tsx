import Link from 'next/link';
import type { StageCountRow } from '@/lib/reports/types';

export function StageDistribution({ rows }: { rows: StageCountRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">Распределение по стадиям</h2>
        <p className="mt-1 text-sm text-ink-200">Текущий этап жизненного цикла в выборке.</p>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.stage} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
            <Link href={row.href} className="text-sand-100 hover:text-moss-600">
              {row.label}
            </Link>
            <div className="h-2 overflow-hidden rounded bg-ink-900">
              <div
                className="h-full rounded bg-sand-600/70"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="text-ink-200">
              {row.count} · {row.pct}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
