# Contributing to taas-plugins

`taas-plugins` is open to all contributors. You do not need to be affiliated with Friehub. Read this document fully before writing any code.

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22+ | `nvm install 22` |
| pnpm | 9+ | `npm install -g pnpm@9` |
| TypeScript | 5.7 | installed via `pnpm install` |

---

## 2. Workspace Setup

```bash
git clone https://github.com/Friehub/taas-plugins.git
cd taas-plugins
pnpm install
```

---

## 3. Creating a New Plugin

### Step 1 — Scaffold the package

```bash
./scripts/scaffold.sh <category> <name>
# Example:
./scripts/scaffold.sh onchain etherscan
```

This generates `<category>/<name>/` with all required files pre-filled. Do not hand-create the structure — use the script to avoid missing mandatory files.

### Step 2 — Implement `fetchData`

Open `src/<Name>DataSource.ts`. The scaffold leaves `fetchData` and `getMockData` as stubs marked `TODO`. Fill them in:

- `fetchData(params, signal?)` — makes the real HTTP call using `this.client` (the built-in Axios instance). Must forward `signal` to the request.
- `getMockData(params)` — returns hard-coded data offline. No network calls. Used by tests.

### Step 3 — Fill in `plugin.json`

Confirm `name`, `package`, `class`, `category`, and `version` are all correct. The `class` field must match your exported class name exactly.

### Step 4 — Write tests

The scaffold generates a `src/<Name>.test.ts` that calls `describeUcmCompliance()`. Run it:

```bash
pnpm --filter @taas/plugin-<name> test
```

Red outputs tell you exactly which UCM rule is violated. Add additional `describe` blocks for provider-specific behaviour (e.g., symbol mapping, pagination, error codes).

### Step 5 — Register in the UCM (gateway side)

Once your plugin is merged here, open a PR to `taas-gateway` adding your source ID to:

```
ts/sidecar/src/lib/ucm/registry/capabilities/<category>.json
```

Format:
```json
{
  "sources": [
    { "id": "my-source", "methods": ["myMethod"], "category": "custom" }
  ]
}
```

Until this step is done the gateway loads the plugin but logs a startup warning. It is not blocking for development but is required for production inclusion.

### Step 6 — Open a Pull Request

```bash
git checkout -b feat/<category>/<name>
git add .
git commit -m "feat(<category>): add <name> data source"
git push origin feat/<category>/<name>
```

Fill out the PR template. Incomplete PRs will not be reviewed.

---

## 4. The UCM Contract

These rules are enforced automatically by the UCM compliance harness. Violations will fail CI.

| Rule | Rationale |
|---|---|
| Extend `SovereignAdapter` from `@taas/discovery` | The gateway casts every plugin to this interface — no exceptions |
| `category` must be a valid `DataCategory` value | The UCM routes requests by category |
| `capabilities.methods` must be non-empty | The gateway capability resolver needs at least one named method |
| `fetchData` must forward `AbortSignal` | Timed-out requests must cancel at the HTTP layer |
| Never `throw 'a string'` — always `throw new Error(...)` | The gateway error-handling path expects `Error.message` |
| `getMockData` must make zero network calls | Tests run offline; a network call in mock mode breaks CI |
| Never import from `taas-gateway` directly | Plugins depend only on `@taas/discovery` and `@taas/interfaces` |
| `plugin.json` `class` field must match the exported class name exactly | The plugin loader uses this value for `new module[class]()` |

---

## 5. Testing Requirements

Every plugin must have at minimum:

```typescript
// src/<Name>.test.ts
import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { MyDataSource } from './MyDataSource.js';

describeUcmCompliance('MyDataSource', () => new MyDataSource({ useMocks: true }));
```

This one call runs the full UCM suite (identity, capabilities, mock contract, AbortSignal, error typing, metadata). Additional tests for provider-specific logic are encouraged.

Coverage gate: none enforced at this stage. Aim for all happy-path and primary error-path branches to be covered.

---

## 6. Commit and PR Process

Use **Conventional Commits**:

```bash
# Adding a new plugin
git commit -m "feat(onchain): add etherscan data source"

# Bug fix in an existing plugin
git commit -m "fix(crypto/binance): handle 429 rate limit correctly"

# Documentation only
git commit -m "docs: update CONTRIBUTING quick-start"
```

Valid types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `ci`, `chore`, `security`.

**Branch naming:** `feat/<category>/<name>` for new plugins, `fix/<category>/<name>` for fixes.

---

## 7. Security Guidelines

See [SECURITY.md](SECURITY.md) for the full policy. Summary:

- Never hardcode API keys — use `AdapterConfig.apiKey` or `secretProvider.getSecret()`
- Do not accept arbitrary URLs from `params` (SSRF risk)
- No `eval()`, `new Function()`, or dynamic `require()`
- No module-level side effects (network calls, file writes) on import
- Run `pnpm audit --audit-level high` before opening a PR

