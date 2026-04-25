/**
 * AttestationContext factory helpers for use in plugin tests.
 */

import type { AttestationContext } from '@friehub/interfaces';

export function makeAttestationContext(
  overrides: Partial<AttestationContext> = {},
): AttestationContext {
  return {
    requestId: 'test-request-id-001',
    attestationTimestamp: Date.now(),
    deadline: Math.floor(Date.now() / 1000) + 60,
    attempt: 0,
    ...overrides,
  };
}
