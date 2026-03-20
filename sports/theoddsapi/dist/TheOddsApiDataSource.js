"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheOddsApiDataSource = void 0;
const discovery_1 = require("@taas/discovery");
/**
 * TheOddsApiAdapter: Specialized for sport match odds and scores.
 * Free tier provides access to major leagues (NFL, EPl, etc.).
 */
class TheOddsApiDataSource extends discovery_1.GenericRestAdapter {
    constructor(_apiKey) {
        const config = {
            id: 'theoddsapi',
            name: 'The Odds API',
            category: 'sport',
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
exports.TheOddsApiDataSource = TheOddsApiDataSource;
//# sourceMappingURL=TheOddsApiDataSource.js.map