/**
 * Deterministic e2e seed for a dedicated PostgreSQL database.
 * Never targets production. Idempotent for e2e domains/emails only.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';
import {
  assertE2eSeedAllowed,
  E2E_SITES,
  E2E_USERS,
} from '../src/lib/e2e/guards';

assertE2eSeedAllowed(process.env);

const prisma = new PrismaClient();

const E2E_EMAILS = [E2E_USERS.admin.email, E2E_USERS.member.email] as const;
const E2E_DOMAINS = [
  E2E_SITES.complete.normalizedDomain,
  E2E_SITES.missingLaunch.normalizedDomain,
  E2E_SITES.nextStage.normalizedDomain,
  E2E_SITES.favoriteCandidate.normalizedDomain,
  E2E_SITES.archivable.normalizedDomain,
] as const;

function utcDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'MEMBER';
}) {
  const passwordHash = hashPassword(input.password);
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      isActive: true,
      mustChangePassword: false,
      sessionVersion: 1,
    },
    update: {
      name: input.name,
      passwordHash,
      role: input.role,
      isActive: true,
      mustChangePassword: false,
    },
  });
}

async function cleanupE2eData() {
  // Cascade: delete websites (tasks/events), then e2e users (and any leftover temp users).
  await prisma.website.deleteMany({
    where: { normalizedDomain: { in: [...E2E_DOMAINS] } },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: [...E2E_EMAILS] } },
        { email: { endsWith: '@e2e-temp.test' } },
      ],
    },
  });
}

async function createWebsite(
  data: Prisma.WebsiteCreateInput,
): Promise<{ id: string; domain: string }> {
  const website = await prisma.website.create({ data });
  return { id: website.id, domain: website.domain };
}

/**
 * Fresh, schema-valid GSC externalData with an embedded performance snapshot,
 * so `favoriteCandidate` qualifies as a recommendation without touching real GSC.
 */
function gscExternalDataWithPerformance(siteUrl: string) {
  const now = new Date();
  // GSC's latest available day trails "today" by about two days.
  const dataDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    siteUrl,
    propertyType: 'domain',
    permissionLevel: 'siteOwner',
    label: null,
    isSelected: true,
    gscFirstSeenAt: now.toISOString(),
    gscUpdatedAt: now.toISOString(),
    connection: { id: 'e2e-gsc-conn', email: 'e2e-gsc-owner@example.test', name: 'E2E GSC Owner' },
    performance: {
      propertyId: siteUrl,
      siteUrl,
      period: 'latest_available_day',
      periodStart: dataDate,
      periodEnd: dataDate,
      dataDate,
      impressions: 420,
      clicks: 37,
      generatedAt: now.toISOString(),
    },
  };
}

