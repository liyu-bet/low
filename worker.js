/**
 * Docker / package entry. Delegates to TypeScript worker via tsx.
 * Sync jobs live in src/worker/main.ts — this file must not log secrets.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const entry = path.join(__dirname, 'src', 'worker', 'main.ts');
const child = spawn(
  process.execPath,
  [require.resolve('tsx/cli'), entry, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[WORKER] failed to start tsx:', error.message);
  process.exit(1);
});
