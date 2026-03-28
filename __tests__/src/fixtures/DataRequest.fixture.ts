/**
 * DataRequest factory helpers for use in plugin tests.
 */

import type { DataRequest, AttestationContext } from '@taas/interfaces';

export function makeDataRequest(
  params: Record<string, unknown>,
  overrides: Partial<DataRequest> = {},
): DataRequest {
  return {
    params,
    ...overrides,
  };
}

export function makeAbortedRequest(params: Record<string, unknown>): DataRequest {
  const controller = new AbortController();
  controller.abort();
  return {
    params,
    signal: controller.signal,
  };
}
