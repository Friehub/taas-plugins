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
export declare class CategoryMapper {
    static getPlugins(config: PluginRegistryConfig): any[];
}
