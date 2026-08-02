import { prisma } from '../src/lib/db/prisma';

async function main() {
  const counts = {
    websites: await prisma.website.count(),
    events: await prisma.websiteEvent.count(),
    integrations: await prisma.websiteIntegration.count(),
    syncRuns: await prisma.syncRun.count(),
    accounts: await prisma.accountReference.count(),
    heartbeats: await prisma.workerHeartbeat.count(),
  };
  console.log(JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error('count_failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
