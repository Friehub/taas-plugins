/**
 * Live Shape Validation Test
 *
 * This test verifies that a plugin's getMockData() response matches the shape
 * that the live API actually returns. It runs ONLY when the LIVE_TEST env var is set.
 *
 * Usage in CI (optional job, not blocking):
 *   LIVE_TEST=1 BINANCE_API_KEY=xxx pnpm --filter @taas/plugin-binance test
 *
 * Usage locally:
 *   LIVE_TEST=1 pnpm --filter @taas/plugin-binance test
 *
 * Shape comparison is structural — it validates key presence and value types,
 * not exact values (which change on each API call).
 */

import { SovereignAdapter } from '@taas/plugin-sdk';

/**
 * Compares the structure of two objects recursively.
 * Checks: same keys, same value types at each key.
 * Does NOT check value equality.
 */
function compareShapes(
  mock: Record<string, unknown>,
  live: Record<string, unknown>,
  path = 'root',
): string[] {
  const errors: string[] = [];

  for (const key of Object.keys(mock)) {
    if (!(key in live)) {
      errors.push(`[${path}.${key}] Present in mock, MISSING in live response`);
      continue;
    }

    const mockType = typeof mock[key];
    const liveType = typeof live[key];

    if (mockType !== liveType) {
      errors.push(
        `[${path}.${key}] Type mismatch: mock=${mockType}, live=${liveType}`,
      );
      continue;
    }

    if (
      mockType === 'object' &&
      mock[key] !== null &&
      live[key] !== null &&
      !Array.isArray(mock[key])
    ) {
      const nested = compareShapes(
        mock[key] as Record<string, unknown>,
        live[key] as Record<string, unknown>,
        `${path}.${key}`,
      );
      errors.push(...nested);
    }
  }

  // Also flag keys present in live that are absent from mock (informational, not an error)
  for (const key of Object.keys(live)) {
    if (!(key in mock)) {
      // Not an error — mock may be a subset. Log as a warning only.
      console.warn(`[shape-test] [${path}.${key}] Present in live but absent from mock — consider updating getMockData()`);
    }
  }

  return errors;
}

/**
 * describeShapeCompliance
 *
 * Drop this into a plugin's test file to add mock-vs-live validation.
 * The test is skipped unless LIVE_TEST=1 is set.
 *
 * @param name     Plugin name for test labeling
 * @param factory  Factory returning the adapter instance (useMocks: false for live)
 * @param params   Params to pass to both fetchData and getMockData
 */
export function describeShapeCompliance<TParams extends object>(
  name: string,
  factory: () => SovereignAdapter<unknown, TParams>,
  params: TParams,
): void {
  const isLiveTest = process.env['LIVE_TEST'] === '1';

  const testFn = isLiveTest ? describe : describe.skip;

  testFn(`[Live Shape Test] ${name}`, () => {
    it('live API response matches mock data shape', async () => {
      const liveAdapter = factory();
      const mockAdapter = factory();

      // Call both — live hits the real API, mock returns hardcoded data
      const [liveResult, mockResult] = await Promise.all([
        (liveAdapter as unknown as { fetchData: (p: TParams, s?: AbortSignal) => Promise<unknown> }).fetchData(params),
        mockAdapter.getMockData(params),
      ]);

      const errors = compareShapes(
        mockResult as Record<string, unknown>,
        liveResult as Record<string, unknown>,
      );

      if (errors.length > 0) {
        throw new Error(
          `Shape mismatch detected in ${name}.\n` +
          `This means getMockData() returns a different structure than the live API.\n` +
          `Update getMockData() to match the live response shape.\n\n` +
          errors.map(e => `  - ${e}`).join('\n'),
        );
      }
    }, 30_000); // 30s timeout for live API call
  });
}
