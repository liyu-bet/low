import Link from 'next/link';
import { DashboardAttentionList } from '@/components/dashboard/DashboardAttentionList';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { DashboardRecentEvents } from '@/components/dashboard/DashboardRecentEvents';
import { DashboardSummaryCards } from '@/components/dashboard/DashboardSummaryCards';
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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-sand-100">Обзор</h1>
        <p className="mt-1 text-sm text-ink-200">
          Сайты, которые требуют внимания, и последние события. Архивные сайты не учитываются.
        </p>
      </div>

      {data.lifecycleWarning ? (
        <div className="rounded border border-amber-200/40 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
          <p>{data.lifecycleWarning.message}</p>
          <Link href="/integrations" className="mt-1 inline-block text-sand-100 underline-offset-2 hover:underline">
            Открыть интеграции
          </Link>
        </div>
      ) : null}

      <DashboardSummaryCards summary={data.summary} filters={data.filters} />

      <DashboardQuickActions
        dsdConfigured={isDsdConfigured()}
        gscConfigured={isGscConfigured()}
      />

      <DashboardFiltersBar filters={data.filters} groups={data.groups} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-sand-100">Требует внимания</h2>
            <p className="mt-1 text-sm text-ink-200">
              Показано {data.filteredItems.length} из {data.items.length}
            </p>
          </div>
        </div>
        <DashboardAttentionList items={data.filteredItems} />
      </section>

      <DashboardRecentEvents events={data.recentEvents} />
    </div>
  );
}
