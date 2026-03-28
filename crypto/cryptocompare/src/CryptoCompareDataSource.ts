import { SovereignAdapter, AdapterConfig, DataCategory } from '@taas/discovery';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export const CryptoComparePriceSchema = z.object({
    symbol: z.string(),
    price: z.number(),
    timestamp: z.number().optional()
});

export type CryptoComparePriceData = z.infer<typeof CryptoComparePriceSchema>;

export interface CryptoCompareParams {
    symbol: string; // e.g., 'BTC'
    currency?: string; // e.g., 'USD'
    timestamp?: number;
}

export class CryptoCompareDataSource extends SovereignAdapter<any, CryptoCompareParams> {
    constructor(config: Partial<AdapterConfig> = {}) {
        super({
            name: 'CryptoCompare API',
            category: DataCategory.CRYPTO,
            responseSchema: z.any(),
            rateLimitRequestPerMinute: 50,
            ttlMs: 1000,
            ...config,
            clientConfig: {
                family: 4,
                timeout: 10000
            },
            capabilities: {
                supportsHistorical: true,
                methods: ['spotPrice', 'crypto.price']
            }
        });
    }

    protected async fetchData(params: CryptoCompareParams, signal?: AbortSignal): Promise<any> {
        const method = (params as any).method || 'spotPrice';
        let symbol = params.symbol;
        const currency = params.currency || 'USD';

        // Phase 16: Internal Ticker Resolution
        const tickers = (this.config as any).tickers || {};
        const mapping = tickers?.cryptocompare?.[symbol.toLowerCase()];
        if (mapping) {
            symbol = mapping;
        }

        if (method === 'crypto.price' || method === 'spotPrice') {
            return this.fetchSpotPrice(symbol, currency, signal);
        }

        throw new Error(`[CryptoCompare] Method ${method} not implemented.`);
    }

    private async fetchSpotPrice(symbol: string, currency: string, signal?: AbortSignal): Promise<any> {
        const response = await this.client.get(
            `https://min-api.cryptocompare.com/data/pricemultifull`,
            {
                params: {
                    fsyms: symbol.toUpperCase(),
                    tsyms: currency.toUpperCase()
                },
                signal
            }
        );

        const data = response.data.RAW?.[symbol.toUpperCase()]?.[currency.toUpperCase()];
        if (!data) {
            throw new Error(`[CryptoCompare] Could not find price/volume for ${symbol}/${currency}`);
        }

        return {
            price: parseFloat(data.PRICE),
            volume_24h: parseFloat(data.VOLUME24HOUR),
            last_updated: data.LASTUPDATE * 1000
        };
    }

    protected async getMockData(params: CryptoCompareParams): Promise<any> {
        return {
            symbol: params.symbol,
            price: 100.00,
            timestamp: Date.now()
        };
    }
}
