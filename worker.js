/**
 * LOW worker entry.
 *
 * Iteration 1 scaffold: boots and idles with a heartbeat.
 * Sync jobs against DSD/GSC read-only M2M APIs are not implemented yet.
 * This process never opens DSD or GSC database connections.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for the LOW worker');
  }

  // TODO(iteration-2): JobLock + DSD/GSC read-only sync jobs via M2M HTTP APIs only.
  console.log('[low-worker] started (iteration 1 idle scaffold — no sync jobs)');

  const heartbeatMs = Number(process.env.WORKER_HEARTBEAT_MS || 60_000);
  setInterval(() => {
    console.log(`[low-worker] heartbeat ${new Date().toISOString()}`);
  }, heartbeatMs);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[low-worker] fatal', error);
  process.exit(1);
});
