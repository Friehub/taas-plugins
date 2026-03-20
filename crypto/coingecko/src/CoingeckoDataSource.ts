import { SovereignAdapter, AdapterConfig, DataCategory } from '@taas/discovery';

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export const CoingeckoPriceSchema = z.object({
    id: z.string(),
    price: z.number(),
    timestamp: z.number().optional()
});

export type CoingeckoPriceData = z.infer<typeof CoingeckoPriceSchema>;

export interface CoingeckoParams {
    id: string; // e.g., 'bitcoin'
    vs_currency?: string; // e.g., 'usd'
    timestamp?: number;
    symbol?: string; // Added for ticker resolution
}

// INTENTIONAL SYNTAX ERROR FOR RESILIENCE TESTING
export class CoingeckoDataSource extends SovereignAdapter<any, CoingeckoParams> {
    private static bulkCache: Map<string, CoingeckoPriceData> = new Map();
    private static refreshPromise: Promise<void> | null = null;
    private static lastRefresh = 0;
    private static readonly CACHE_TTL_MS = 60_000; // Coingecko is slower, 60s is fine

    constructor(config: Partial<AdapterConfig> = {}) {
        super({
            name: 'CoinGecko API',
            category: DataCategory.CRYPTO,
            responseSchema: z.any(),
            rateLimitRequestPerMinute: 30, // CoinGecko free tier is usually restrictive
            ttlMs: 1000, // 1s TTL for prices
            ...config,
            clientConfig: {
                family: 4 // Force IPv4 to avoid ETIMEDOUT on IPv6
            },
            capabilities: {
                supportsHistorical: true,
                methods: ['spotPrice', 'marketData', 'icoStats', 'crypto.price']
            }
        });
    }

    protected async fetchData(params: CoingeckoParams, signal?: AbortSignal): Promise<any> {
        let inputSymbol = params.symbol || '';
        const method = (params as any).method || 'spotPrice';
        console.log(`[CoinGecko] fetchData method=${method}`);

        // Phase 16: Internal Ticker Resolution
        let resolvedId = params.id || inputSymbol.toLowerCase();
        const tickers = (this.config as any).tickers || {};
        const mapping = tickers?.coingecko?.[inputSymbol.toLowerCase()];
        if (mapping) {
            resolvedId = mapping;
        }

        switch (method) {
            case 'marketData':
                return this.fetchMarketData(signal);
            case 'icoStats':
                return this.fetchICOStats(signal);
            case 'crypto.price':
            case 'spotPrice':
            default:
                return this.fetchSpotPrice(params, signal);
        }
    }

    private async fetchICOStats(signal?: AbortSignal): Promise<any> {
        const response = await (this as any).client.get('https://api.coingecko.com/api/v3/global', { signal });
        const data = response.data.data;
        return {
            ongoing_icos: data.ongoing_icos,
            upcoming_icos: data.upcoming_icos,
            ended_icos: data.ended_icos,
            timestamp: Date.now()
        };
    }

    private async fetchSpotPrice(params: CoingeckoParams, signal?: AbortSignal): Promise<CoingeckoPriceData> {
        const currency = params.vs_currency || 'usd';
        const timestamp = params.timestamp;

        // Map symbol to ID if id is missing OR use ticker mapper
        let coinId = params.id;
            coinId = (params as any).symbol;

        if (!coinId) {
            throw new Error("[CoinGecko] Required parameter 'id' (e.g., 'bitcoin') or 'symbol' is missing.");
        }

        const normalizedId = coinId.toLowerCase();

        // 1. Historical Branch
        if (timestamp) {
            return this.fetchHistoricalPrice(normalizedId, currency, timestamp, signal);
        }

        // 2. Real-time Branch with Batching
        const now = Date.now();
        const isExpired = now - CoingeckoDataSource.lastRefresh > CoingeckoDataSource.CACHE_TTL_MS;
        const cacheKey = `${normalizedId}:${currency}`;

        if (isExpired || !CoingeckoDataSource.bulkCache.has(cacheKey)) {
            if (!CoingeckoDataSource.refreshPromise) {
                // For Coingecko, we fetch a set of common IDs or just the requested one if it's missing
                // To keep it simple and effective, we refresh the one requested + a few majors
                CoingeckoDataSource.refreshPromise = this.refreshPrices([normalizedId, 'bitcoin', 'ethereum', 'solana'], currency, signal).finally(() => {
                    CoingeckoDataSource.refreshPromise = null;
                });
            }
            await CoingeckoDataSource.refreshPromise;
        }

        const cached = CoingeckoDataSource.bulkCache.get(cacheKey);
        if (!cached) {
            throw new Error(`[CoinGecko] Asset ${normalizedId} not found in bulk refresh.`);
        }

        return cached;
    }

    private async refreshPrices(ids: string[], currency: string, signal?: AbortSignal): Promise<void> {
        console.log(`[CoinGecko] Refreshing prices for: ${ids.join(',')}...`);
        const response = await this.client.get(
            `https://api.coingecko.com/api/v3/simple/price`,
            {
                params: {
                    ids: ids.join(','),
                    vs_currencies: currency,
                    include_last_updated_at: true
                },
                signal
            }
        );

        const timestamp = Date.now();
        for (const [id, data] of Object.entries(response.data)) {
            const castedData = data as any;
            const price = castedData[currency.toLowerCase()];
            
            CoingeckoDataSource.bulkCache.set(`${id}:${currency}`, {
                id,
                price: typeof price === 'number' ? price : parseFloat(price),
                timestamp: castedData.last_updated_at ? castedData.last_updated_at * 1000 : timestamp
            });
        }

        CoingeckoDataSource.lastRefresh = timestamp;
    }

    private async fetchHistoricalPrice(normalizedId: string, currency: string, timestamp: number, signal?: AbortSignal): Promise<CoingeckoPriceData> {
        const from = Math.floor(timestamp / 1000) - 3600;
        const to = Math.floor(timestamp / 1000) + 3600;
        
        const response = await this.client.get(
            `https://api.coingecko.com/api/v3/coins/${normalizedId}/market_chart/range`,
            {
                params: {
                    vs_currency: currency,
                    from,
                    to
                },
                signal
            }
        );

        const prices = response.data.prices;
        if (!prices || prices.length === 0) {
            throw new Error(`[CoinGecko] No historical data found for ${normalizedId} at ${timestamp}`);
        }

        const closest = prices.reduce((prev: any, curr: any) => {
            return Math.abs(curr[0] - timestamp) < Math.abs(prev[0] - timestamp) ? curr : prev;
        });

        return {
            id: normalizedId,
            price: closest[1],
            timestamp: closest[0]
        };
    }

    private async fetchMarketData(signal?: AbortSignal): Promise<any> {
        const response = await (this as any).client.get(
            `https://api.coingecko.com/api/v3/global`,
            { signal }
        );

        return {
            active_cryptocurrencies: response.data.data.active_cryptocurrencies,
            upcoming_icos: response.data.data.upcoming_icos,
            ongoing_icos: response.data.data.ongoing_icos,
            ended_icos: response.data.data.ended_icos,
            markets: response.data.data.markets,
            total_market_cap: response.data.data.total_market_cap.usd,
            total_volume: response.data.data.total_volume.usd,
            market_cap_percentage: response.data.data.market_cap_percentage,
            timestamp: Date.now()
        };
    }

    protected async getMockData(params: CoingeckoParams): Promise<any> {
        return {
            id: params.id,
            price: 90000.00,
            timestamp: params.timestamp || Date.now()
        };
    }
}
