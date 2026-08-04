'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { setWebsiteFavoriteAction, type FavoriteActionState } from '@/app/(app)/websites/favorites/actions';
import { preserveScroll } from '@/components/ui/ActionMenu';
import { cn } from '@/lib/ui/cn';

function StarSubmit({ isFavorite }: { isFavorite: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition-colors disabled:opacity-60 sm:h-9 sm:w-9',
        isFavorite
          ? 'border-amber-400 bg-amber-50 text-amber-500'
          : 'border-ink-700 bg-white text-ink-300 hover:border-amber-400 hover:text-amber-500',
      )}
    >
      {pending ? (
        <span className="text-xs">…</span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85L12 3.5z"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * Favorite toggle button. Uses a real server action + `preserveScroll` refresh
 * so favorite state stays correct even if the page re-sorts rows around it.
 */
export function WebsiteFavoriteStar({
  websiteId,
  isFavorite,
  disabled,
  disabledTitle = 'Архивный сайт нельзя добавить в избранное',
}: {
  websiteId: string;
  isFavorite: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    setWebsiteFavoriteAction,
    {} as FavoriteActionState,
  );

  useEffect(() => {
    if (state.ok) {
      preserveScroll(() => router.refresh());
    }
  }, [state, router]);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        aria-label={disabledTitle}
        title={disabledTitle}
        className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-[10px] border border-ink-800 text-ink-700 opacity-50 sm:h-9 sm:w-9"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85L12 3.5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="websiteId" value={websiteId} />
      <input type="hidden" name="favorite" value={isFavorite ? '0' : '1'} />
      <StarSubmit isFavorite={isFavorite} />
      {state.error ? <p className="mt-1 max-w-[8rem] text-[10px] text-red-700">{state.error}</p> : null}
    </form>
  );
}
