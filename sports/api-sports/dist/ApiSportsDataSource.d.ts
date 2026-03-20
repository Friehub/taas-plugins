import { SovereignAdapter, AdapterConfig } from '@taas/discovery';
export interface ApiSportsParams {
    method: string;
    fixtureId?: string;
    leagueId?: string;
    season?: string;
    date?: string;
    teamId?: string;
}
/**
 * ApiSportsDataSource - High fidelity secondary source for multi-source consensus.
 * Supports API-Football and API-Basketball.
 */
export declare class ApiSportsDataSource extends SovereignAdapter {
    constructor(config?: Partial<AdapterConfig>);
    protected resolveMatchId(params: any): Promise<string | null>;
    protected fetchData(params: ApiSportsParams, signal?: AbortSignal): Promise<any>;
    getMockData(params: ApiSportsParams): Promise<any>;
}
