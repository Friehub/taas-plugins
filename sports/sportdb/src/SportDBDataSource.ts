import { SovereignAdapter, AdapterConfig, DataCategory } from '@friehub/plugin-sdk';
import { z } from 'zod';

export const SportDBScoreSchema = z.object({
    idEvent: z.string(),
    strEvent: z.string(),
    intHomeScore: z.union([z.string(), z.number()]).nullable(),
    intAwayScore: z.union([z.string(), z.number()]).nullable(),
    strStatus: z.string(),
    timestamp: z.number().optional()
});

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

export class SportDBDataSource extends SovereignAdapter<any, SportDBParams> {
    protected getMockData(params: SportDBParams): any {
        return {
            id: params.matchId || 'mock-id',
            match: `${params.homeTeam || 'Home'} vs ${params.awayTeam || 'Away'}`,
            home_team: params.homeTeam || 'Home',
            away_team: params.awayTeam || 'Away',
            home_score: 0,
            away_score: 0,
            status: 'Mocked',
            timestamp: Date.now()
        };
    }

    constructor(config: Partial<AdapterConfig> = {}) {
        super({
            name: 'SportDB',
            category: DataCategory.SPORTS,
            responseSchema: z.any(),
            rateLimitRequestPerMinute: 60,
            ttlMs: 30000,
            ...config,
            capabilities: {
                supportsHistorical: false,
                methods: [
                    'livescore',
                    'eventDetail',
                    'sports.football.score',
                    'sports.football.list',
                    'sports.match.stream',
                    'sports.football.subs',
                    'sports.football.goals',
                    'sports.football.cards',
                    'sports.football.cards.yellow',
                    'sports.football.cards.red',
                    'sports.football.status',
                    'sports.football.cancelled',
                    'sports.football.lineup',
                    'sports.football.all',
                    'sports.basketball.score',
                    'sports.league.list',
                    'sports.team.list',
                    'sports.team.detail',
                    'sports.player.list',
                    'sports.league.standings',
                    'sports.league.upcoming',
                    'sports.league.top_scorers',
                    'sports.team.results',
                    'sports.player.detail',
                    'sports.player.honors',
                    'sports.league.detail',
                    'sports.football.score',
                    'sports.football.statistics',
                    'score',
                    'statistics'
                ]


            }
        });
    }

