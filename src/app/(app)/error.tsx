'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-ink-50">Не удалось загрузить страницу</h1>
      <p className="mt-2 text-sm text-ink-200">
        Попробуйте ещё раз. Если ошибка повторяется, вернитесь к списку сайтов.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-ink-200">Код: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Повторить
        </button>
        <Link href="/websites" className="btn-secondary">
          Вернуться к сайтам
        </Link>
      </div>
    </main>
  );
}
