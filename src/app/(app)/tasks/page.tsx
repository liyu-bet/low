import Link from 'next/link';
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskSummaryCards } from '@/components/tasks/TaskSummaryCards';
import { getTasksPageData } from '@/lib/tasks/service';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await getTasksPageData(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">Задачи</h1>
        <p className="mt-1 text-sm text-ink-200">
          Планы и работы по сайтам. Выполнение задачи пишет событие в журнал сайта.
        </p>
      </div>

      <TaskSummaryCards summary={data.summary} filters={data.filters} />

      <TaskCreateForm
        websites={data.websites}
        defaultWebsiteId={data.filters.websiteId || undefined}
        openByDefault={data.filters.action === 'create' || Boolean(data.filters.websiteId)}
      />

      <TaskFiltersBar
        filters={data.filters}
        websites={data.websites}
        groups={data.groups}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-ink-50">Список</h2>
            <p className="mt-1 text-sm text-ink-200">
              Показано {data.filteredItems.length} из {data.items.length}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-ink-200 hover:text-ink-50">
            К обзору
          </Link>
        </div>
        <TaskList items={data.filteredItems} />
      </section>
    </div>
  );
}
