"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlphaVantageDataSource = void 0;
const discovery_1 = require("@taas/discovery");
/**
 * AlphaVantageDataSource: Multi-asset financial adapter for TaaS.
 * Supports Forex, Stocks, and Crypto.
 */
class AlphaVantageDataSource extends discovery_1.GenericRestAdapter {
    constructor(_apiKey) {
        const config = {
            id: 'alphavantage',
            name: 'AlphaVantage Finance',
            category: 'forex',
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
exports.AlphaVantageDataSource = AlphaVantageDataSource;
//# sourceMappingURL=AlphaVantageDataSource.js.map