async function main() {
  console.log('e2e-seed: starting');
  await cleanupE2eData();

  const admin = await upsertUser({
    ...E2E_USERS.admin,
    role: 'ADMIN',
  });
  const member = await upsertUser({
    ...E2E_USERS.member,
    role: 'MEMBER',
  });

  const complete = await createWebsite({
    domain: E2E_SITES.complete.domain,
    normalizedDomain: E2E_SITES.complete.normalizedDomain,
    name: E2E_SITES.complete.name,
    primaryUrl: `https://${E2E_SITES.complete.domain}`,
    status: 'ACTIVE',
    lifecycleStage: 'GROWING',
    group: 'e2e',
    createdAt: utcDay('2024-01-01'),
    launchedAt: utcDay('2024-02-01'),
    firstHealthyAt: utcDay('2024-02-05'),
    gscFirstSeenAt: utcDay('2024-02-10'),
    firstImpressionAt: utcDay('2024-03-01'),
    firstClickAt: utcDay('2024-03-10'),
    lastWorkAt: utcDay('2024-04-01'),
  });

  const missingLaunch = await createWebsite({
    domain: E2E_SITES.missingLaunch.domain,
    normalizedDomain: E2E_SITES.missingLaunch.normalizedDomain,
    name: E2E_SITES.missingLaunch.name,
    primaryUrl: `https://${E2E_SITES.missingLaunch.domain}`,
    status: 'ACTIVE',
    lifecycleStage: 'INDEXING',
    group: 'e2e',
    createdAt: utcDay('2024-01-15'),
    launchedAt: null,
    firstHealthyAt: utcDay('2024-02-20'),
    gscFirstSeenAt: utcDay('2024-03-01'),
    firstImpressionAt: utcDay('2024-03-15'),
    firstClickAt: utcDay('2024-03-20'),
  });

  const nextStage = await createWebsite({
    domain: E2E_SITES.nextStage.domain,
    normalizedDomain: E2E_SITES.nextStage.normalizedDomain,
    name: E2E_SITES.nextStage.name,
    primaryUrl: `https://${E2E_SITES.nextStage.domain}`,
    status: 'ACTIVE',
    lifecycleStage: 'LAUNCHED',
    group: 'e2e',
    createdAt: utcDay('2024-05-01'),
    launchedAt: utcDay('2024-05-10'),
    firstHealthyAt: null,
    gscFirstSeenAt: null,
    firstImpressionAt: null,
    firstClickAt: null,
  });

  const favoriteCandidate = await createWebsite({
    domain: E2E_SITES.favoriteCandidate.domain,
    normalizedDomain: E2E_SITES.favoriteCandidate.normalizedDomain,
    name: E2E_SITES.favoriteCandidate.name,
    primaryUrl: `https://${E2E_SITES.favoriteCandidate.domain}`,
    status: 'ACTIVE',
    lifecycleStage: 'GROWING',
    group: 'e2e',
    createdAt: utcDay('2024-01-01'),
    launchedAt: utcDay('2024-02-01'),
    firstHealthyAt: utcDay('2024-02-05'),
    gscFirstSeenAt: utcDay('2024-02-10'),
    firstImpressionAt: utcDay('2024-03-01'),
    firstClickAt: utcDay('2024-03-10'),
    lastWorkAt: utcDay('2024-04-01'),
  });

  await prisma.websiteIntegration.create({
    data: {
      websiteId: favoriteCandidate.id,
      system: 'GSC',
      externalEntityId: `sc-domain:${E2E_SITES.favoriteCandidate.normalizedDomain}`,
      externalKey: `sc-domain:${E2E_SITES.favoriteCandidate.normalizedDomain}`,
      status: 'LINKED',
      lastSyncedAt: new Date(),
      externalData: gscExternalDataWithPerformance(
        `sc-domain:${E2E_SITES.favoriteCandidate.normalizedDomain}`,
      ),
    },
  });

  await createWebsite({
    domain: E2E_SITES.archivable.domain,
    normalizedDomain: E2E_SITES.archivable.normalizedDomain,
    name: E2E_SITES.archivable.name,
    primaryUrl: `https://${E2E_SITES.archivable.domain}`,
    status: 'ACTIVE',
    lifecycleStage: 'GROWING',
    group: 'e2e',
    createdAt: utcDay('2024-06-01'),
    launchedAt: utcDay('2024-06-10'),
  });

  // Tasks — keep open list short so profile “next tasks” (max 5) has room for creates.
  const today = (() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  })();
  const overdueDay = new Date(today);
  overdueDay.setUTCDate(overdueDay.getUTCDate() - 2);
  const upcomingDay = new Date(today);
  upcomingDay.setUTCDate(upcomingDay.getUTCDate() + 5);

  await prisma.websiteTask.createMany({
    data: [
      {
        websiteId: complete.id,
        title: 'E2E TODO no due',
        status: 'TODO',
        priority: 'MEDIUM',
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: complete.id,
        title: 'E2E TODO with due',
        status: 'TODO',
        priority: 'HIGH',
        dueAt: utcDay('2026-12-31'),
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: complete.id,
        title: 'E2E DONE by admin',
        status: 'DONE',
        priority: 'LOW',
        completedAt: utcDay('2024-04-02'),
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
        completedByUserId: admin.id,
      },
      {
        websiteId: complete.id,
        title: 'E2E assigned to MEMBER',
        status: 'TODO',
        priority: 'HIGH',
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: member.id,
      },
      {
        websiteId: missingLaunch.id,
        title: 'E2E overdue task',
        status: 'TODO',
        priority: 'HIGH',
        dueAt: overdueDay,
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: missingLaunch.id,
        title: 'E2E due today',
        status: 'TODO',
        priority: 'MEDIUM',
        dueAt: today,
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: missingLaunch.id,
        title: 'E2E upcoming task',
        status: 'TODO',
        priority: 'LOW',
        dueAt: upcomingDay,
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: nextStage.id,
        title: 'E2E foreign admin-only task',
        status: 'TODO',
        priority: 'MEDIUM',
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: nextStage.id,
        title: 'E2E IN_PROGRESS task',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
      {
        websiteId: nextStage.id,
        title: 'E2E MEMBER created open',
        status: 'TODO',
        priority: 'MEDIUM',
        createdBy: member.name,
        createdByUserId: member.id,
        assignedToUserId: member.id,
      },
      {
        websiteId: nextStage.id,
        title: 'E2E ADMIN owned open',
        status: 'TODO',
        priority: 'MEDIUM',
        createdBy: admin.name,
        createdByUserId: admin.id,
        assignedToUserId: admin.id,
      },
    ],
  });

  // Events
  await prisma.websiteEvent.createMany({
    data: [
      {
        websiteId: complete.id,
        eventType: 'work',
        category: 'TECHNICAL',
        title: 'E2E technical work by admin',
        description: 'Seeded technical work',
        source: 'MANUAL',
        occurredAt: utcDay('2024-04-03'),
        createdBy: admin.name,
        createdByUserId: admin.id,
        dedupeKey: 'e2e:complete:tech-work',
      },
      {
        websiteId: complete.id,
        eventType: 'work',
        category: 'SEO',
        title: 'E2E SEO work by member',
        description: 'Seeded SEO work',
        source: 'MANUAL',
        occurredAt: utcDay('2024-04-04'),
        createdBy: member.name,
        createdByUserId: member.id,
        dedupeKey: 'e2e:complete:seo-work',
      },
      {
        websiteId: complete.id,
        eventType: 'note',
        category: 'NOTE',
        title: 'E2E note',
        description: 'Seeded note',
        source: 'MANUAL',
        occurredAt: utcDay('2024-04-05'),
        createdBy: admin.name,
        createdByUserId: admin.id,
        dedupeKey: 'e2e:complete:note',
      },
      {
        websiteId: complete.id,
        eventType: 'SITE_CREATED',
        category: 'LIFECYCLE',
        title: 'Сайт добавлен в LOW',
        source: 'SYSTEM',
        sourceSystem: 'SYSTEM',
        occurredAt: utcDay('2024-01-01'),
        createdBy: 'SYSTEM',
        createdByUserId: null,
        dedupeKey: 'e2e:complete:site-created',
      },
      {
        websiteId: missingLaunch.id,
        eventType: 'note',
        category: 'NOTE',
        title: 'E2E legacy note',
        description: 'Legacy authorship only',
        source: 'MANUAL',
        occurredAt: utcDay('2024-03-21'),
        createdBy: 'legacy-author@example.test',
        createdByUserId: null,
        dedupeKey: 'e2e:missing:legacy-note',
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        admin: admin.email,
        member: member.email,
        sites: [
          complete.domain,
          missingLaunch.domain,
          nextStage.domain,
          favoriteCandidate.domain,
          E2E_SITES.archivable.domain,
        ],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('e2e-seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
