import { SovereignAdapter, AdapterConfig, DataCategory } from '@taas/plugin-sdk';
import { z } from 'zod';


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
export class SportMonksDataSource extends SovereignAdapter {

    constructor(config: Partial<AdapterConfig> = {}) {
        super({
            ...config,
            id: 'sportmonks',
            name: 'SportMonks',
            category: DataCategory.SPORTS,
            responseSchema: z.any(),
            capabilities: {
                supportsHistorical: true,
                methods: [
                    'sports.football.score',
                    'sports.football.statistics',
                    'score',
                    'statistics'
                ]

            }
        });
    }

    protected async resolveMatchId(params: any): Promise<string | null> {
        const adapter = this as any;
        const apiKey = adapter.apiKey;
        if (!apiKey) return null;

        const headers = { 'Authorization': apiKey };
        const dateStr = params.date || new Date().toISOString().split('T')[0];

        try {
            // SportMonks strategy: Fetch all fixtures for the date and filter
            const response = await adapter.client.get(`https://api.sportmonks.com/v3/football/fixtures/date/${dateStr}`, { headers });

            const fixtures = response.data?.data || [];
            const homeSearch = params.homeTeam?.toLowerCase();
            const awaySearch = params.awayTeam?.toLowerCase();
            const teamSearch = params.teamName?.toLowerCase();

            const found = fixtures.find((f: any) => {
                const name = f.name.toLowerCase(); // Format usually "Team A vs Team B"

                if (homeSearch && awaySearch) {
                    return name.includes(homeSearch) && name.includes(awaySearch);
                }
                if (teamSearch) {
                    return name.includes(teamSearch);
                }
                return false;
            });

            return found ? String(found.id) : null;
        } catch (e) {
            return null;
        }
    }

    protected async fetchData(params: SportMonksParams, signal?: AbortSignal): Promise<any> {
        const adapter = this as any;
        const apiKey = adapter.apiKey || '';
        const method = params.method || 'sports.football.score';

        if (!apiKey) {
            throw new Error(`[SportMonks] Missing API Key.`);
        }

        const headers = { 'Authorization': apiKey };

        // Helper to find ANY fixture the key can access
        const discoverFixtureId = async (signal?: AbortSignal) => {
            // Strategy 1: In-play livescores
            try {
                const lp = await adapter.client.get('https://api.sportmonks.com/v3/football/livescores', { headers, signal });
                if (lp.data?.data?.[0]?.id) return lp.data.data[0].id;
            } catch (e) { }

            // Strategy 2: Pre-match fixtures for today
            try {
                const today = new Date().toISOString().split('T')[0];
                const sc = await adapter.client.get(`https://api.sportmonks.com/v3/football/fixtures/date/${today}`, { headers, signal });
                if (sc.data?.data?.[0]?.id) return sc.data.data[0].id;
            } catch (e) { }

            throw new Error('[SportMonks] No accessible fixtures found via livescores or daily schedule.');
        };

        // 1. Football Score
        if (method === 'sports.football.score') {
            try {
                const fixtureId = params.fixtureId || await discoverFixtureId(signal).catch(() => '11867285');
                const response = await adapter.client.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
                    params: { include: 'scores' },
                    headers,
                    signal
                });

                const f = response.data?.data;
                if (!f) throw new Error(`[SportMonks] Fixture ${fixtureId} not found.`);

                return {
                    match_id: f.id,
                    home: f.name,
                    score: {
                        home: f.scores?.find((s: any) => s.description === 'CURRENT')?.score?.home || 0,
                        away: f.scores?.find((s: any) => s.description === 'CURRENT')?.score?.away || 0
                    },
                    status: f.result_info || 'Live',
                    timestamp: Date.now()
                };
            } catch (e: any) {
                console.error(`[SportMonks] Score Fetch Failed: ${e.message}`, e.response?.data);
                throw e;
            }
        }

        // 2. Football Statistics
        if (method === 'sports.football.statistics') {
            try {
                let fixtureId = params.fixtureId;
                if (!fixtureId) {
                    fixtureId = await discoverFixtureId(signal).catch(() => '11867285');
                }

                const response = await adapter.client.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
                    params: { include: 'statistics.type' },
                    headers,
                    signal
                });

                const f = response.data?.data;
                if (!f) throw new Error(`[SportMonks] Fixture ${fixtureId} not found.`);

                // If no stats yet (e.g. pre-match), return fixture info at least to avoid full crash
                if (!f.statistics || f.statistics.length === 0) {
                    throw new Error(`[SportMonks] Statistics for ${f.name} (${fixtureId}) are currently empty. Match status: ${f.result_info || 'Unknown'}`);
                }

                return {
                    fixtureId: f.id,
                    data: f.statistics,
                    timestamp: Date.now()
                };
            } catch (e: any) {
                console.error(`[SportMonks] Statistics Fetch Failed: ${e.message}`, e.response?.data);
                throw e;
            }
        }
        throw new Error(`[SportMonks] Method ${method} not fully implemented yet.`);
    }

    public async getMockData(params: SportMonksParams): Promise<any> {
        if (params.method === 'sports.football.statistics') {
            return {
                data: {
                    stats: [
                        { type: { name: "Possession" }, value: "54%" },
                        { type: { name: "Shots Total" }, value: 13 },
                        { type: { name: "Shots on Goal" }, value: 7 },
                        { type: { name: "Corners" }, value: 9 },
                        { type: { name: "Fouls" }, value: 11 },
                        { type: { name: "Yellowcards" }, value: 2 },
                        { type: { name: "Redcards" }, value: 0 }
                    ]
                },
                timestamp: Date.now(),
                _source: "sportmonks-mock"
            };
        }
        return {
            message: "SportMonks Mock Data",
            method: params.method,
            fixtureId: params.fixtureId || 'mock_sm_1',
            status: "Placeholder",
            timestamp: Date.now(),
            _source: "sportmonks-placeholder"
        };
    }
}
