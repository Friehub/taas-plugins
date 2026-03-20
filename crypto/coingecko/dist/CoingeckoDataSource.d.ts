import { SovereignAdapter, AdapterConfig } from '@taas/discovery';
import { z } from 'zod';
export declare const CoingeckoPriceSchema: z.ZodObject<{
    id: z.ZodString;
    price: z.ZodNumber;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    price: number;
    timestamp?: number | undefined;
}, {
    id: string;
    price: number;
    timestamp?: number | undefined;
}>;
export type CoingeckoPriceData = z.infer<typeof CoingeckoPriceSchema>;
export interface CoingeckoParams {
    id: string;
    vs_currency?: string;
    timestamp?: number;
}
export declare class CoingeckoDataSource extends SovereignAdapter<any, CoingeckoParams> {
    private static bulkCache;
    private static refreshPromise;
    private static lastRefresh;
    private static readonly CACHE_TTL_MS;
    constructor(config?: Partial<AdapterConfig>);
    protected fetchData(params: CoingeckoParams, signal?: AbortSignal): Promise<any>;
    private fetchICOStats;
    private fetchSpotPrice;
    private refreshPrices;
    private fetchHistoricalPrice;
    private fetchMarketData;
    protected getMockData(params: CoingeckoParams): Promise<any>;
}
//# sourceMappingURL=CoingeckoDataSource.d.ts.map