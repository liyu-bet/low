import { createManualEventAction } from '@/app/(app)/websites/[id]/events/actions';
import { EventForm } from '@/components/EventForm';
import { EventTimeline } from '@/components/EventTimeline';
import { WebsiteDsdBlock } from '@/components/WebsiteDsdBlock';
import { WebsiteGscBlock } from '@/components/WebsiteGscBlock';
import { WebsiteAttentionBlock } from '@/components/website-profile/WebsiteAttentionBlock';
import { WebsiteEventFilters } from '@/components/website-profile/WebsiteEventFilters';
import { WebsiteEventStatsCards } from '@/components/website-profile/WebsiteEventStats';
import { WebsiteLifecycle } from '@/components/website-profile/WebsiteLifecycle';
import { WebsiteNextTasks } from '@/components/website-profile/WebsiteNextTasks';
import { WebsiteProfileHeader } from '@/components/website-profile/WebsiteProfileHeader';
import { WebsiteSettingsBlock } from '@/components/website-profile/WebsiteSettingsBlock';
import { WebsiteStatusOverview } from '@/components/website-profile/WebsiteStatusOverview';
import {
  WebsiteMilestoneRail,
} from '@/components/websites/WebsiteMilestoneRail';
import { WebsiteLifeTree } from '@/components/websites/WebsiteLifeTree';
import { toMilestoneRailItems } from '@/lib/websites/milestones';
import { toLifeTreeNodeViews } from '@/lib/websites/life-tree';
import {
  getWebsiteProfile,
  isWebsiteProfileNotFoundError,
} from '@/lib/websites/profile';
import { listActiveUsersForAssign } from '@/lib/auth/users';
import { requireUserSession } from '@/app/login/actions';
import { notFound } from 'next/navigation';

export default async function WebsiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  let profile;
  try {
    profile = await getWebsiteProfile(id, query);
  } catch (error) {
    if (isWebsiteProfileNotFoundError(error)) notFound();
    throw error;
  }

  const session = await requireUserSession();
  const assignees = await listActiveUsersForAssign();
  const { website } = profile;
  const createEvent = createManualEventAction.bind(null, website.id);
  const archived = Boolean(website.archivedAt || website.status === 'ARCHIVED');
  const isAdmin = session.role === 'ADMIN';
  const dsdLabel =
    profile.dsdIntegration && profile.overview.dsdAvailability !== 'Нет связи с DSD'
      ? 'подключено'
      : 'нет данных';
  const gscLabel = profile.overview.gscLinkedCount > 0 ? 'подключено' : 'нет данных';

  return (
    <div className="space-y-8">
      {/* A. Header */}
      <WebsiteProfileHeader
        website={website}
        openUrl={profile.overview.openUrl}
        showSettings={isAdmin}
      />

      {/* B. Life path */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">Жизненный путь</h2>
        <div className="rounded-card border border-ink-700 bg-white p-4">
          <WebsiteMilestoneRail items={toMilestoneRailItems(profile.milestones)} />
          <p className="mt-3 text-sm text-ink-100">{profile.nextStageLabel}</p>
        </div>
      </section>

      {/* C. Next tasks */}
      <WebsiteNextTasks
        websiteId={website.id}
        archived={archived}
        openTasks={profile.tasks.openTasks}
        assignees={assignees}
      />

      {/* D. Life tree */}
      <WebsiteLifeTree
        past={toLifeTreeNodeViews(profile.lifeTree.past)}
        future={toLifeTreeNodeViews(profile.lifeTree.future)}
      />

      {/* Progressive disclosure */}
      <details className="rounded-card border border-ink-700 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-ink-50">
          Дополнительная информация
        </summary>
        <div className="space-y-3 border-t border-ink-700 px-4 py-4">
          <details className="rounded border border-ink-700">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink-50">
              Интеграции
              <span className="ml-2 font-normal text-ink-200">
                DSD: {dsdLabel} · GSC: {gscLabel}
              </span>
            </summary>
            <div id="integrations" className="space-y-4 border-t border-ink-700 p-3">
              {profile.attention ? (
                <WebsiteAttentionBlock attention={profile.attention} websiteId={website.id} />
              ) : null}
              <WebsiteDsdBlock integration={profile.dsdIntegration} />
              <WebsiteGscBlock
                integrations={profile.gscIntegrations}
                gscFirstSeenAt={website.gscFirstSeenAt}
                firstImpressionAt={website.firstImpressionAt}
                firstClickAt={website.firstClickAt}
              />
            </div>
          </details>

          <details className="rounded border border-ink-700">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink-50">
              Полный журнал
            </summary>
            <div id="history" className="space-y-4 border-t border-ink-700 p-3">
              <WebsiteEventStatsCards stats={profile.eventStats} />
              <WebsiteEventFilters
                websiteId={website.id}
                query={profile.eventsQuery}
                total={profile.eventsTotal}
                pageSize={profile.eventsPageSize}
              />
              <EventTimeline events={profile.events} />
              <section id="add-event">
                <EventForm action={createEvent} />
              </section>
            </div>
          </details>

          {isAdmin ? (
            <details id="settings" className="rounded border border-ink-700">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink-50">
                Настройки сайта
              </summary>
              <div className="space-y-4 border-t border-ink-700 p-3">
                <WebsiteSettingsBlock website={website} />
              </div>
            </details>
          ) : null}

          <details className="rounded border border-ink-700">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink-50">
              Технические данные
            </summary>
            <div className="space-y-4 border-t border-ink-700 p-3">
              <WebsiteStatusOverview website={website} overview={profile.overview} />
              <WebsiteLifecycle website={website} intervals={profile.intervals} />
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
