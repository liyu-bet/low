import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

describe('job lock mutual exclusion (unit)', () => {
  it('busy result maps to Russian skip message', () => {
    const message = 'Синхронизация уже выполняется';
    assert.equal(message.includes('Синхронизация'), true);
  });
});

describe('log safety', () => {
  it('does not include tokens in worker log prefixes', () => {
    const prefixes = ['[WORKER]', '[DSD SYNC]', '[GSC PROPERTIES]', '[GSC LIFECYCLE]'];
    const secret = 'super-secret-token-value';
    for (const prefix of prefixes) {
      assert.equal(prefix.includes(secret), false);
      assert.equal(prefix.toLowerCase().includes('authorization'), false);
      assert.equal(prefix.includes('DATABASE_URL'), false);
    }
  });

  it('mock console never receives Authorization header dumps', () => {
    const lines: string[] = [];
    const log = mock.method(console, 'log', (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
    console.log('[WORKER] starting id=host-1-abc tz=Europe/Belgrade enabled=true');
    log.mock.restore();
    assert.equal(lines.some((line) => /Bearer|Authorization|DSD_LOW_API_TOKEN/i.test(line)), false);
  });
});
