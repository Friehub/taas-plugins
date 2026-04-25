import { SovereignAdapter, AdapterConfig, DataCategory } from '@friehub/plugin-sdk';
import { z } from 'zod';


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
export class ApiSportsDataSource extends SovereignAdapter {

    constructor(config: Partial<AdapterConfig> = {}) {
        super({
            ...config,
            id: 'api-sports',
            name: 'API-Sports',
            category: DataCategory.SPORTS,
            responseSchema: z.any(),
            capabilities: {
                supportsHistorical: false,
                methods: [
                    'sports.football.score',
                    'sports.football.statistics',
                    'sports.basketball.score',
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

        const dateStr = params.date || new Date().toISOString().split('T')[0];

        try {
            const response = await adapter.client.get('https://v3.football.api-sports.io/fixtures', {
                params: { date: dateStr },
                headers: { 'x-apisports-key': apiKey }
            });

            const fixtures = response.data?.response || [];
            const homeSearch = params.homeTeam?.toLowerCase();
            const awaySearch = params.awayTeam?.toLowerCase();
            const teamSearch = params.teamName?.toLowerCase();

            const found = fixtures.find((f: any) => {
                const homeName = f.teams.home.name.toLowerCase();
                const awayName = f.teams.away.name.toLowerCase();

                if (homeSearch && awaySearch) {
                    return homeName.includes(homeSearch) && awayName.includes(awaySearch);
                }
                if (teamSearch) {
                    return homeName.includes(teamSearch) || awayName.includes(teamSearch);
                }
                return false;
            });

            return found ? String(found.fixture.id) : null;
        } catch (e) {
            return null;
        }
    }

    protected async fetchData(params: ApiSportsParams, signal?: AbortSignal): Promise<any> {
        const adapter = this as any;
        const apiKey = adapter.apiKey || ''; // Should be passed via config
        const method = params.method || 'sports.football.score';

        if (!apiKey) {
            throw new Error(`[ApiSports] Missing API Key.`);
        }

        // Setup headers for API-Sports
        const headers = { 'x-apisports-key': apiKey };

        // 1. Football Score
        if (method === 'sports.football.score') {
            const fixtureId = params.fixtureId || '1035067'; // Default sample
            const response = await adapter.client.get('https://v3.football.api-sports.io/fixtures', {
                params: { id: fixtureId },
                headers,
                signal
            });

            const f = response.data?.response?.[0];
            if (!f) throw new Error(`[ApiSports] Fixture ${fixtureId} not found.`);

            return {
                match_id: f.fixture.id,
                home: f.teams.home.name,
                away: f.teams.away.name,
                score: {
                    home: f.goals.home,
                    away: f.goals.away,
                    full_time: `${f.goals.home}-${f.goals.away}`,
                    halftime: `${f.score.halftime.home}-${f.score.halftime.away}`
                },
                status: f.fixture.status.long,
                timestamp: Date.now()
            };
        }

        // 2. Basketball Score
        if (method === 'sports.basketball.score') {
            const gameId = params.fixtureId || '156428'; // Default sample
            const response = await adapter.client.get('https://v1.basketball.api-sports.io/games', {
                params: { id: gameId },
                headers,
                signal
            });

            const g = response.data?.response?.[0];
            if (!g) throw new Error(`[ApiSports] Game ${gameId} not found.`);

            return {
                match_id: g.id,
                home: g.teams.home.name,
                away: g.teams.away.name,
                score: {
                    home: g.scores.home.total,
                    away: g.scores.away.total
                },
                periods: {
                    q1: `${g.scores.home.quarter_1}-${g.scores.away.quarter_1}`,
                    q2: `${g.scores.home.quarter_2}-${g.scores.away.quarter_2}`,
                    q3: `${g.scores.home.quarter_3}-${g.scores.away.quarter_3}`,
                    q4: `${g.scores.home.quarter_4}-${g.scores.away.quarter_4}`
                },
                status: g.status.long,
                timestamp: Date.now()
            };
        }

        // 3. Football Statistics
        if (method === 'sports.football.statistics') {
            const fixtureId = params.fixtureId || '1035067';
            const response = await adapter.client.get('https://v3.football.api-sports.io/fixtures/statistics', {
                params: { fixture: fixtureId },
                headers,
                signal
            });

            const stats = response.data?.response;
            if (!stats || stats.length === 0) throw new Error(`[ApiSports] Statistics for fixture ${fixtureId} not found.`);

            // Normalize array of stats objects to flat object
            const normalizeStats = (teamStats: any[]) => {
                const map: any = {};
                teamStats.forEach(s => {
                    const key = s.type.toLowerCase().replace(/ /g, '_');
                    map[key] = typeof s.value === 'string' && s.value.endsWith('%')
                        ? parseInt(s.value)
                        : s.value;
                });
                return map;
            };

            const homeStats = normalizeStats(stats[0].statistics);
            // We usually focus on home stats or combined for simple consensus, 
            // but the manifest mapping will handle specific extractions if needed.
            // For now, let's return a unified structure.
            return {
                fixture: fixtureId,
                statistics: homeStats, // Simplified for manifest mapping
                timestamp: Date.now()
            };
        }

        throw new Error(`[ApiSports] Method ${method} not implemented.`);
    }

    public async getMockData(params: ApiSportsParams): Promise<any> {
        if (params.method === 'sports.football.score') {
            return {
                match_id: params.fixtureId || 'mock_fb_1',
                home: "Mock FC",
                away: "Consensus United",
                score: { home: 1, away: 1, full_time: "1-1" },
                status: "Match Finished",
                details: { goals: [], subs: [], cards: [] },
                venue: { stadium: "Mock Stadium", location: "Consensus City" },
                timestamp: Date.now(),
                _source: "api-sports-mock"
            };
        }
        if (params.method === 'sports.football.statistics') {
            return {
                fixture: params.fixtureId || 'mock_st_1',
                statistics: {
                    ball_possession: 55,
                    total_shots: 12,
                    shots_on_goal: 6,
                    corner_kicks: 8,
                    fouls: 10,
                    yellow_cards: 2,
                    red_cards: 0,
                    goalkeeper_saves: 3
                },
                timestamp: Date.now(),
                _source: "api-sports-mock"
            };
        }
        return { message: "Mock data not available for this method." };
    }
}
