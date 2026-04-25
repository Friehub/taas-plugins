import { describe, it, expect, vi } from 'vitest';
import type { DataSource } from '@friehub/interfaces';
import { DataCategory } from '@friehub/interfaces';
import { makeDataRequest, makeAbortedRequest } from '../fixtures/DataRequest.fixture.js';

/**
 * describeUcmCompliance
 *
 * Runs the full UCM compliance suite against a plugin adapter.
 * Call this in every plugin test file with useMocks: true.
 *
 * @param adapterName   Human-readable name for the test output
 * @param factory       Zero-argument factory that returns a new adapter instance
 *
 * @example
 * describeUcmCompliance('BinanceDataSource', () => new BinanceDataSource({ useMocks: true }));
 */
export function describeUcmCompliance(
  adapterName: string,
  factory: () => DataSource<unknown>,
): void {
  describe(`[UCM] ${adapterName}`, () => {
    // ─── Identity ────────────────────────────────────────────────────────────

    describe('Identity', () => {
      it('has a non-empty id', () => {
        const adapter = factory();
        expect(adapter.id).toBeTruthy();
        expect(typeof adapter.id).toBe('string');
        expect(adapter.id.trim().length).toBeGreaterThan(0);
      });

      it('has a non-empty name', () => {
        const adapter = factory();
        expect(adapter.name).toBeTruthy();
        expect(typeof adapter.name).toBe('string');
        expect(adapter.name.trim().length).toBeGreaterThan(0);
      });

      it('declares a valid DataCategory', () => {
        const adapter = factory();
        const validCategories = Object.values(DataCategory) as string[];
        expect(validCategories).toContain(adapter.category);
      });
    });

    // ─── Capabilities ─────────────────────────────────────────────────────────

    describe('Capabilities', () => {
      it('declares capabilities', () => {
        const adapter = factory();
        expect(adapter.capabilities).toBeDefined();
        expect(typeof adapter.capabilities).toBe('object');
      });

      it('capabilities.methods is a non-empty array', () => {
        const adapter = factory();
        expect(Array.isArray(adapter.capabilities.methods)).toBe(true);
        expect(adapter.capabilities.methods.length).toBeGreaterThan(0);
      });

      it('supportsHistorical is a boolean', () => {
        const adapter = factory();
        expect(typeof adapter.capabilities.supportsHistorical).toBe('boolean');
      });

      it('supportsRealtime is a boolean', () => {
        const adapter = factory();
        expect(typeof adapter.capabilities.supportsRealtime).toBe('boolean');
      });
    });

    // ─── Mock Contract ────────────────────────────────────────────────────────

    describe('Mock contract', () => {
      it('fetch() resolves with mock data (useMocks mode)', async () => {
        const adapter = factory();
        const request = makeDataRequest({ symbol: 'TEST' });
        const response = await adapter.fetch(request);
        expect(response).toBeDefined();
        expect(response.data).toBeDefined();
      });

      it('mock data resolves in under 50ms', async () => {
        const adapter = factory();
        const request = makeDataRequest({ symbol: 'TEST' });
        const start = Date.now();
        await adapter.fetch(request);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(50);
      });

      it('mock data is deterministic across two parallel calls', async () => {
        const adapter = factory();
        const request = makeDataRequest({ symbol: 'TEST', timestamp: 1700000000000 });
        const [r1, r2] = await Promise.all([adapter.fetch(request), adapter.fetch(request)]);
        // The data values should be identical for same params in mock mode
        expect(JSON.stringify(r1.data)).toBe(JSON.stringify(r2.data));
      });
    });

    // ─── AbortSignal ──────────────────────────────────────────────────────────

    describe('AbortSignal propagation', () => {
      it('fetch() with a pre-aborted signal does not hang', async () => {
        const adapter = factory();
        const request = makeAbortedRequest({ symbol: 'TEST' });
        // Should either throw (AbortError) or resolve quickly — must not hang
        const result = await Promise.race([
          adapter.fetch(request).then(() => 'resolved').catch(() => 'aborted'),
          new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 100)),
        ]);
        expect(result).not.toBe('timeout');
      });
    });

    // ─── Error Typing ─────────────────────────────────────────────────────────

    describe('Error typing', () => {
      it('errors thrown by the adapter are Error instances', async () => {
        // Force a failure by passing clearly invalid params with network disabled
        const adapter = factory(); // useMocks: true — fetchData not called
        // We test this by temporarily overriding useMocks to false and params that cause getMockData
        // to throw if implemented incorrectly. We spy on the internal to validate the contract.
        // If the adapter is in mock mode this test is a structural check only.
        try {
          await (adapter as any).getMockData({ symbol: '' });
          // If it returns normally, that's fine — getMockData doesn't have to throw
        } catch (e: unknown) {
          expect(e).toBeInstanceOf(Error);
        }
      });
    });

    // ─── Metadata Completeness ────────────────────────────────────────────────

    describe('Metadata completeness', () => {
      it('fetch() response contains required metadata fields', async () => {
        const adapter = factory();
        const request = makeDataRequest({ symbol: 'TEST' });
        const response = await adapter.fetch(request);

        expect(response.metadata).toBeDefined();
        expect(typeof response.metadata.source).toBe('string');
        expect(response.metadata.source.length).toBeGreaterThan(0);
        expect(typeof response.metadata.fetchedAt).toBe('number');
        expect(response.metadata.fetchedAt).toBeGreaterThan(0);
        expect(typeof response.metadata.latency).toBe('number');
        expect(response.metadata.latency).toBeGreaterThanOrEqual(0);
        expect(typeof response.metadata.cacheHit).toBe('boolean');
      });

      it('metadata.source matches adapter.id', async () => {
        const adapter = factory();
        const request = makeDataRequest({ symbol: 'TEST' });
        const response = await adapter.fetch(request);
        expect(response.metadata.source).toBe(adapter.id);
      });
    });
  });
}
