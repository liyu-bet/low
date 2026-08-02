import { APP_NAME } from '@/lib/constants';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/dashboard';

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-ink-700 bg-white p-6 shadow-card sm:p-8">
        <p className="text-2xl font-bold tracking-tight text-ink-50">{APP_NAME}</p>
        <h1 className="mt-2 text-lg font-semibold text-ink-50">Вход администратора</h1>
        <p className="mt-1 mb-6 text-sm text-ink-200">Доступ одного администратора.</p>
        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
