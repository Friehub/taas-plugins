import { GenericRestAdapter, SchemaAdapterConfig } from '@taas/plugin-sdk';

/**
 * TheOddsApiAdapter: Specialized for sport match odds and scores.
 * Free tier provides access to major leagues (NFL, EPl, etc.).
 */
export class TheOddsApiDataSource extends GenericRestAdapter {
    constructor(_apiKey: string) {
        const config: SchemaAdapterConfig = {
            id: 'theoddsapi',
            name: 'The Odds API',
            category: 'sport' as any,
            baseUrl: 'https://api.the-odds-api.com/v4',
            endpoints: {
                'match-scores': {
                    path: '/sports/${sport}/scores/?apiKey=${apiKey}',
                    method: 'GET',
                    dataPath: '0' // Gets latest event in array
                }
            }
        };
        super(config);
    }
}
