import { SovereignAdapter, AdapterConfig } from '@taas/discovery';
import { z } from 'zod';
export declare const SportDBScoreSchema: z.ZodObject<{
    idEvent: z.ZodString;
    strEvent: z.ZodString;
    intHomeScore: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    intAwayScore: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    strStatus: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    idEvent?: string;
    strEvent?: string;
    intHomeScore?: string | number;
    intAwayScore?: string | number;
    strStatus?: string;
    timestamp?: number;
}, {
    idEvent?: string;
    strEvent?: string;
    intHomeScore?: string | number;
    intAwayScore?: string | number;
    strStatus?: string;
    timestamp?: number;
}>;
export type SportDBScoreData = z.infer<typeof SportDBScoreSchema>;
export interface SportDBParams {
    matchId?: string;
    event_id?: string;
    leagueId?: string;
    teamId?: string;
    teamName?: string;
    homeTeam?: string;
    awayTeam?: string;
    sportName?: string;
    season?: string;
    playerId?: string;
}
export declare class SportDBDataSource extends SovereignAdapter<any, SportDBParams> {
    protected getMockData(params: SportDBParams): any;
    constructor(config?: Partial<AdapterConfig>);
    protected resolveMatchId(params: SportDBParams, signal?: AbortSignal): Promise<string | null>;
    protected fetchData(params: SportDBParams, signal?: AbortSignal): Promise<any>;
}
