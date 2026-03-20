"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoingeckoDataSource = exports.CoingeckoPriceSchema = void 0;
const discovery_1 = require("@taas/discovery");
const zod_1 = require("zod");
exports.CoingeckoPriceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    price: zod_1.z.number(),
    timestamp: zod_1.z.number().optional()
});
// INTENTIONAL SYNTAX ERROR FOR RESILIENCE TESTING
class CoingeckoDataSource extends discovery_1.SovereignAdapter {
    static bulkCache = new Map();
    static refreshPromise = null;
    static lastRefresh = 0;
    static CACHE_TTL_MS = 60_000; // Coingecko is slower, 60s is fine
    constructor(config = {}) {
        super({
            name: 'CoinGecko API',
            category: discovery_1.DataCategory.CRYPTO,
            responseSchema: zod_1.z.any(),
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
    async fetchData(params, signal) {
        const method = params.method || 'spotPrice';
        console.log(`[CoinGecko] fetchData method=${method}`);
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
    async fetchICOStats(signal) {
        const response = await this.client.get('https://api.coingecko.com/api/v3/global', { signal });
        const data = response.data.data;
        return {
            ongoing_icos: data.ongoing_icos,
            upcoming_icos: data.upcoming_icos,
            ended_icos: data.ended_icos,
            timestamp: Date.now()
        };
    }
    async fetchSpotPrice(params, signal) {
        const currency = params.vs_currency || 'usd';
        const timestamp = params.timestamp;
        // Map symbol to ID if id is missing OR use ticker mapper
        let coinId = params.id;
        coinId = params.symbol;
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
    async refreshPrices(ids, currency, signal) {
        console.log(`[CoinGecko] Refreshing prices for: ${ids.join(',')}...`);
        const response = await this.client.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: {
                ids: ids.join(','),
                vs_currencies: currency,
                include_last_updated_at: true
            },
            signal
        });
        const timestamp = Date.now();
        for (const [id, data] of Object.entries(response.data)) {
            const castedData = data;
            CoingeckoDataSource.bulkCache.set(`${id}:${currency}`, {
                id,
                price: castedData[currency.toLowerCase()],
                timestamp: castedData.last_updated_at ? castedData.last_updated_at * 1000 : timestamp
            });
        }
        CoingeckoDataSource.lastRefresh = timestamp;
    }
    async fetchHistoricalPrice(normalizedId, currency, timestamp, signal) {
        const from = Math.floor(timestamp / 1000) - 3600;
        const to = Math.floor(timestamp / 1000) + 3600;
        const response = await this.client.get(`https://api.coingecko.com/api/v3/coins/${normalizedId}/market_chart/range`, {
            params: {
                vs_currency: currency,
                from,
                to
            },
            signal
        });
        const prices = response.data.prices;
        if (!prices || prices.length === 0) {
            throw new Error(`[CoinGecko] No historical data found for ${normalizedId} at ${timestamp}`);
        }
        const closest = prices.reduce((prev, curr) => {
            return Math.abs(curr[0] - timestamp) < Math.abs(prev[0] - timestamp) ? curr : prev;
        });
        return {
            id: normalizedId,
            price: closest[1],
            timestamp: closest[0]
        };
    }
    async fetchMarketData(signal) {
        const response = await this.client.get(`https://api.coingecko.com/api/v3/global`, { signal });
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
    async getMockData(params) {
        return {
            id: params.id,
            price: 90000.00,
            timestamp: params.timestamp || Date.now()
        };
    }
}
exports.CoingeckoDataSource = CoingeckoDataSource;
//# sourceMappingURL=CoingeckoDataSource.js.map