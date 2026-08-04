/**
 * Filter browser console / page errors for e2e quality gate.
 * Keep allowlist tiny — only known benign noise.
 */

const IGNORED_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /\[HMR\]/i,
  /Fast Refresh/i,
];

export function isIgnorableBrowserMessage(message: string): boolean {
  const text = message.trim();
  if (!text) return true;
  return IGNORED_PATTERNS.some((re) => re.test(text));
}

export function isFatalBrowserMessage(message: string): boolean {
  if (isIgnorableBrowserMessage(message)) return false;
  const text = message.toLowerCase();
  return (
    text.includes('hydration') ||
    text.includes('minified react error') ||
    text.includes('failed to fetch dynamically imported module') ||
    text.includes('chunkloaderror') ||
    text.includes('uncaught') ||
    text.includes('typeerror') ||
    text.includes('referenceerror')
  );
}
