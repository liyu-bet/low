import { requireUserSession, logoutAction } from '@/app/login/actions';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';

export default async function ForcedPasswordPage() {
  const session = await requireUserSession({ allowMustChangePassword: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Смена пароля</h1>
        <p className="mt-1 text-sm text-ink-200">
          {session.mustChangePassword
            ? 'Нужно задать новый пароль перед продолжением работы.'
            : 'Задайте новый пароль для своей учётной записи.'}
        </p>
      </div>
      <ChangePasswordForm requireCurrent={!session.mustChangePassword} />
      <form action={logoutAction}>
        <button type="submit" className="text-sm text-ink-200 underline-offset-2 hover:underline">
          Выйти
        </button>
      </form>
    </div>
  );
}
