import { SovereignAdapter, AdapterConfig, DataCategory } from '@taas/discovery';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export const BinancePriceSchema = z.object({
    symbol: z.string(),
    price: z.number(),
    timestamp: z.number().optional(), // Unix ms
});

export type BinancePriceData = z.infer<typeof BinancePriceSchema>;

export interface BinanceParams {
    symbol: string; // e.g., 'BTCUSDT'
    timestamp?: number; // Optional historical timestamp
}

export class BinanceDataSource extends SovereignAdapter<any, BinanceParams> {
    private static bulkCache: Map<string, BinancePriceData> = new Map();
    private static refreshPromise: Promise<void> | null = null;
    private static lastRefresh = 0;
    private static readonly CACHE_TTL_MS = 1000;

    constructor(config: Partial<AdapterConfig> = {}) {
        super({
            name: 'Binance Spot',
            category: DataCategory.CRYPTO,
            responseSchema: z.any(), // Flexible schema for multi-method
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

    protected async fetchData(params: BinanceParams, signal?: AbortSignal): Promise<any> {
        let inputSymbol = params.symbol || '';
        const method = (params as any).method || 'spotPrice';

        // Phase 16: Internal Ticker Resolution
        let symbol = inputSymbol;
        const tickers = (this.config as any).tickers || {};
        const mapping = tickers?.binance?.[inputSymbol.toLowerCase()];
        if (mapping) {
            symbol = mapping;
        } else if (!inputSymbol.includes('USDT') && inputSymbol) {
            symbol = `${inputSymbol.toUpperCase()}USDT`;
        }

        if (!symbol) {
            throw new Error(`[Binance] Could not map symbol '${inputSymbol}' to a valid Binance ticker.`);
        }

        switch (method) {
            case 'orderBook':
                return this.fetchOrderBook(symbol, (params as any).limit || 10, signal);
            case 'historicalKlines':
                return this.fetchHistoricalKlines(symbol, params.timestamp || Date.now(), (params as any).interval || '1h', signal);
            case 'crypto.price':
            case 'spotPrice':
            default:
                return this.fetchSpotPrice(symbol, params.timestamp, signal);
        }
    }

    private async fetchSpotPrice(symbol: string, timestamp?: number, signal?: AbortSignal): Promise<any> {
        if (timestamp) {
            const hist = await this.fetchHistoricalSpotPrice(symbol, timestamp, signal);
            return {
                price: hist.price,
                last_updated: hist.timestamp,
                volume_24h: 0 // Historical klines might need more logic for volume if required
            };
        }

        const base = 'https://api.binance.com';
        try {
            console.log(`[Binance] Fetching targeted price and volume for ${symbol} from ${base}...`);
            // Use 24hr ticker for volume + price
            const response = await this.client.get(`${base}/api/v3/ticker/24hr`, { 
                params: { symbol },
                signal 
            });
            const now = Date.now();

            return {
                price: parseFloat(response.data.lastPrice),
                volume_24h: parseFloat(response.data.volume),
                last_updated: now
            };
        } catch (err: any) {
            console.error(`[Binance] Targeted fetch failed for ${symbol}: ${err.message}`);
            throw err;
        }
    }

    private async refreshBulkPrices(signal?: AbortSignal): Promise<void> {
        // Fallback or legacy
        console.warn("[Binance] Bulk refresh called but not recommended. Use targeted fetch.");
    }


    private async fetchHistoricalSpotPrice(symbol: string, timestamp: number, signal?: AbortSignal): Promise<BinancePriceData> {
        const base = 'https://api.binance.com';
        const response = await this.client.get(
            `${base}/api/v3/klines`,
            {
                params: {
                    symbol,
                    interval: '1m',
                    startTime: timestamp,
                    limit: 1
                },
                signal
            }
        );

        const candle = response.data[0];
        if (!candle) throw new Error(`[Binance] No historical data found for ${symbol} at ${timestamp}`);

        return {
            symbol,
            price: parseFloat(candle[4]),
            timestamp: candle[6]
        };
    }

    private async fetchOrderBook(symbol: string, limit: number, signal?: AbortSignal): Promise<any> {
        const response = await this.client.get(
            `https://api.binance.com/api/v3/depth`,
            {
                params: { symbol, limit },
                signal
            }
        );

        return {
            symbol,
            bids: response.data.bids.slice(0, 5),
            asks: response.data.asks.slice(0, 5),
            timestamp: Date.now()
        };
    }

    private async fetchHistoricalKlines(symbol: string, startTime: number, interval: string, signal?: AbortSignal): Promise<any> {
        const response = await this.client.get(
            `https://api.binance.com/api/v3/klines`,
            {
                params: { symbol, interval, startTime, limit: 10 },
                signal
            }
        );

        return {
            symbol,
            klines: response.data.map((k: any) => ({
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

    protected async getMockData(params: BinanceParams): Promise<any> {
        return {
            symbol: params.symbol.toUpperCase(),
            price: 90000.00,
            timestamp: params.timestamp || Date.now()
        };
    }
}
