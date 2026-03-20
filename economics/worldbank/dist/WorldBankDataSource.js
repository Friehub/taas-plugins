"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldBankDataSource = void 0;
const discovery_1 = require("@taas/discovery");
/**
 * WorldBankDataSource: Open Access macro-economic data.
 * Zero keys required. Ideal for global sovereign truth.
 */
class WorldBankDataSource extends discovery_1.GenericRestAdapter {
    constructor() {
        const config = {
            id: 'worldbank',
            name: 'World Bank Open Data',
            category: 'economics',
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
exports.WorldBankDataSource = WorldBankDataSource;
//# sourceMappingURL=WorldBankDataSource.js.map