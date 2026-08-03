import type { MonthlyCohortRow } from '@/lib/reports/types';

export function MonthlyCohorts({ rows }: { rows: MonthlyCohortRow[] }) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.launched, r.gsc, r.impressions, r.clicks]),
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">Запуски по месяцам</h2>
        <p className="mt-1 text-sm text-ink-200">
          Последние 12 месяцев. Каждая метрика — по своей эффективной дате.
        </p>
      </div>
      <div className="data-scroll">
        <table className="min-w-full text-left text-sm">
          <thead className="text-ink-300">
            <tr className="border-b border-ink-800">
              <th className="py-2 pr-3 font-medium">Месяц</th>
              <th className="py-2 pr-3 font-medium">Запуски</th>
              <th className="py-2 pr-3 font-medium">GSC</th>
              <th className="py-2 pr-3 font-medium">Показы</th>
              <th className="py-2 font-medium">Клики</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.monthKey} className="border-b border-ink-900/80 align-top text-ink-100">
                <td className="py-2 pr-3 text-sand-100">{row.label}</td>
                {(['launched', 'gsc', 'impressions', 'clicks'] as const).map((key) => (
                  <td key={key} className="py-2 pr-3">
                    <div>{row[key]}</div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded bg-ink-900">
                      <div
                        className="h-full rounded bg-moss-700/80"
                        style={{ width: `${(row[key] / max) * 100}%` }}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
