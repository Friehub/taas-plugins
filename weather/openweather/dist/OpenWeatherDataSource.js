"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenWeatherDataSource = void 0;
const discovery_1 = require("@taas/discovery");
/**
 * OpenWeatherDataSource: Standard weather truth.
 * Requires a free API key.
 */
class OpenWeatherDataSource extends discovery_1.GenericRestAdapter {
    constructor(_apiKey) {
        const config = {
            id: 'openweather',
            name: 'OpenWeatherMap',
            category: 'weather',
            baseUrl: 'https://api.openweathermap.org/data/2.5',
            endpoints: {
                'current': {
                    path: '/weather?lat=${lat}&lon=${lon}&appid=${apiKey}',
                    method: 'GET',
                    dataPath: 'main'
                }
            }
        };
        super(config);
    }
}
exports.OpenWeatherDataSource = OpenWeatherDataSource;
//# sourceMappingURL=OpenWeatherDataSource.js.map