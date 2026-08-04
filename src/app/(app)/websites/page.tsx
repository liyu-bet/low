import { requireUserSession } from '@/app/login/actions';
import { getWebsitesWorkspace } from '@/lib/websites/workspace';
import { toMilestoneRailItems } from '@/lib/websites/milestones';
import { WebsitesWorkspace } from '@/components/websites/WebsitesWorkspace';

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await requireUserSession();
  const params = await searchParams;
  const includeArchived = params.archived === '1';
  const data = await getWebsitesWorkspace({ includeArchived, userId: session.userId });

  const rows = data.rows.map((site) => ({
    id: site.id,
    domain: site.domain,
    name: site.name,
    primaryUrl: site.primaryUrl,
    status: site.status,
    lifecycleStage: site.lifecycleStage,
    group: site.group,
    tags: site.tags,
    archivedAt: site.archivedAt?.toISOString() ?? null,
    availability: site.availability,
    milestones: toMilestoneRailItems(site.milestones),
    openTasksCount: site.openTasksCount,
    nearestTask: site.nearestTask,
    normalizedDomain: site.domain.toLowerCase(),
    launchedAt: site.launchedAt?.toISOString() ?? null,
    launchedAtManual: site.launchedAtManual?.toISOString() ?? null,
    firstHealthyAt: site.firstHealthyAt?.toISOString() ?? null,
    gscFirstSeenAt: site.gscFirstSeenAt?.toISOString() ?? null,
    gscAddedAtManual: site.gscAddedAtManual?.toISOString() ?? null,
    firstImpressionAt: site.firstImpressionAt?.toISOString() ?? null,
    firstImpressionAtManual: site.firstImpressionAtManual?.toISOString() ?? null,
    firstClickAt: site.firstClickAt?.toISOString() ?? null,
    firstClickAtManual: site.firstClickAtManual?.toISOString() ?? null,
    lastWorkAt: null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.createdAt.toISOString(),
    isFavorite: site.isFavorite,
    favoriteCreatedAt: site.favoriteCreatedAt?.toISOString() ?? null,
    performance: site.performance,
  }));

  const recommendations = data.recommendations;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">Сайты</h1>
      <WebsitesWorkspace
        rows={rows}
        groups={data.groups}
        includeArchived={includeArchived}
        canManage={session.role === 'ADMIN'}
        userId={session.userId}
        recommendations={recommendations}
      />
    </div>
  );
}
