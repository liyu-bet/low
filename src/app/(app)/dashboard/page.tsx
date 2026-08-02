import Link from 'next/link';
import { DashboardAttentionList } from '@/components/dashboard/DashboardAttentionList';
import { getDashboardData } from '@/lib/dashboard/service';
import { formatDateTimeRu } from '@/lib/ui/labels';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await getDashboardData(params);

  const blocks: Array<{ label: string; value: number; href: string }> = [
    {
      label: 'Активных сайтов',
      value: data.summary.totalActive,
      href: '/websites',
    },
    {
      label: 'Требуют действия',
      value: data.summary.needsAttention,
      href: '/dashboard',
    },
    {
      label: 'Открытые задачи',
      value: Math.max(
        data.upcomingTasks.length,
        data.summary.overdueTasks + data.summary.tasksDueToday,
      ),
      href: '/tasks?focus=open',
    },
  ].filter((b) => b.value > 0 || b.label === 'Активных сайтов');

  const milestoneEvents = data.recentEvents
    .filter(
      (e) =>
        e.highlight === 'first_impression' ||
        e.highlight === 'first_click' ||
        e.highlight === 'recovered' ||
        e.highlight === 'work',
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">Обзор</h1>
        <p className="mt-1 text-sm text-ink-200">
          Второстепенная сводка. Ежедневная работа — в{' '}
          <Link href="/websites" className="text-moss-700 hover:underline">
            Сайтах
          </Link>{' '}
          и{' '}
          <Link href="/tasks" className="text-moss-700 hover:underline">
            Задачах
          </Link>
          .
        </p>
      </div>

      {data.lifecycleWarning ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Не удалось обновить даты у {data.lifecycleWarning.errorCount} сайтов ·{' '}
          <Link href="/integrations" className="font-medium underline-offset-2 hover:underline">
            Подробнее
          </Link>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((block) => (
          <Link
            key={block.label}
            href={block.href}
            className="rounded-card border border-ink-700 bg-white p-4 hover:border-moss-500"
          >
            <p className="text-2xl font-semibold text-ink-50">{block.value}</p>
            <p className="mt-1 text-sm text-ink-200">{block.label}</p>
          </Link>
        ))}
        {milestoneEvents.length > 0 ? (
          <div className="rounded-card border border-ink-700 bg-white p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-medium text-ink-50">Ключевые milestones</p>
            <p className="mt-1 text-2xl font-semibold text-ink-50">{milestoneEvents.length}</p>
            <p className="mt-1 text-xs text-ink-200">за последнее время</p>
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink-50">Сайты, которым требуется действие</h2>
        <DashboardAttentionList items={data.filteredItems.slice(0, 12)} />
        {data.filteredItems.length > 12 ? (
          <p className="text-sm text-ink-200">
            Показано 12 из {data.filteredItems.length}. Полные фильтры — в прежней версии через
            query-параметры URL.
          </p>
        ) : null}
      </section>

      {milestoneEvents.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-ink-50">Последние ключевые milestones</h2>
          <ul className="space-y-2">
            {milestoneEvents.map((event) => (
              <li key={event.id} className="text-sm text-ink-100">
                <Link href={`/websites/${event.websiteId}`} className="font-medium hover:underline">
                  {event.domain}
                </Link>
                <span className="text-ink-200"> · {event.title}</span>
                <span className="text-ink-200"> · {formatDateTimeRu(event.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.upcomingTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-xl font-semibold text-ink-50">Открытые задачи</h2>
            <Link href="/tasks" className="text-sm text-moss-700 hover:underline">
              Все задачи
            </Link>
          </div>
          <ul className="space-y-2">
            {data.upcomingTasks.slice(0, 8).map((task) => (
              <li key={task.id} className="text-sm">
                <Link href={`/websites/${task.websiteId}`} className="text-moss-700 hover:underline">
                  {task.domain}
                </Link>
                <span className="text-ink-100"> — {task.title}</span>
                <span className="text-ink-200"> · {task.dueRelative}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
