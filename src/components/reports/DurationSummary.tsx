import { roundDays } from '@/lib/reports/math';
import type { DurationMetricRow } from '@/lib/reports/types';

function fmt(value: number | null): string {
  const n = roundDays(value, 1);
  return n == null ? '—' : String(n);
}

export function DurationSummary({ rows }: { rows: DurationMetricRow[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl text-sand-100">Скорость прохождения этапов</h2>
        <p className="mt-1 text-sm text-ink-200">
          Календарные дни. Главный показатель — медиана. Отрицательные интервалы не входят в расчёт.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-ink-300">
            <tr className="border-b border-ink-800">
              <th className="py-2 pr-3 font-medium">Интервал</th>
              <th className="py-2 pr-3 font-medium">N</th>
              <th className="py-2 pr-3 font-medium">Медиана</th>
              <th className="py-2 pr-3 font-medium">Среднее</th>
              <th className="py-2 pr-3 font-medium">Min</th>
              <th className="py-2 pr-3 font-medium">P25</th>
              <th className="py-2 pr-3 font-medium">P75</th>
              <th className="py-2 font-medium">Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-ink-900/80 text-ink-100">
                <td className="py-2 pr-3 text-sand-100">{row.label}</td>
                <td className="py-2 pr-3">{row.summary.count}</td>
                <td className="py-2 pr-3 font-medium text-moss-300">{fmt(row.summary.median)}</td>
                <td className="py-2 pr-3">{fmt(row.summary.mean)}</td>
                <td className="py-2 pr-3">{fmt(row.summary.min)}</td>
                <td className="py-2 pr-3">{fmt(row.summary.p25)}</td>
                <td className="py-2 pr-3">{fmt(row.summary.p75)}</td>
                <td className="py-2">{fmt(row.summary.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
