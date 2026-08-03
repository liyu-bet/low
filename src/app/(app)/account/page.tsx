import { requireUserSession } from '@/app/login/actions';
import { AccountProfileForm } from '@/components/account/AccountProfileForm';
import Link from 'next/link';

export default async function AccountPage() {
  const session = await requireUserSession();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Мой профиль</h1>
        <p className="mt-1 text-sm text-ink-200">Имя и пароль. Email меняется только администратором.</p>
      </div>

      <dl className="rounded-card border border-ink-700 bg-white p-4 text-sm">
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-ink-200">Email</dt>
          <dd className="font-medium text-ink-50">{session.email}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-ink-200">Роль</dt>
          <dd className="font-medium text-ink-50">
            {session.role === 'ADMIN' ? 'Администратор' : 'Участник'}
          </dd>
        </div>
      </dl>

      <AccountProfileForm name={session.name} />

      <p>
        <Link href="/account/password" className="text-sm text-moss-700 hover:underline">
          Сменить пароль
        </Link>
      </p>
    </div>
  );
}
