"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryMapper = void 0;
const taas_plugin_sportmonks_1 = require("@taas/taas-plugin-sportmonks");
const taas_plugin_theoddsapi_1 = require("@taas/taas-plugin-theoddsapi");
const taas_plugin_alphavantage_1 = require("@taas/taas-plugin-alphavantage");
const taas_plugin_exchangerate_1 = require("@taas/taas-plugin-exchangerate");
const taas_plugin_fred_1 = require("@taas/taas-plugin-fred");
const taas_plugin_worldbank_1 = require("@taas/taas-plugin-worldbank");
const taas_plugin_coingecko_1 = require("@taas/taas-plugin-coingecko");
const taas_plugin_openweather_1 = require("@taas/taas-plugin-openweather");
/**
 * CategoryMapper - Orchestrates the instantiation of categorized plugins.
 * Ensures that plugins are only registered if their mandatory API keys are present,
 * or if they are public-tier (no key required).
 */
class CategoryMapper {
    static getPlugins(config) {
        const plugins = [];
        // --- SPORT ---
        if (config.keys.sportmonks)
            plugins.push(new taas_plugin_sportmonks_1.SportMonksDataSource({ apiKey: config.keys.sportmonks }));
        if (config.keys.theoddsapi)
            plugins.push(new taas_plugin_theoddsapi_1.TheOddsApiDataSource(config.keys.theoddsapi));
        // --- FOREX ---
        if (config.keys.alphavantage)
            plugins.push(new taas_plugin_alphavantage_1.AlphaVantageDataSource(config.keys.alphavantage));
        if (config.keys.exchangerate)
            plugins.push(new taas_plugin_exchangerate_1.ExchangeRateDataSource(config.keys.exchangerate));
        // --- ECONOMICS ---
        if (config.keys.fred)
            plugins.push(new taas_plugin_fred_1.FredDataSource(config.keys.fred));
        plugins.push(new taas_plugin_worldbank_1.WorldBankDataSource()); // Public
        // --- CRYPTO ---
        plugins.push(new taas_plugin_coingecko_1.CoingeckoDataSource()); // Public
        // --- WEATHER ---
        if (config.keys.openweather)
            plugins.push(new taas_plugin_openweather_1.OpenWeatherDataSource(config.keys.openweather));
        return plugins;
    }
}
exports.CategoryMapper = CategoryMapper;
