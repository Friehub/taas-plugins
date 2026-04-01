import { GenericRestAdapter, SchemaAdapterConfig } from '@taas/plugin-sdk';

/**
 * FredDataSource: Federal Reserve Economic Data (FRED).
 * Provides macro-economic truths like Inflation, GDP, and Interest Rates.
 */
export class FredDataSource extends GenericRestAdapter {
    constructor(_apiKey: string) {
        const config: SchemaAdapterConfig = {
            id: 'fred',
            name: 'Federal Reserve Economics',
            category: 'economics' as any,
            baseUrl: 'https://api.stlouisfed.org/fred',
            capabilities: {
                methods: ['series-observation'],
                subtypes: {
                    'economics': ['macro', 'gdp', 'inflation']
                },
                supportsHistorical: true
            },
            endpoints: {
                'series-observation': {
                    path: '/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json',
                    method: 'GET',
                    dataPath: 'observations.0' // Gets latest observation
                }
            }
        };
        super(config);
    }
}
