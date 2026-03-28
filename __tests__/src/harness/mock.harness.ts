import { vi } from 'vitest';
import type { DataSource } from '@taas/interfaces';
import { makeDataRequest } from '../fixtures/DataRequest.fixture.js';

/**
 * assertMockIsOffline
 *
 * Verifies that a given method on the adapter does not make any
 * network calls when in mock mode. Uses vi.spyOn on the global fetch
 * and the Axios client to detect accidental network calls.
 */
export async function assertMockIsOffline(
  adapter: DataSource<unknown>,
  params: Record<string, unknown> = { symbol: 'TEST' },
): Promise<void> {
  const fetchSpy = vi.spyOn(globalThis, 'fetch' as keyof typeof globalThis).mockRejectedValue(
    new Error('Network call detected in mock mode'),
  );

  const clientSpy = vi.spyOn((adapter as any).client, 'get').mockRejectedValue(
    new Error('Axios client called in mock mode'),
  );

  try {
    const request = makeDataRequest(params);
    await adapter.fetch(request);
  } finally {
    fetchSpy.mockRestore();
    clientSpy.mockRestore();
  }
}

/**
 * assertDeterministicMock
 *
 * Runs two concurrent fetch calls with identical params and asserts
 * the returned mock data is identical. For use in mock-mode tests.
 */
export async function assertDeterministicMock(
  adapter: DataSource<unknown>,
  params: Record<string, unknown> = { symbol: 'TEST', timestamp: 1700000000000 },
): Promise<void> {
  const request = makeDataRequest(params);
  const [r1, r2] = await Promise.all([adapter.fetch(request), adapter.fetch(request)]);
  if (JSON.stringify(r1.data) !== JSON.stringify(r2.data)) {
    throw new Error(
      `Mock data is non-deterministic. Got:\n${JSON.stringify(r1.data)}\nvs\n${JSON.stringify(r2.data)}`,
    );
  }
}
