import { GenericRestAdapter, SchemaAdapterConfig } from '@friehub/plugin-sdk';

/**
 * OpenWeatherDataSource: Standard weather truth.
 * Requires a free API key.
 */
export class OpenWeatherDataSource extends GenericRestAdapter {
    constructor(_apiKey: string) {
        const config: SchemaAdapterConfig = {
            id: 'openweather',
            name: 'OpenWeatherMap',
            category: 'weather' as any,
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
