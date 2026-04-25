import { GenericRestAdapter, SchemaAdapterConfig } from '@friehub/plugin-sdk';

/**
 * WorldBankDataSource: Open Access macro-economic data.
 * Zero keys required. Ideal for global sovereign truth.
 */
export class WorldBankDataSource extends GenericRestAdapter {
    constructor() {
        const config: SchemaAdapterConfig = {
            id: 'worldbank',
            name: 'World Bank Open Data',
            category: 'economics' as any,
            baseUrl: 'https://api.worldbank.org/v2',
            endpoints: {
                'indicator': {
                    path: '/country/${country}/indicator/${indicator}?format=json&date=${date}',
                    method: 'GET',
                    dataPath: '1.0' // Gets latest data point in result array
                }
            }
        };
        super(config);
    }
}
