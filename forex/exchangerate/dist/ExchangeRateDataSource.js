"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeRateDataSource = void 0;
const discovery_1 = require("@taas/discovery");
/**
 * ExchangeRateDataSource: Lightweight forex truth.
 * Free tier supports 161 currencies. No complex keys for basic usage.
 */
class ExchangeRateDataSource extends discovery_1.GenericRestAdapter {
    constructor(_apiKey) {
        const config = {
            id: 'exchangerate',
            name: 'ExchangeRate-API',
            category: 'forex',
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
exports.ExchangeRateDataSource = ExchangeRateDataSource;
//# sourceMappingURL=ExchangeRateDataSource.js.map