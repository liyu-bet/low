import type { WorkActivityMonth } from '@/lib/reports/types';

export function WorkActivity({ rows }: { rows: WorkActivityMonth[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">Активность работ</h2>
        <p className="mt-1 text-sm text-ink-200">
          Последние 12 месяцев. DSD/GSC — отдельная строка «Автоматические события».
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-ink-300">
            <tr className="border-b border-ink-800">
              <th className="py-2 pr-2 font-medium">Месяц</th>
              <th className="py-2 pr-2 font-medium">Ручные</th>
              <th className="py-2 pr-2 font-medium">Задачи</th>
              <th className="py-2 pr-2 font-medium">Техн.</th>
              <th className="py-2 pr-2 font-medium">SEO</th>
              <th className="py-2 pr-2 font-medium">Контент</th>
              <th className="py-2 pr-2 font-medium">Заметки</th>
              <th className="py-2 pr-2 font-medium">Авто</th>
              <th className="py-2 font-medium">Сайтов</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.monthKey} className="border-b border-ink-900/80 text-ink-100">
                <td className="py-2 pr-2 text-sand-100">{row.label}</td>
                <td className="py-2 pr-2">{row.manual}</td>
                <td className="py-2 pr-2">{row.taskCompleted}</td>
                <td className="py-2 pr-2">{row.technical}</td>
                <td className="py-2 pr-2">{row.seo}</td>
                <td className="py-2 pr-2">{row.content}</td>
                <td className="py-2 pr-2">{row.notes}</td>
                <td className="py-2 pr-2">{row.automatic}</td>
                <td className="py-2">{row.sitesWorked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
