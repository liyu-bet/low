import { requireUserSession } from '@/app/login/actions';
import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';
import { getTasksPageData } from '@/lib/tasks/service';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await requireUserSession();
  const data = await getTasksPageData(params, { currentUserId: session.userId });

  return <TaskWorkspace data={data} session={session} />;
}
