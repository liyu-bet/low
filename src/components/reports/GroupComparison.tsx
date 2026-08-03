import Link from 'next/link';
import { buildReportsQuery } from '@/lib/reports/filters';
import { roundDays } from '@/lib/reports/math';
import type { GroupComparisonRow, GroupSortMode, ReportsFilters } from '@/lib/reports/types';

const SORT_OPTIONS: Array<{ value: GroupSortMode; label: string }> = [
  { value: 'count', label: 'По количеству' },
  { value: 'impressions_share', label: 'По доле показов' },
  { value: 'clicks_share', label: 'По доле кликов' },
  { value: 'speed_to_impressions', label: 'По скорости до показов' },
];

function fmt(value: number | null): string {
  const n = roundDays(value, 1);
  return n == null ? '—' : String(n);
}

export function GroupComparison({
  rows,
  filters,
}: {
  rows: GroupComparisonRow[];
  filters: ReportsFilters;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-sand-100">Сравнение групп</h2>
          <p className="mt-1 text-sm text-ink-200">Агрегация по уже загруженной выборке.</p>
        </div>
        <form method="get" action="/reports" className="flex flex-wrap items-center gap-2 text-sm">
          {filters.period !== 'all' ? <input type="hidden" name="period" value={filters.period} /> : null}
          {filters.from ? <input type="hidden" name="from" value={filters.from} /> : null}
          {filters.to ? <input type="hidden" name="to" value={filters.to} /> : null}
          {filters.group ? <input type="hidden" name="group" value={filters.group} /> : null}
          {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
          {filters.stage ? <input type="hidden" name="stage" value={filters.stage} /> : null}
          {filters.includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
          <label className="text-ink-200">
            Сортировка
            <select
              name="groupSort"
              defaultValue={filters.groupSort}
              className="ml-2 rounded border border-ink-700 bg-white px-2 py-1.5 text-ink-50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded border border-ink-700 px-3 py-1.5 text-ink-100">
            Применить
          </button>
        </form>
      </div>
      <div className="data-scroll">
        <table className="min-w-full text-left text-sm">
          <thead className="text-ink-300">
            <tr className="border-b border-ink-800">
              <th className="py-2 pr-2 font-medium">Группа</th>
              <th className="py-2 pr-2 font-medium">Сайтов</th>
              <th className="py-2 pr-2 font-medium">Запущено</th>
              <th className="py-2 pr-2 font-medium">GSC</th>
              <th className="py-2 pr-2 font-medium">Показы</th>
              <th className="py-2 pr-2 font-medium">Клики</th>
              <th className="py-2 pr-2 font-medium">% показов</th>
              <th className="py-2 pr-2 font-medium">% кликов</th>
              <th className="py-2 pr-2 font-medium">Мед. → показы</th>
              <th className="py-2 pr-2 font-medium">Мед. → клик</th>
              <th className="py-2 pr-2 font-medium">Внимание</th>
              <th className="py-2 font-medium">Проср. задачи</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.groupKey} className="border-b border-ink-900/80 text-ink-100">
                <td className="py-2 pr-2">
                  <Link
                    href={buildReportsQuery({ ...filters, group: row.groupKey })}
                    className="text-sand-100 hover:text-moss-600"
                  >
                    {row.groupLabel}
                  </Link>
                </td>
                <td className="py-2 pr-2">{row.total}</td>
                <td className="py-2 pr-2">{row.launched}</td>
                <td className="py-2 pr-2">{row.gsc}</td>
                <td className="py-2 pr-2">{row.impressions}</td>
                <td className="py-2 pr-2">{row.clicks}</td>
                <td className="py-2 pr-2">{row.impressionsShare}%</td>
                <td className="py-2 pr-2">{row.clicksShare}%</td>
                <td className="py-2 pr-2">{fmt(row.medianLaunchToImpressions)}</td>
                <td className="py-2 pr-2">{fmt(row.medianImpressionsToClick)}</td>
                <td className="py-2 pr-2">{row.needsAttention}</td>
                <td className="py-2">{row.overdueTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
