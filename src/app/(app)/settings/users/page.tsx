import { requireAdminSession } from '@/app/login/actions';
import { UsersAdminPanel } from '@/components/settings/UsersAdminPanel';
import { listUsersForAdmin } from '@/lib/auth/users';

export default async function UsersSettingsPage() {
  const session = await requireAdminSession();
  const users = await listUsersForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Пользователи</h1>
        <p className="mt-1 text-sm text-ink-200">
          Создание и отключение учётных записей. Пользователей не удаляют — только отключают.
        </p>
      </div>
      <UsersAdminPanel users={users} currentUserId={session.userId} />
    </div>
  );
}
