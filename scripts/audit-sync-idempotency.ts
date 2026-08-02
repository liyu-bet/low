/**
 * Safe idempotency audit for production DSD + GSC properties sync.
 * Run inside worker/web container with DATABASE_URL set.
 * Does not print tokens. Does not run lifecycle.
 */
import { prisma } from '../src/lib/db/prisma';
import { runDsdSync } from '../src/lib/dsd/sync';
import { runGscPropertiesSync } from '../src/lib/gsc/sync';

async function counts() {
  return {
    websites: await prisma.website.count(),
    integrations: await prisma.websiteIntegration.count(),
    events: await prisma.websiteEvent.count(),
    accounts: await prisma.accountReference.count(),
  };
}

async function main() {
  const before = await counts();
  console.log('before', JSON.stringify(before));

  const dsd1 = await runDsdSync({ trigger: 'worker', workerId: 'audit-idempotency', mode: 'full' });
  console.log('dsd1', dsd1.status, dsd1.processed, dsd1.createdCount, dsd1.errorCount);

  const mid = await counts();
  console.log('after_dsd1', JSON.stringify(mid));

  const dsd2 = await runDsdSync({ trigger: 'worker', workerId: 'audit-idempotency', mode: 'full' });
  console.log('dsd2', dsd2.status, dsd2.processed, dsd2.createdCount, dsd2.errorCount);

  const afterDsd = await counts();
  console.log('after_dsd2', JSON.stringify(afterDsd));

  const gsc1 = await runGscPropertiesSync({
    trigger: 'worker',
    workerId: 'audit-idempotency',
    mode: 'full',
  });
  console.log('gsc1', gsc1.status, gsc1.processed, gsc1.createdCount, gsc1.errorCount);

  const afterGsc1 = await counts();
  console.log('after_gsc1', JSON.stringify(afterGsc1));

  const gsc2 = await runGscPropertiesSync({
    trigger: 'worker',
    workerId: 'audit-idempotency',
    mode: 'full',
  });
  console.log('gsc2', gsc2.status, gsc2.processed, gsc2.createdCount, gsc2.errorCount);

  const after = await counts();
  console.log('after_gsc2', JSON.stringify(after));

  const ok =
    after.websites === afterDsd.websites &&
    after.integrations === afterGsc1.integrations &&
    after.events === afterGsc1.events &&
    after.accounts === afterGsc1.accounts &&
    afterDsd.websites === mid.websites &&
    afterDsd.events === mid.events;

  // Second unchanged DSD run should not grow websites/events
  const dsdIdempotent =
    afterDsd.websites === mid.websites &&
    afterDsd.integrations === mid.integrations &&
    afterDsd.events === mid.events &&
    afterDsd.accounts === mid.accounts;

  const gscIdempotent =
    after.websites === afterGsc1.websites &&
    after.integrations === afterGsc1.integrations &&
    after.events === afterGsc1.events &&
    after.accounts === afterGsc1.accounts;

  console.log(
    JSON.stringify({
      dsdIdempotent,
      gscIdempotent,
      before,
      after,
      ok: dsdIdempotent && gscIdempotent,
    }),
  );

  if (!dsdIdempotent || !gscIdempotent) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'audit failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
