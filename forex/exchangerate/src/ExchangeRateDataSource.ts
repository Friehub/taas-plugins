import { GenericRestAdapter, SchemaAdapterConfig } from '@taas/plugin-sdk';

/**
 * ExchangeRateDataSource: Lightweight forex truth.
 * Free tier supports 161 currencies. No complex keys for basic usage.
 */
export class ExchangeRateDataSource extends GenericRestAdapter {
    constructor(_apiKey: string) {
        const config: SchemaAdapterConfig = {
            id: 'exchangerate',
            name: 'ExchangeRate-API',
            category: 'forex' as any,
            baseUrl: 'https://v6.exchangerate-api.com/v6/${apiKey}',
            endpoints: {
                'latest': {
                    path: '/latest/${base}',
                    method: 'GET',
                    dataPath: 'conversion_rates'
                }
            }
        };
        super(config);
    }
}
