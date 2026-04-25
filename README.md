# Friehub Truth Adapters 

The official, **open-contribution** ecosystem for creating Verifiable Fact sources for the Friehub Network.

## Overview

A **Truth Adapter** (formerly known as a Plugin) is a high-integrity TypeScript module that wraps an external data source and exposes it to the Friehub Network via the **Universal Consensus Module (UCM)**.

### The Sovereign Model
Our architecture follows the **Sovereign Execution Principle**: 
1.  **Isolation**: Adapters run in a secure **Deno Isolate**. They have no access to the host file system or environment variables, ensuring zero side-effects.
2.  **Normalization**: The adapter is responsible for transforming raw, messy API JSON into a standardized `DataResponse`. 
3.  **Integrity**: The Rust node receives this normalized data, verifies the enclave proof, and performs consensus.

---

##  Development Workflow

### 1. Install the SDK
Use the `@friehub/plugin-sdk` to ensure your adapter is compliant with the network's resilience and security requirements.

```bash
npm install @friehub/plugin-sdk
```

### 2. Implementation Pattern
Every adapter must extend the `SovereignAdapter` class. This handles high-level concerns like **Circuit Breaking**, **Rate Limiting**, and **Schema Validation** automatically.

```typescript
import { SovereignAdapter, DataResponse } from "@friehub/plugin-sdk";
import { z } from "zod";

export class MyAdapter extends SovereignAdapter {
  protected async fetchData(params: any): Promise<any> {
    // 1. Fetch from source
    const raw = await this.client.get("https://api.example.com", { params });
    
    // 2. Normalize and return (ALWAYS use source-provided timestamps)
    return {
      value: raw.data.result,
      timestamp: raw.data.source_time 
    };
  }

  protected async getMockData(params: any): Promise<any> {
    return { value: 100, timestamp: 1713960000 }; // Use a fixed constant for mock determinism
  }
}
```

---

##  Best Practices

###  Normalization is Mandatory
The Rust Gateway does **not** understand specific API formats (like CoinGecko or OpenWeather). Your adapter MUST convert the source data into a clean, ABI-encodable format.

###  Resilience by Default
Always implement `getMockData`. The Friehub Network uses mocks for safe simulation and automated testing of your adapter before it is activated for live on-chain tasks.

### Determinism is Critical
The TaaS Consensus layer hashes the adapter's output. If you use `Date.now()`, different operators will generate different hashes, causing consensus to fail.
- **Always** prioritize `timestamp` fields provided by the data source.
- **Never** use `Date.now()` or `Math.random()` in the primary data payload.
- If no timestamp is provided, use a windowed value (e.g., `Math.floor(Date.now() / 60000)`).

---

## Repository Structure
- **`/crypto`**, **`/weather`**, **`/forex`**: Pre-categorized specialized adapter suites.
- **`/registry`**: UCM Capability definitions.
- **`scripts/scaffold.sh`**: Instantly generate a new adapter skeleton.

## License
MIT - Friehub
