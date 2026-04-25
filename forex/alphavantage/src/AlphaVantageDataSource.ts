import { GenericRestAdapter, SchemaAdapterConfig } from '@friehub/plugin-sdk';

/**
 * AlphaVantageDataSource: Multi-asset financial adapter for TaaS.
 * Supports Forex, Stocks, and Crypto.
 */
export class AlphaVantageDataSource extends GenericRestAdapter {
    constructor(_apiKey: string) {
        const config: SchemaAdapterConfig = {
            id: 'alphavantage',
            name: 'AlphaVantage Finance',
            category: 'forex' as any,
            baseUrl: 'https://www.alphavantage.co',
            capabilities: {
                methods: ['exchange-rate', 'stock-quote', 'intraday'],
                subtypes: {
                    'finance': ['stocks', 'crypto'],
                    'forex': ['fiat']
                }
            },
            endpoints: {
                'exchange-rate': {
                    path: '/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}',
                    method: 'GET',
                    dataPath: 'Realtime Currency Exchange Rate'
                },
                'stock-quote': {
                    path: '/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}',
                    method: 'GET',
                    dataPath: 'Global Quote'
                }
            }
        };
        super(config);
    }
}
