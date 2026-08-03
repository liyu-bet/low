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
import { WebsiteMilestoneRail } from '@/components/websites/WebsiteMilestoneRail';
import { WebsiteLifeTree } from '@/components/websites/WebsiteLifeTree';
import { toMilestoneRailItems, computeMilestoneProgress } from '@/lib/websites/milestones';
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
  const dsdOk =
    profile.dsdIntegration && profile.overview.dsdAvailability !== 'Нет связи с DSD';
  const gscOk = profile.overview.gscLinkedCount > 0;
  const progress = computeMilestoneProgress(profile.milestones);
  const showClarify = isAdmin && progress.missingEarlier.length > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <WebsiteProfileHeader
        website={website}
        openUrl={profile.overview.openUrl}
        showSettings={isAdmin}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-50 sm:text-xl">Этапы</h2>
        <div className="py-1">
          <WebsiteMilestoneRail items={toMilestoneRailItems(profile.milestones)} />
          <p className="mt-2 text-sm text-ink-100">
            {profile.nextStageLabel}
            {showClarify ? (
              <>
                {' '}
                <a
                  href="#settings"
                  className="text-moss-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
                >
                  Уточнить
                </a>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <WebsiteNextTasks
        websiteId={website.id}
        archived={archived}
        openTasks={profile.tasks.openTasks}
        assignees={assignees}
      />

      <WebsiteLifeTree
        manual={toLifeTreeNodeViews(profile.lifeTree.manual)}
        automatic={toLifeTreeNodeViews(profile.lifeTree.automatic)}
      />

      <div className="space-y-0 border-t border-ink-800 pt-2">
        <details className="border-b border-ink-800">
          <summary className="cursor-pointer py-2.5 text-sm font-medium text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500">
            Интеграции
            <span className="ml-2 font-normal text-ink-200">
              DSD {dsdOk ? 'подключено' : 'нет данных'} · GSC {gscOk ? 'подключено' : 'нет данных'}
            </span>
          </summary>
          <div id="integrations" className="space-y-4 pb-4 pt-1">
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

        <details className="border-b border-ink-800">
          <summary className="cursor-pointer py-2.5 text-sm font-medium text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500">
            Полный журнал
          </summary>
          <div id="history" className="space-y-4 pb-4 pt-1">
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
          <details id="settings" className="border-b border-ink-800">
            <summary className="cursor-pointer py-2.5 text-sm font-medium text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500">
              Настройки
            </summary>
            <div className="space-y-4 pb-4 pt-1">
              <WebsiteSettingsBlock website={website} />
            </div>
          </details>
        ) : null}

        <details className="border-b border-ink-800">
          <summary className="cursor-pointer py-2.5 text-sm font-medium text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500">
            Технические данные
          </summary>
          <div className="space-y-4 pb-4 pt-1">
            <WebsiteStatusOverview website={website} overview={profile.overview} />
            <WebsiteLifecycle website={website} intervals={profile.intervals} />
          </div>
        </details>
      </div>
    </div>
  );
}
