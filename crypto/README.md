# TaaS Crypto Plugin Standard (v1.0)

This document defines the interface and data requirements for any TaaS plugin within the `crypto` category. Adhering to this standard ensures your plugin is compatible with the "Thin VEE" architecture.

## 1. Capability Support
Every crypto plugin should ideally support the `crypto.price` capability.

## 2. Standardized Output Schema
When the `crypto.price` method is called, the plugin **MUST** return a JSON object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `price` | `number` | The current market price. |
| `volume_24h` | `number` | The 24-hour trading volume. |
| `last_updated` | `number` | Unix timestamp in **milliseconds**. |

**Important**: The plugin is responsible for converting raw provider fields (e.g., `lastPrice`, `price_usd`, `VOLUME24HOUR`) into these standard TaaS keys.

## 3. Ticker Responsibility
Plugins are responsible for mapping canonical TaaS symbols (e.g., `BTC`, `ETH`) to their provider-specific IDs.

### Guidelines:
- **Normalization**: Plugins should handle case-sensitivity internally (e.g., converting `btc` to `BTC` or `bitcoin`).
- **Pairs**: If a source requires a pair (e.g., `BTCUSDT`), the plugin should construct this string using the provided `symbol` and `currency` inputs.
- **Failures**: If a symbol cannot be mapped, the plugin should throw a descriptive error: `[PluginName] Could not map symbol 'X' to a valid ticker.`

## 4. Implementation Example (TypeScript)
```typescript
async fetchData(params: { symbol: string, currency: string }) {
    // 1. Resolve ticker
    const ticker = this.myTickerMapper(params.symbol);
    
    // 2. Fetch raw data
    const raw = await this.client.get(`.../api/price?s=${ticker}`);
    
    // 3. Return standardized TaaS object
    return {
        price: parseFloat(raw.price),
        volume_24h: parseFloat(raw.vol24),
        last_updated: Date.now()
    };
}
```

## 5. Gateway Integration
When this standard is followed, the `capabilities.json` entry in the Gateway should omit the `mapping` block. The VEE will automatically accept your plugin's output as the ground truth for aggregation.
