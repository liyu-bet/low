import { runGscLifecycleSync } from '../src/lib/gsc/lifecycle';
import { requireGscClientConfig } from '../src/lib/gsc/config';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  const config = requireGscClientConfig();
  console.log(
    `[GSC LIFECYCLE] backfill start concurrency=${config.lifecycleConcurrency} maxPerRun=${config.lifecycleMaxPropertiesPerRun}`,
  );
  const summary = await runGscLifecycleSync({
    trigger: 'worker',
    workerId: 'backfill-lifecycle',
    config,
  });
  console.log(
    JSON.stringify(
      {
        syncRunId: summary.syncRunId,
        status: summary.status,
        processed: summary.processed,
        createdCount: summary.createdCount,
        updatedCount: summary.updatedCount,
        errorCount: summary.errorCount,
        error: summary.error,
        metadata: summary.metadata,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
