import { SovereignAdapter, AdapterConfig } from '@taas/discovery';
export interface SportMonksParams {
    method: string;
    fixtureId?: string;
    leagueId?: string;
    seasonId?: string;
    teamId?: string;
}
/**
 * SportMonksDataSource - Professional grade sports data provider.
 * Focuses on high-accuracy football statistics.
 */
export declare class SportMonksDataSource extends SovereignAdapter {
    constructor(config?: Partial<AdapterConfig>);
    protected resolveMatchId(params: any): Promise<string | null>;
    protected fetchData(params: SportMonksParams, signal?: AbortSignal): Promise<any>;
    getMockData(params: SportMonksParams): Promise<any>;
}
