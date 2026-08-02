import Link from 'next/link';
import { DashboardAttentionList } from '@/components/dashboard/DashboardAttentionList';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { DashboardRecentEvents } from '@/components/dashboard/DashboardRecentEvents';
import { DashboardSummaryCards } from '@/components/dashboard/DashboardSummaryCards';
import { DashboardUpcomingTasks } from '@/components/dashboard/DashboardUpcomingTasks';
import { Alert } from '@/components/ui/primitives';
import { getDashboardData } from '@/lib/dashboard/service';
import { isDsdConfigured } from '@/lib/dsd/config';
import { isGscConfigured } from '@/lib/gsc/config';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await getDashboardData(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">Обзор</h1>
          <p className="mt-1 text-sm text-ink-200">
            Сайты, которые требуют внимания, ближайшие задачи и последние события.
          </p>
        </div>
        <Link href="/integrations" className="btn-secondary text-xs sm:text-sm">
          Интеграции
        </Link>
      </div>

      {data.lifecycleWarning ? (
        <Alert tone="warning" className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Предупреждение GSC lifecycle</p>
            <p className="mt-0.5">{data.lifecycleWarning.message}</p>
          </div>
          <Link href="/integrations" className="shrink-0 font-medium text-amber-900 underline-offset-2 hover:underline">
            Открыть интеграции
          </Link>
        </Alert>
      ) : null}

      <DashboardSummaryCards summary={data.summary} filters={data.filters} />

      <DashboardQuickActions
        dsdConfigured={isDsdConfigured()}
        gscConfigured={isGscConfigured()}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <section className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-ink-50">Требует внимания</h2>
              <p className="mt-1 text-sm text-ink-200">
                Показано {data.filteredItems.length} из {data.items.length}
              </p>
            </div>
          </div>
          <DashboardFiltersBar filters={data.filters} groups={data.groups} />
          <DashboardAttentionList items={data.filteredItems} />
        </section>

        <aside className="space-y-6 min-w-0">
          <DashboardUpcomingTasks items={data.upcomingTasks} />
          <DashboardRecentEvents events={data.recentEvents} />
        </aside>
      </div>
    </div>
  );
}
