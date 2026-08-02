import { DurationSummary } from '@/components/reports/DurationSummary';
import { GroupComparison } from '@/components/reports/GroupComparison';
import { LifecycleFunnel } from '@/components/reports/LifecycleFunnel';
import { MonthlyCohorts } from '@/components/reports/MonthlyCohorts';
import { ReportsFilters } from '@/components/reports/ReportsFilters';
import { ReportsSummary } from '@/components/reports/ReportsSummary';
import { StageDistribution } from '@/components/reports/StageDistribution';
import { StuckWebsites } from '@/components/reports/StuckWebsites';
import { TaskReport } from '@/components/reports/TaskReport';
import { WorkActivity } from '@/components/reports/WorkActivity';
import { getReportsData } from '@/lib/reports/service';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const data = await getReportsData(query);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-sand-100">Отчёты</h1>
        <p className="max-w-2xl text-sm text-ink-200">
          Аналитика жизненного цикла портфеля: воронка, скорость этапов, группы и активность.
        </p>
      </header>

      <ReportsFilters filters={data.filters} groups={data.groups} />

      <ReportsSummary summary={data.summary} />
      <LifecycleFunnel steps={data.funnel} />
      <DurationSummary rows={data.durations} />
      <StageDistribution rows={data.stages} />
      <MonthlyCohorts rows={data.monthly} />
      <GroupComparison rows={data.groupsComparison} filters={data.filters} />
      <StuckWebsites categories={data.stuck} />
      <WorkActivity rows={data.activity} />
      <TaskReport summary={data.tasks} />

      <section className="rounded border border-ink-700/70 bg-ink-950/40 p-4">
        <h2 className="font-display text-2xl text-sand-100">Экспорт CSV</h2>
        <p className="mt-1 text-sm text-ink-200">
          Текущая отфильтрованная выборка, эффективные даты, до 10&nbsp;000 сайтов. UTF-8 BOM.
        </p>
        <a
          href={data.exportHref}
          className="mt-3 inline-flex rounded bg-moss-600 px-4 py-2 text-sm text-sand-50 hover:bg-moss-500"
        >
          Скачать low-lifecycle-report.csv
        </a>
      </section>
    </div>
  );
}