    protected async resolveMatchId(params: SportDBParams, signal?: AbortSignal): Promise<string | null> {
        const adapter = this as any;
        const apiKey = adapter.apiKey || '123';

        // Strategy 1: If we have homeTeam and awayTeam, search for the specific event
        if (params.homeTeam && params.awayTeam) {
            const dateStr = (params as any).date || new Date().toISOString().split('T')[0];
            // Format for query: "Team A vs Team B"
            const q = `${params.homeTeam} vs ${params.awayTeam}`;
            try {
                const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchevents.php`, {
                    params: { e: q, d: dateStr },
                    signal
                });

                const event = response.data?.event?.find((e: any) =>
                    e.strHomeTeam.toLowerCase().includes(params.homeTeam!.toLowerCase()) &&
                    e.strAwayTeam.toLowerCase().includes(params.awayTeam!.toLowerCase())
                );

                if (event) return event.idEvent;
            } catch (e) { }
        }

        // Strategy 2: If we only have teamName, look for their latest/next event
        if (params.teamName || params.homeTeam) {
            const t = params.teamName || params.homeTeam;
            try {
                // First find team ID
                const teamRes = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php`, { params: { t }, signal });
                const teamId = teamRes.data?.teams?.[0]?.idTeam;

                if (teamId) {
                    // Get next 5 events
                    const nextRes = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnext.php`, { params: { id: teamId }, signal });
                    if (nextRes.data?.events?.[0]) return nextRes.data.events[0].idEvent;

                    // Fallback to last 5 results
                    const lastRes = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventslast.php`, { params: { id: teamId }, signal });
                    if (lastRes.data?.results?.[0]) return lastRes.data.results[0].idEvent;
                }
            } catch (e) { }
        }

        return null;
    }

    protected async fetchData(params: SportDBParams, signal?: AbortSignal): Promise<any> {
        const adapter = this as any;
        const apiKey = adapter.apiKey || '123';
        const method = (params as any).method || 'sports.football.score';

        if (method === 'livescore' || method === 'sports.football.list') {
            const response = await adapter.client.get(
                `https://www.thesportsdb.com/api/v1/json/${apiKey}/latestsoccer.php`,
                { signal }
            );

            if (!response.data || !response.data.teams) {
                return { status: "Empty", matches: [], timestamp: Date.now() };
            }

            if (method === 'sports.football.list') {
                return {
                    matches: (response.data.teams.Match || []).map((m: any) => ({
                        id: m.Id,
                        home: m.HomeTeam,
                        away: m.AwayTeam,
                        league: m.League,
                        date: m.Date
                    })),
                    timestamp: Date.now()
                };
            }
            return response.data;
        }

        // Discovery: Leagues
        if (method === 'sports.league.list') {
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/all_leagues.php`, { signal });
            let leagues = response.data?.leagues || [];
            if (params.sportName) {
                leagues = leagues.filter((l: any) => l.strSport.toLowerCase() === params.sportName?.toLowerCase());
            }
            return { leagues: leagues.map((l: any) => ({ id: l.idLeague, name: l.strLeague, sport: l.strSport, alternate: l.strLeagueAlternate })), timestamp: Date.now() };
        }

        // Discovery: League Detail
        if (method === 'sports.league.detail') {
            const leagueId = params.leagueId || '4328';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupleague.php`, { params: { id: leagueId }, signal });
            const l = response.data?.leagues?.[0];
            if (!l) return { league: null, timestamp: Date.now() };
            return {
                league: {
                    id: l.idLeague,
                    name: l.strLeague,
                    sport: l.strSport,
                    formed_year: l.intFormedYear,
                    country: l.strCountry,
                    description: l.strDescriptionEN,
                    media: {
                        badge: l.strBadge,
                        logo: l.strLogo,
                        poster: l.strPoster,
                        banner: l.strBanner,
                        fanart: [l.strFanart1, l.strFanart2, l.strFanart3, l.strFanart4].filter(Boolean)
                    },
                    social: {
                        website: l.strWebsite,
                        facebook: l.strFacebook,
                        twitter: l.strTwitter,
                        youtube: l.strYoutube
                    }
                },
                timestamp: Date.now()
            };
        }

        // Discovery: Teams in League
        if (method === 'sports.team.list') {
            const leagueId = params.leagueId || '4328';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookup_all_teams.php`, { params: { id: leagueId }, signal });
            return { teams: (response.data?.teams || []).map((t: any) => ({ id: t.idTeam, name: t.strTeam, badge: t.strTeamBadge, stadium: t.strStadium, venue: t.strVenue })), timestamp: Date.now() };
        }

        // Discovery: Team Detail / Search
        if (method === 'sports.team.detail') {
            let team: any = null;
            if (params.teamId) {
                const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupteam.php`, { params: { id: params.teamId }, signal });
                team = response.data?.teams?.[0];
            } else if (params.teamName) {
                const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php`, { params: { t: params.teamName }, signal });
                team = response.data?.teams?.[0];
            }

            if (team) {
                return {
                    team: {
                        id: team.idTeam,
                        name: team.strTeam,
                        formed_year: team.intFormedYear,
                        sport: team.strSport,
                        league: team.strLeague,
                        stadium: {
                            name: team.strStadium,
                            location: team.strStadiumLocation,
                            capacity: team.intStadiumCapacity,
                            description: team.strStadiumDescription,
                            thumb: team.strStadiumThumb
                        },
                        social: {
                            website: team.strWebsite,
                            facebook: team.strFacebook,
                            twitter: team.strTwitter,
                            instagram: team.strInstagram,
                            youtube: team.strYoutube
                        },
                        media: {
                            badge: team.strTeamBadge,
                            jersey: team.strTeamJersey,
                            logo: team.strTeamLogo,
                            banner: team.strTeamBanner,
                            fanart: [team.strTeamFanart1, team.strTeamFanart2, team.strTeamFanart3, team.strTeamFanart4].filter(Boolean)
                        }
                    },
                    timestamp: Date.now()
                };
            }
            return { team: null, timestamp: Date.now() };
        }

        // Discovery: Players in Team
        if (method === 'sports.player.list') {
            const teamId = params.teamId || '133602';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookup_all_players.php`, { params: { id: teamId }, signal });
            return { players: (response.data?.player || []).map((p: any) => ({ id: p.idPlayer, name: p.strPlayer, nationality: p.strNationality, position: p.strPosition, thumb: p.strThumb })), timestamp: Date.now() };
        }

        // Intelligence: League Standings
        if (method === 'sports.league.standings') {
            const leagueId = params.leagueId || '4328';
            const season = params.season || '2024-2025';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookuptable.php`, { params: { l: leagueId, s: season }, signal });
            return { standings: response.data?.table || [], timestamp: Date.now() };
        }

        // Intelligence: Upcoming Matches
        if (method === 'sports.league.upcoming') {
            const leagueId = params.leagueId || '4328';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnextleague.php`, { params: { id: leagueId }, signal });
            return { events: (response.data?.events || []).map((ev: any) => ({ id: ev.idEvent, match: ev.strEvent, date: ev.dateEvent, time: ev.strTime, home: ev.strHomeTeam, away: ev.strAwayTeam })), timestamp: Date.now() };
        }

        // Intelligence: Top Scorers
        if (method === 'sports.league.top_scorers') {
            const leagueId = params.leagueId || '4328';
            const season = params.season || '2024-2025';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookuptop.php`, { params: { l: leagueId, s: season }, signal });
            return { scorers: response.data?.topscorers || [], timestamp: Date.now() };
        }

        // Maturity: Team Results (Last 5 Form)
        if (method === 'sports.team.results') {
            const teamId = params.teamId || '133602';
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventslast.php`, { params: { id: teamId }, signal });
            return {
                results: (response.data?.results || []).map((ev: any) => ({
                    id: ev.idEvent,
                    match: ev.strEvent,
                    date: ev.dateEvent,
                    home: ev.strHomeTeam,
                    away: ev.strAwayTeam,
                    home_score: ev.intHomeScore,
                    away_score: ev.intAwayScore,
                    status: ev.strStatus
                })),
                timestamp: Date.now()
            };
        }

        // Maturity: Player Detail
        if (method === 'sports.player.detail') {
            const playerId = params.playerId;
            if (!playerId) throw new Error("Missing playerId for sports.player.detail");
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupplayer.php`, { params: { id: playerId }, signal });
            const p = response.data?.players?.[0];
            if (!p) return { player: null, timestamp: Date.now() };
            return {
                player: {
                    id: p.idPlayer,
                    name: p.strPlayer,
                    team: p.strTeam,
                    nationality: p.strNationality,
                    position: p.strPosition,
                    number: p.strNumber,
                    born: p.dateBorn,
                    gender: p.strGender,
                    height: p.strHeight,
                    weight: p.strWeight,
                    thumb: p.strThumb,
                    cutout: p.strCutout,
                    description: p.strDescriptionEN,
                    social: {
                        twitter: p.strTwitter,
                        instagram: p.strInstagram,
                        facebook: p.strFacebook
                    }
                },
                timestamp: Date.now()
            };
        }

        // Maturity: Player Honors
        if (method === 'sports.player.honors') {
            const playerId = params.playerId;
            if (!playerId) throw new Error("Missing playerId for sports.player.honors");
            const response = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookuphonours.php`, { params: { id: playerId }, signal });
            return { honours: response.data?.honours || [], timestamp: Date.now() };
        }

        const id = params.matchId || params.event_id || '407749';

        // Strategy: First try fetching from live feed (latestsoccer) as it often contains more rich data
        const liveResponse = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/latestsoccer.php`, { signal });
        let liveMatch = (liveResponse.data?.teams?.Match || []).find((m: any) => String(m.Id) === String(id));

        let e: any;
        if (liveMatch) {
            e = liveMatch;
        } else {
            const lookupRes = await adapter.client.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupevent.php`, { params: { id }, signal });
            if (!lookupRes.data || !lookupRes.data.events || lookupRes.data.events.length === 0) {
                throw new Error(`[SportDB] Event ${id} not found in live feed or lookup.`);
            }
            e = lookupRes.data.events[0];
        }

        const getField = (obj: any, ...fields: string[]) => {
            for (const f of fields) {
                if (obj[f] !== undefined && obj[f] !== null) return obj[f];
            }
            return '';
        };

        const sport = getField(e, 'strSport').toLowerCase();
        const isFootball = sport === 'soccer';
        const isBasketball = sport === 'basketball';

        // Base Result (Lightweight)
        const result: any = {
            id: getField(e, 'Id', 'idEvent'),
            match: getField(e, 'strEvent'),
            home_team: getField(e, 'HomeTeam', 'strHomeTeam'),
            away_team: getField(e, 'AwayTeam', 'strAwayTeam'),
            home_score: Number(getField(e, 'HomeGoals', 'intHomeScore') || 0),
            away_score: Number(getField(e, 'AwayGoals', 'intAwayScore') || 0),
            status: getField(e, 'strStatus') || 'Unknown',
            timestamp: Date.now()
        };

        // Determine Granularity (Lazy Enrichment)
        const needsDetails = method.includes('football') || method.includes('basketball') || method.includes('stream') || method.includes('all');

        if (needsDetails) {
            result.details = {};

            if (isFootball) {
                // Parsing logic as before for Football
                const parseEvents = (str: any, side: string, type: string = 'Goal') => {
                    const sVal = typeof str === 'string' ? str : '';
                    if (!sVal) return [];
                    return sVal.split(';').filter(s => s.trim()).map(s => {
                        const m = s.match(/(\d+)'?:\s*(.+)/);
                        if (!m) return null;
                        return { time: parseInt(m[1]), player: m[2].trim(), type, side };
                    }).filter(Boolean);
                };

                const parseSubs = (str: any, side: string) => {
                    const sVal = typeof str === 'string' ? str : '';
                    if (!sVal) return [];
                    const subs: any[] = [];
                    const lines = sVal.split(';').filter(l => l.trim());
                    for (let i = 0; i < lines.length; i += 2) {
                        const outMatch = lines[i]?.match(/(\d+)'?:\s*out\s+(.+)/);
                        const inMatch = lines[i + 1]?.match(/(\d+)'?:\s*in\s+(.+)/);
                        if (outMatch && inMatch) {
                            subs.push({ time: parseInt(outMatch[1]), out: outMatch[2].trim(), in: inMatch[2].trim(), side });
                        }
                    }
                    return subs;
                };

                const parseLineup = (val: any) => (typeof val === 'string' ? val : '').split(';').map(s => s.trim()).filter(Boolean);

                result.is_cancelled = (result.status || '').toLowerCase().includes('cancel') || (result.status || '').toLowerCase().includes('postpone');

                result.details.goals = [
                    ...parseEvents(getField(e, 'HomeGoalDetails', 'strHomeGoalDetails'), 'home'),
                    ...parseEvents(getField(e, 'AwayGoalDetails', 'strAwayGoalDetails'), 'away')
                ];
                result.details.yellow_cards = [
                    ...parseEvents(getField(e, 'HomeTeamYellowCardDetails', 'strHomeYellowCards'), 'home', 'Yellow'),
                    ...parseEvents(getField(e, 'AwayTeamYellowCardDetails', 'strAwayYellowCards'), 'away', 'Yellow')
                ];
                result.details.red_cards = [
                    ...parseEvents(getField(e, 'HomeTeamRedCardDetails', 'strHomeRedCards'), 'home', 'Red'),
                    ...parseEvents(getField(e, 'AwayTeamRedCardDetails', 'strAwayRedCards'), 'away', 'Red')
                ];
                result.details.subs = [
                    ...parseSubs(getField(e, 'HomeSubDetails', 'strHomeSubDetails'), 'home'),
                    ...parseSubs(getField(e, 'AwaySubDetails', 'strAwaySubDetails'), 'away')
                ];

                // Added Granular Statistics Extraction
                result.details.stats = {
                    possession: parseInt(getField(e, 'intHomePossession', 'strHomePossession') || '0'),
                    shots_total: parseInt(getField(e, 'intHomeShots', 'strHomeShots') || '0'),
                    shots_on_goal: parseInt(getField(e, 'intHomeShotsTarget', 'strHomeShotsTarget') || '0'),
                    corners: parseInt(getField(e, 'intHomeCorners', 'strHomeCorners') || '0'),
                    fouls: parseInt(getField(e, 'intHomeFouls', 'strHomeFouls') || '0'),
                    yellow_cards: result.details.yellow_cards.filter((c: any) => c.side === 'home').length,
                    red_cards: result.details.red_cards.filter((c: any) => c.side === 'home').length
                };

                result.details.lineups = {
                    home: {
                        goalkeeper: parseLineup(getField(e, 'HomeLineupGoalkeeper', 'strHomeLineupGoalkeeper')),
                        defense: parseLineup(getField(e, 'HomeLineupDefense', 'strHomeLineupDefense')),
                        midfield: parseLineup(getField(e, 'HomeLineupMidfield', 'strHomeLineupMidfield')),
                        forward: parseLineup(getField(e, 'HomeLineupForward', 'strHomeLineupForward')),
                        substitutes: parseLineup(getField(e, 'HomeLineupSubstitutes', 'strHomeLineupSubstitutes'))
                    },
                    away: {
                        goalkeeper: parseLineup(getField(e, 'AwayLineupGoalkeeper', 'strAwayLineupGoalkeeper')),
                        defense: parseLineup(getField(e, 'AwayLineupDefense', 'strAwayLineupDefense')),
                        midfield: parseLineup(getField(e, 'AwayLineupMidfield', 'strAwayLineupMidfield')),
                        forward: parseLineup(getField(e, 'AwayLineupForward', 'strAwayLineupForward')),
                        substitutes: parseLineup(getField(e, 'AwayLineupSubstitutes', 'strAwayLineupSubstitutes'))
                    }
                };
            } else if (isBasketball) {
                // Basketball specific enrichment: Parse periods from strResult if available, otherwise use integer fields
                const rawResult = getField(e, 'strResult');
                const quarters: any[] = [];

                // Regex to find quarters in string: "Quarters:<br>32 31 17 23"
                const qMatches = rawResult.match(/Quarters:<br>((\d+\s*)+)/g);
                if (qMatches && qMatches.length >= 2) {
                    const homeQs = qMatches[0].replace('Quarters:<br>', '').trim().split(/\s+/);
                    const awayQs = qMatches[1].replace('Quarters:<br>', '').trim().split(/\s+/);

                    for (let i = 0; i < Math.max(homeQs.length, awayQs.length); i++) {
                        quarters.push({
                            period: i + 1,
                            home: parseInt(homeQs[i] || '0'),
                            away: parseInt(awayQs[i] || '0')
                        });
                    }
                }

                if (quarters.length > 0) {
                    result.details.periods = quarters;
                } else {
                    result.details.periods = [
                        { period: 1, home: Number(getField(e, 'intHomeScore_1', 'intHomeScore1') || 0), away: Number(getField(e, 'intAwayScore_1', 'intAwayScore1') || 0) },
                        { period: 2, home: Number(getField(e, 'intHomeScore_2', 'intHomeScore2') || 0), away: Number(getField(e, 'intAwayScore_2', 'intAwayScore2') || 0) },
                        { period: 3, home: Number(getField(e, 'intHomeScore_3', 'intHomeScore3') || 0), away: Number(getField(e, 'intAwayScore_3', 'intAwayScore3') || 0) },
                        { period: 4, home: Number(getField(e, 'intHomeScore_4', 'intHomeScore4') || 0), away: Number(getField(e, 'intAwayScore_4', 'intAwayScore4') || 0) }
                    ];
                }
            }

            result.venue = {
                stadium: getField(e, 'Stadium', 'strStadium', 'strVenue'),
                location: getField(e, 'Location', 'strLocation', 'strCity')
            };
        }

        return result;
    }
}
