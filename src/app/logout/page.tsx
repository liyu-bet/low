import { logoutAction } from '@/app/login/actions';

export default function LogoutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded bg-moss-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Подтвердить выход
        </button>
      </form>
    </main>
  );
}
