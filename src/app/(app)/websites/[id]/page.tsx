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
import { Disclosure } from '@/components/ui/Disclosure';
import { Section, SectionHeader } from '@/components/ui/layout';
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

      <Section>
        <SectionHeader title="Этапы" />
        <WebsiteMilestoneRail items={toMilestoneRailItems(profile.milestones)} />
        <p className="text-sm text-ink-100">
          {profile.nextStageLabel}
          {showClarify ? (
            <>
              {' '}
              <a href="#settings" className="text-moss-700 underline-offset-2 hover:underline">
                Уточнить
              </a>
            </>
          ) : null}
        </p>
      </Section>

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

      <div className="border-t border-ink-800 pt-1">
        <Disclosure
          title="Интеграции"
          summaryExtra={`DSD ${dsdOk ? 'подключено' : 'нет данных'} · GSC ${gscOk ? 'подключено' : 'нет данных'}`}
        >
          <div id="integrations" className="space-y-4">
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
        </Disclosure>

        <Disclosure title="Полный журнал">
          <div id="history" className="space-y-4">
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
        </Disclosure>

        {isAdmin ? (
          <Disclosure id="settings" title="Настройки">
            <WebsiteSettingsBlock website={website} />
          </Disclosure>
        ) : null}

        <Disclosure title="Технические данные">
          <WebsiteStatusOverview website={website} overview={profile.overview} />
          <WebsiteLifecycle website={website} intervals={profile.intervals} />
        </Disclosure>
      </div>
    </div>
  );
}