CI runs Gitleaks on every PR. Hardcoded credentials will block the merge.

---

## 8. Using AI to Build a Plugin

AI coding assistants can be highly productive for plugin development if used correctly.

### Priming your assistant

Before asking for any code, give the AI this context (copy-paste from `.ai-instructions` at the repo root, or directly paste the file content):

```
You are helping me build a TaaS Plugin. The base class is SovereignAdapter from @taas/discovery.
Read the full interface in .ai-instructions before generating anything.
```

### The generation prompt template

Use this exact prompt to scaffold the implementation body (after running `./scripts/scaffold.sh`):

```
I have a plugin scaffold at <category>/<name>/src/<Name>DataSource.ts.
The provider API is: <describe the external API, base URL, auth method, key endpoints>.

Please implement:
1. fetchData(params, signal?) — use this.client (Axios) with signal forwarded. Map params to the correct endpoint.
2. getMockData(params) — return realistic hardcoded data. Zero network calls.
3. Update the constructor capabilities block: set supportsHistorical, methods, and rateLimitPerMinute correctly.
4. Output the updated plugin.json with correct name, package, class, category, version.
5. Output a <Name>.test.ts that calls describeUcmCompliance() plus 2-3 provider-specific tests.

Constraints:
- Only import from @taas/discovery and @taas/interfaces
- category must be one of the DataCategory enum values listed in .ai-instructions
- getMockData must never call fetch, axios, or this.client
- Always throw new Error(...) — never throw a string
- Forward signal to every this.client call
```

### Post-generation verification checklist

After the AI produces code, verify:

- [ ] `category` is a real `DataCategory` value (check the table in README.md)
- [ ] `getMockData` contains zero `await fetch` / `this.client` calls
- [ ] Every `this.client.get/post` receives `signal`
- [ ] No imports from `taas-gateway`, `taas-backend`, or any other sibling repo
- [ ] `plugin.json` `class` field matches the exported class name exactly
- [ ] `package.json` `name` matches `plugin.json` `package` exactly

### Red-green iteration with the UCM harness

Run the harness after generation:

```bash
pnpm --filter @taas/plugin-<name> test
```

Paste any failure output back into the AI with:

```
The UCM test failed with this output:
<paste vitest failure>

Fix only the failing assertion. Do not change anything else.
```

The harness error messages are written to be unambiguous and directly actionable.

### Known AI failure modes

| Failure | How to spot it | Fix |
|---|---|---|
| Hallucinated import path | `import { X } from 'taas-gateway/...'` | Replace with `@taas/discovery` or `@taas/interfaces` |
| Fabricated `DataCategory` value | `DataCategory.BLOCKCHAIN` (does not exist) | Check the full enum in `.ai-instructions` |
| Network call in `getMockData` | `await this.client.get(...)` inside `getMockData` | Replace with hardcoded return value |
| Missing `signal` forwarding | `this.client.get(url, { params })` without `signal` | Add `signal` to the options object |
| Wrong `class` in `plugin.json` | Class renamed but `plugin.json` not updated | Sync the `class` field with the actual export name |

---

## 9. Deprecation and Maintenance Policy

A plugin is considered **unmaintained** if:
- CI has been failing for 30+ consecutive days, AND
- No PR or issue activity exists from the plugin author in that period

After 90 days in the unmaintained state, a maintainer may:
1. Open an issue tagged `status: deprecated` with a 14-day notice period
2. Move the plugin to `deprecated/<category>/<name>/`
3. Remove it from `pnpm-workspace.yaml` so it no longer participates in CI

Deprecated plugins are preserved for reference but not loaded by the gateway.

If you adopt an unmaintained plugin, comment on the deprecation issue with a fix PR — the plugin will be restored to active status.

---

## 10. Code Review Checklist

Reviewers verify the following before approving a plugin PR:

- [ ] Scaffold structure matches the expected layout
- [ ] `plugin.json` fields are all correct and consistent with `package.json`
- [ ] `SovereignAdapter` is the base class; no direct `DataSource` implementation
- [ ] `category` is valid; `capabilities.methods` is non-empty
- [ ] `fetchData` forwards `AbortSignal`
- [ ] `getMockData` is offline — no network calls
- [ ] All errors are `throw new Error(...)` instances
- [ ] No hardcoded API keys or secrets
- [ ] No imports from `taas-gateway` internals
- [ ] UCM harness passes (`describeUcmCompliance` suite is green)
- [ ] `pnpm audit --audit-level high` is clean
- [ ] Changeset entry is present (`pnpm changeset` was run)
- [ ] Commit message follows Conventional Commits format
