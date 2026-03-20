"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FredDataSource = void 0;
const discovery_1 = require("@taas/discovery");
/**
 * FredDataSource: Federal Reserve Economic Data (FRED).
 * Provides macro-economic truths like Inflation, GDP, and Interest Rates.
 */
class FredDataSource extends discovery_1.GenericRestAdapter {
    constructor(_apiKey) {
        const config = {
            id: 'fred',
            name: 'Federal Reserve Economics',
            category: 'economics',
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
exports.FredDataSource = FredDataSource;
//# sourceMappingURL=FredDataSource.js.map