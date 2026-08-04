import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isFatalBrowserMessage, isIgnorableBrowserMessage } from './browser-errors';

describe('browser error filtering', () => {
  it('ignores tiny documented allowlist', () => {
    assert.equal(isIgnorableBrowserMessage('Download the React DevTools for a better experience'), true);
    assert.equal(isIgnorableBrowserMessage('[HMR] connected'), true);
  });

  it('treats hydration and dynamic import failures as fatal', () => {
    assert.equal(isFatalBrowserMessage('Hydration failed because the initial UI'), true);
    assert.equal(
      isFatalBrowserMessage('Failed to fetch dynamically imported module: /_next/static/x.js'),
      true,
    );
  });

  it('does not treat ignorable messages as fatal', () => {
    assert.equal(isFatalBrowserMessage('Download the React DevTools'), false);
  });
});
