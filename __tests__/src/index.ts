/**
 * @taas/plugin-test-utils
 *
 * Shared UCM compliance test harness for taas-plugins.
 *
 * Usage:
 *   import { describeUcmCompliance } from '@taas/plugin-test-utils';
 *   describeUcmCompliance('MyDataSource', () => new MyDataSource({ useMocks: true }));
 */

export { describeUcmCompliance } from './harness/ucm.harness.js';
export { assertMockIsOffline, assertDeterministicMock } from './harness/mock.harness.js';
export { withNetworkFailure, withNetworkSuccess } from './harness/network.harness.js';
export { makeDataRequest, makeAbortedRequest } from './fixtures/DataRequest.fixture.js';
export { makeAttestationContext } from './fixtures/AttestationContext.fixture.js';
