"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceDataSource = exports.BinancePriceSchema = void 0;
const discovery_1 = require("@taas/discovery");
const zod_1 = require("zod");
exports.BinancePriceSchema = zod_1.z.object({
    symbol: zod_1.z.string(),
    price: zod_1.z.number(),
    timestamp: zod_1.z.number().optional(), // Unix ms
});
class BinanceDataSource extends discovery_1.SovereignAdapter {
    static bulkCache = new Map();
    static refreshPromise = null;
    static lastRefresh = 0;
    static CACHE_TTL_MS = 1000;
    constructor(config = {}) {
        super({
            name: 'Binance Spot',
            category: discovery_1.DataCategory.CRYPTO,
            responseSchema: zod_1.z.any(), // Flexible schema for multi-method
            rateLimitRequestPerMinute: 6000, // Increased for load test
            ttlMs: 1000, // 1s TTL for prices
            ...config,
            clientConfig: {
                family: 4, // Force IPv4 (consistent with CoinGecko stability fix)
                timeout: 30000
            },
            capabilities: {
                supportsHistorical: true,
                methods: ['spotPrice', 'orderBook', 'historicalKlines', 'crypto.price']
            }
        });
    }
    async fetchData(params, signal) {
        let inputSymbol = params.symbol || '';
        const method = params.method || 'spotPrice';
        // Use unified mapper
        const symbol = inputSymbol;
        if (!symbol) {
            throw new Error(`[Binance] Could not map symbol '${inputSymbol}' to a valid Binance ticker.`);
        }
        switch (method) {
            case 'orderBook':
                return this.fetchOrderBook(symbol, params.limit || 10, signal);
            case 'historicalKlines':
                return this.fetchHistoricalKlines(symbol, params.timestamp || Date.now(), params.interval || '1h', signal);
            case 'crypto.price':
            case 'spotPrice':
            default:
                return this.fetchSpotPrice(symbol, params.timestamp, signal);
        }
    }
    async fetchSpotPrice(symbol, timestamp, signal) {
        if (timestamp) {
            return this.fetchHistoricalSpotPrice(symbol, timestamp, signal);
        }
        const base = 'https://api.binance.com';
        try {
            console.log(`[Binance] Fetching targeted price for ${symbol} from ${base}...`);
            const response = await this.client.get(`${base}/api/v3/ticker/price`, {
                params: { symbol },
                signal
            });
            const timestamp = Date.now();
            return {
                symbol: response.data.symbol,
                price: parseFloat(response.data.price),
                timestamp
            };
        }
        catch (err) {
            console.error(`[Binance] Targeted fetch failed for ${symbol}: ${err.message}`);
            throw err;
        }
    }
    async refreshBulkPrices(signal) {
        // Fallback or legacy
        console.warn("[Binance] Bulk refresh called but not recommended. Use targeted fetch.");
    }
    async fetchHistoricalSpotPrice(symbol, timestamp, signal) {
        const base = 'https://api.binance.com';
        const response = await this.client.get(`${base}/api/v3/klines`, {
            params: {
                symbol,
                interval: '1m',
                startTime: timestamp,
                limit: 1
            },
            signal
        });
        const candle = response.data[0];
        if (!candle)
            throw new Error(`[Binance] No historical data found for ${symbol} at ${timestamp}`);
        return {
            symbol,
            price: parseFloat(candle[4]),
            timestamp: candle[6]
        };
    }
    async fetchOrderBook(symbol, limit, signal) {
        const response = await this.client.get(`https://api.binance.com/api/v3/depth`, {
            params: { symbol, limit },
            signal
        });
        return {
            symbol,
            bids: response.data.bids.slice(0, 5),
            asks: response.data.asks.slice(0, 5),
            timestamp: Date.now()
        };
    }
    async fetchHistoricalKlines(symbol, startTime, interval, signal) {
        const response = await this.client.get(`https://api.binance.com/api/v3/klines`, {
            params: { symbol, interval, startTime, limit: 10 },
            signal
        });
        return {
            symbol,
            klines: response.data.map((k) => ({
                openTime: k[0],
                open: k[1],
                high: k[2],
                low: k[3],
                close: k[4],
                volume: k[5]
            })),
            timestamp: Date.now()
        };
    }
    async getMockData(params) {
        return {
            symbol: params.symbol.toUpperCase(),
            price: 90000.00,
            timestamp: params.timestamp || Date.now()
        };
    }
}
exports.BinanceDataSource = BinanceDataSource;
//# sourceMappingURL=BinanceDataSource.js.map