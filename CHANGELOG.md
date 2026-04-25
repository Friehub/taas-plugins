# Changelog - TaaS Plugins Repository

All notable changes to the TaaS Plugins ecosystem are documented here.

## [Unreleased]

### Added
- **@taas/plugin-sdk Migration**: All plugins have been migrated from the deprecated `@taas/discovery` library to the new standalone `@taas/plugin-sdk`.
- **Deno Isolate Compatibility**: Plugins are now verified to run inside Deno isolates for institutional-grade security.
- **Asynchronous AbortSignal Support**: Fully verified cross-isolate cancellation using a concurrent JSON-RPC host.
- **Production Hardening**: Verified compatibility with memory limits (256MB) and hard timeouts (30s) enforced by the gateway's Deno isolate sandbox.
- **Strict Filesystem Constraint**: All plugins now adhere to a constrained filesystem model, using `@taas/plugin-sdk` as a standalone dependency.

### Changed
- **Workspace Linkage**: `pnpm-workspace.yaml` now includes `taas-gateway/ts/plugin-sdk` to allow local development against the latest SDK.
- **Global Dependency Sync**: Performed a repository-wide replacement of `@taas/discovery` with `@taas/plugin-sdk` in all `package.json` and source files.

### Fixed
- **CoinGecko Parameter Logic**: Fixed a bug in `CoingeckoDataSource.ts` where `coinId` was incorrectly overwritten by an undefined `symbol`, causing validation failures.
- **ESM/CJS Interop**: Ensured all plugins satisfy the `Record<string, unknown>` constraint required by the new `SovereignAdapter`.
