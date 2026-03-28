import { vi } from 'vitest';
import type { DataSource, DataResponse } from '@taas/interfaces';
import { makeDataRequest } from '../fixtures/DataRequest.fixture.js';

/**
 * withNetworkFailure
 *
 * Wraps a fetch call with a simulated network failure on the Axios client.
 * Useful for testing circuit breaker and retry behaviour.
 *
 * @param adapter   Target adapter
 * @param params    Request params
 * @param status    HTTP status to simulate (default: 500)
 */
export async function withNetworkFailure(
  adapter: DataSource<unknown>,
  params: Record<string, unknown>,
  status: number = 500,
): Promise<{ error: unknown }> {
  const error = Object.assign(new Error(`Simulated HTTP ${status}`), {
    response: { status },
  });

  const spy = vi.spyOn((adapter as any).client, 'get').mockRejectedValueOnce(error);

  try {
    const request = makeDataRequest(params);
    await adapter.fetch(request);
    return { error: null };
  } catch (e) {
    return { error: e };
  } finally {
    spy.mockRestore();
  }
}

/**
 * withNetworkSuccess
 *
 * Stubs the Axios client to return a specific payload, without making a
 * real network call. Useful for testing response parsing logic.
 *
 * @param adapter   Target adapter
 * @param params    Request params
 * @param payload   The data payload to return
 */
export async function withNetworkSuccess<T>(
  adapter: DataSource<unknown>,
  params: Record<string, unknown>,
  payload: T,
): Promise<DataResponse<unknown>> {
  const spy = vi.spyOn((adapter as any).client, 'get').mockResolvedValueOnce({
    data: payload,
    status: 200,
    headers: {},
  });

  try {
    const request = makeDataRequest(params);
    return await adapter.fetch(request);
  } finally {
    spy.mockRestore();
  }
}
