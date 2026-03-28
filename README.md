# taas-plugins

The official, **open-contribution** plugin ecosystem for the [TaaS Gateway](https://github.com/Friehub/Taas/tree/main/taas-gateway).

Anyone can build and submit a plugin. You do not need to be affiliated with Friehub. This repository is self-contained — you do not need access to the gateway internals to write a compliant plugin.

---

## What is a Plugin?

A plugin is a TypeScript package that wraps an external data API and exposes it to the TaaS Gateway through the **Unified Capability Model (UCM)**. The gateway treats all plugins identically — it calls `fetch()`, receives a `DataResponse`, and routes the result through its attestation pipeline.

### The Three-Layer Model

```
Your Code                   This Repo                     taas-gateway
─────────────────           ─────────────────────         ──────────────────────────────
<Name>DataSource.ts  →  plugin.json manifest  →  core/data/capabilities/<category>.json
(SovereignAdapter)      (loader entry point)      (UCM capability registration)
```

Every plugin must satisfy all three layers to be callable by the gateway.

---

## Repository Layout

```
taas-plugins/
├── crypto/
│   ├── binance/
│   ├── coingecko/
│   └── cryptocompare/
├── sports/
│   ├── api-sports/
│   ├── sportdb/
│   ├── sportmonks/
│   └── theoddsapi/
├── forex/
│   ├── alphavantage/
│   └── exchangerate/
├── weather/
│   └── openweather/
├── economics/
│   ├── fred/
│   └── worldbank/
├── registry/               # UCM registry utilities
├── __tests__/              # @taas/plugin-test-utils — shared UCM harness
├── scripts/
│   └── scaffold.sh         # Plugin scaffolding tool
├── .ai-instructions        # AI/LLM context for assisted development
├── CONTRIBUTING.md
└── SECURITY.md
```

Each plugin lives at `<category>/<provider-name>/` and is an independent pnpm workspace package.

---

## Quick Start — Create a New Plugin

**Step 1: Run the scaffold script**

```bash
./scripts/scaffold.sh <category> <name>
# Example:
./scripts/scaffold.sh onchain etherscan
```

This creates a ready-to-fill plugin skeleton at `onchain/etherscan/`.

**Step 2: Install dependencies**

```bash
pnpm install
```

**Step 3: Fill in your implementation**

Open `onchain/etherscan/src/EtherscanDataSource.ts` and implement:
- `fetchData(params, signal?)` — the real API call
- `getMockData(params)` — deterministic offline mock data

**Step 4: Run the UCM compliance harness**

```bash
pnpm --filter @taas/plugin-etherscan test
```

Fix any failures (the harness error messages tell you exactly what is missing).

**Step 5: Open a Pull Request**

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full PR process.

---

## Plugin Anatomy

### `src/<Name>DataSource.ts`

```typescript
import { SovereignAdapter, AdapterConfig, DataCategory } from '@taas/discovery';
import { z } from 'zod';

// 1. Define a Zod schema for your response shape
export const MyResponseSchema = z.object({
  value: z.number(),
  timestamp: z.number(),
});
export type MyResponse = z.infer<typeof MyResponseSchema>;

// 2. Define your params shape
export interface MyParams {
  symbol: string;
  timestamp?: number;
}

// 3. Extend SovereignAdapter — the only valid base class
export class MyDataSource extends SovereignAdapter<MyResponse, MyParams> {
  constructor(config: Partial<AdapterConfig> = {}) {
    super({
      name: 'My Source',
      category: DataCategory.CUSTOM,          // must be a valid DataCategory value
      responseSchema: MyResponseSchema,
      capabilities: {
        supportsHistorical: false,
        supportsRealtime: true,
        methods: ['myMethod'],                 // at least one method required
      },
      ...config,
    });
  }

  // 4. Real API call — must honour AbortSignal
  protected async fetchData(params: MyParams, signal?: AbortSignal): Promise<MyResponse> {
    const response = await this.client.get('https://api.example.com/data', {
      params: { symbol: params.symbol },
      signal,
    });
    return { value: response.data.price, timestamp: Date.now() };
  }

  // 5. Deterministic offline mock — zero network calls
  protected async getMockData(params: MyParams): Promise<MyResponse> {
    return { value: 1234.56, timestamp: params.timestamp ?? Date.now() };
  }
}
```

### Supporting Multiple Endpoints / APIs

A single plugin can support multiple endpoints (or even multiple distinct APIs like Binance Spot vs Binance Futures). You declare the supported endpoints in the `methods` array, and branch on `params.method` inside `fetchData`:

```typescript
// Define multiple methods in the constructor
capabilities: {
  methods: ['spotPrice', 'orderBook', 'historicalPrice'],
}

// Branch on the method in fetchData
protected async fetchData(params: MyParams, signal?: AbortSignal): Promise<MyResponse> {
  const method = params.method || 'default';
  
  switch (method) {
    case 'spotPrice':
      return this.client.get('.../ticker/price', { params, signal }).then(r => r.data);
    case 'orderBook':
      return this.client.get('.../depth', { params, signal }).then(r => r.data);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
```

### `plugin.json`

```json
{
  "name": "my-source",
  "package": "@taas/plugin-my-source",
  "class": "MyDataSource",
  "category": "custom",
  "version": "1.0.0"
}
```

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique slug used as the source `id` at runtime |
| `package` | Yes | npm package name — must match `package.json` `name` exactly |
| `class` | Yes | Exported class name — must match the default export class exactly |
| `category` | Yes | Must be a valid `DataCategory` value (see table below) |
| `version` | Yes | Semver string |

### `package.json` (minimum)

```json
{
  "name": "@taas/plugin-my-source",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@taas/discovery": "workspace:*",
    "@taas/interfaces": "workspace:*",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@taas/plugin-test-utils": "workspace:*",
    "typescript": "^5.7.3",
    "vitest": "^2.0.0"
  }
}
```

---

## SourceCapabilities Reference

Declare these in the `super()` constructor under `capabilities`:

| Field | Type | Default | Description |
|---|---|---|---|
| `supportsHistorical` | `boolean` | `false` | Can fetch data for a past timestamp |
| `supportsRealtime` | `boolean` | `true` | Can fetch current/live data |
| `supportsBatch` | `boolean` | `false` | Implements `fetchBatch()` |
| `methods` | `string[]` | `[]` | Named methods your adapter handles (e.g. `['spotPrice', 'orderBook']`) |
| `subtypes` | `Record<string, string[]>` | — | Sub-categories (e.g. `{ sports: ['football'] }`) |
| `maxHistoricalDays` | `number` | — | Lookback limit when `supportsHistorical=true` |
| `rateLimitPerMinute` | `number` | — | Informs the gateway's quota system |
| `requiresAuth` | `boolean` | auto | Set automatically if `apiKey` is provided |

---

## DataCategory Reference

Use one of these values for the `category` field:

| Value | Status |
|---|---|
| `crypto` | Covered — binance, coingecko, cryptocompare |
| `sports` | Covered — api-sports, sportdb, sportmonks, theoddsapi |
| `forex` | Covered — alphavantage, exchangerate |
| `weather` | Covered — openweather |
| `economics` | Covered — fred, worldbank |
| `finance` | Open for contribution |
| `onchain` | Open for contribution |
| `social` | Open for contribution |
| `prediction` | Open for contribution |
| `news` | Open for contribution |
| `music` | Open for contribution |
| `dev` | Open for contribution |
| `ai` | Open for contribution |
| `web` | Open for contribution |
| `random` | Open for contribution |
| `calendar` | Open for contribution |
| `agent` | Open for contribution |
| `custom` | Use for one-off or experimental sources |

If you build a plugin for an open category, you are filling a gap in the network's data coverage. Those contributions are especially welcome.

---

## UCM Capability Registration

After your plugin is merged, a gateway maintainer must register your source ID in:

```
taas-gateway/
  ts/sidecar/src/lib/ucm/registry/capabilities/<category>.json
```

Until this step is done, the gateway will load your plugin but log a startup warning. You can open a follow-up issue or PR to `taas-gateway` with the required JSON entry. See [CONTRIBUTING.md](CONTRIBUTING.md) for the exact format.

---

## Running All Tests

```bash
# From repo root
pnpm install
pnpm --filter @taas/plugin-test-utils build
pnpm --filter !@taas/plugin-test-utils run test
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).
