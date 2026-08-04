'use server';

import { revalidatePath } from 'next/cache';
import { requireUserSession } from '@/app/login/actions';
import { toSafeActionError } from '@/lib/errors/safe-action';
import { setWebsiteFavorite } from '@/lib/websites/favorites';

export type FavoriteActionState = {
  ok?: boolean;
  error?: string;
  isFavorite?: boolean;
};

/**
 * Toggles favorite state for the current session user only.
 * Any `userId` present in FormData (e.g. forged by the browser) is ignored.
 */
export async function setWebsiteFavoriteAction(
  _prev: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  const session = await requireUserSession();
  const websiteId = String(formData.get('websiteId') ?? '').trim();
  const favorite = String(formData.get('favorite') ?? '') === '1';

  if (!websiteId) {
    return { error: 'Сайт не найден' };
  }

  try {
    await setWebsiteFavorite(session.userId, websiteId, favorite);
    revalidatePath('/websites');
    revalidatePath(`/websites/${websiteId}`);
    return { ok: true, isFavorite: favorite };
  } catch (error) {
    return { error: toSafeActionError(error, 'Не удалось обновить избранное') };
  }
}
