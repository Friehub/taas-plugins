import { SovereignAdapter, AdapterConfig } from '@taas/discovery';
import { z } from 'zod';
export declare const BinancePriceSchema: z.ZodObject<{
    symbol: z.ZodString;
    price: z.ZodNumber;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    price: number;
    timestamp?: number | undefined;
}, {
    symbol: string;
    price: number;
    timestamp?: number | undefined;
}>;
export type BinancePriceData = z.infer<typeof BinancePriceSchema>;
export interface BinanceParams {
    symbol: string;
    timestamp?: number;
}
export declare class BinanceDataSource extends SovereignAdapter<any, BinanceParams> {
    private static bulkCache;
    private static refreshPromise;
    private static lastRefresh;
    private static readonly CACHE_TTL_MS;
    constructor(config?: Partial<AdapterConfig>);
    protected fetchData(params: BinanceParams, signal?: AbortSignal): Promise<any>;
    private fetchSpotPrice;
    private refreshBulkPrices;
    private fetchHistoricalSpotPrice;
    private fetchOrderBook;
    private fetchHistoricalKlines;
    protected getMockData(params: BinanceParams): Promise<any>;
}
//# sourceMappingURL=BinanceDataSource.d.ts.map