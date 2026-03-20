import { SportMonksDataSource } from '@taas/taas-plugin-sportmonks';
import { TheOddsApiDataSource } from '@taas/taas-plugin-theoddsapi';
import { AlphaVantageDataSource } from '@taas/taas-plugin-alphavantage';
import { ExchangeRateDataSource } from '@taas/taas-plugin-exchangerate';
import { FredDataSource } from '@taas/taas-plugin-fred';
import { WorldBankDataSource } from '@taas/taas-plugin-worldbank';
import { CoingeckoDataSource } from '@taas/taas-plugin-coingecko';
import { OpenWeatherDataSource } from '@taas/taas-plugin-openweather';

export interface PluginRegistryConfig {
    keys: {
        sportmonks?: string;
        theoddsapi?: string;
        alphavantage?: string;
        exchangerate?: string;
        fred?: string;
        openweather?: string;
        [key: string]: string | undefined;
    };
}

/**
 * CategoryMapper - Orchestrates the instantiation of categorized plugins.
 * Ensures that plugins are only registered if their mandatory API keys are present,
 * or if they are public-tier (no key required).
 */
export class CategoryMapper {
    static getPlugins(config: PluginRegistryConfig) {
        const plugins: any[] = [];

        // --- SPORT ---
        if (config.keys.sportmonks) plugins.push(new SportMonksDataSource({ apiKey: config.keys.sportmonks }));
        if (config.keys.theoddsapi) plugins.push(new TheOddsApiDataSource(config.keys.theoddsapi));

        // --- FOREX ---
        if (config.keys.alphavantage) plugins.push(new AlphaVantageDataSource(config.keys.alphavantage));
        if (config.keys.exchangerate) plugins.push(new ExchangeRateDataSource(config.keys.exchangerate));

        // --- ECONOMICS ---
        if (config.keys.fred) plugins.push(new FredDataSource(config.keys.fred));
        plugins.push(new WorldBankDataSource()); // Public

        // --- CRYPTO ---
        plugins.push(new CoingeckoDataSource()); // Public

        // --- WEATHER ---
        if (config.keys.openweather) plugins.push(new OpenWeatherDataSource(config.keys.openweather));

        return plugins;
    }
}
