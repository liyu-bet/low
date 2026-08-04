import { prisma } from '@/lib/db/prisma';

export class FavoriteNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FavoriteNotAllowedError';
  }
}

export function isArchivedWebsite(site: {
  archivedAt: Date | null;
  status: string;
  lifecycleStage: string;
}): boolean {
  return (
    site.archivedAt != null || site.status === 'ARCHIVED' || site.lifecycleStage === 'ARCHIVED'
  );
}

export async function listFavoriteWebsiteIds(userId: string): Promise<string[]> {
  const rows = await prisma.websiteFavorite.findMany({
    where: { userId },
    select: { websiteId: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => row.websiteId);
}

export async function isWebsiteFavorite(userId: string, websiteId: string): Promise<boolean> {
  const row = await prisma.websiteFavorite.findUnique({
    where: { userId_websiteId: { userId, websiteId } },
    select: { userId: true },
  });
  return Boolean(row);
}

/** Idempotent add. Rejects first-time favorite of archived/missing websites. */
export async function addWebsiteFavorite(userId: string, websiteId: string): Promise<void> {
  const existing = await prisma.websiteFavorite.findUnique({
    where: { userId_websiteId: { userId, websiteId } },
    select: { userId: true },
  });
  if (existing) return;

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, archivedAt: true, status: true, lifecycleStage: true },
  });
  if (!website) {
    throw new FavoriteNotAllowedError('Сайт не найден');
  }
  if (isArchivedWebsite(website)) {
    throw new FavoriteNotAllowedError('Архивный сайт нельзя добавить в избранное');
  }

  await prisma.websiteFavorite.create({
    data: { userId, websiteId },
  });
}

/** Idempotent remove. Allowed even for archived websites. */
export async function removeWebsiteFavorite(userId: string, websiteId: string): Promise<void> {
  await prisma.websiteFavorite.deleteMany({
    where: { userId, websiteId },
  });
}

export async function setWebsiteFavorite(
  userId: string,
  websiteId: string,
  favorite: boolean,
): Promise<void> {
  if (favorite) {
    await addWebsiteFavorite(userId, websiteId);
    return;
  }
  await removeWebsiteFavorite(userId, websiteId);
}
