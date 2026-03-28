# Security Policy — taas-plugins

Because `taas-plugins` is an open-contribution repository, every plugin submitted by an external
author is a potential attack surface. This document defines the rules all plugin authors and
reviewers must follow.

---

## Rules for Plugin Authors

### 1. Never Hardcode Secrets

API keys, tokens, and passwords must never appear in source code or `plugin.json`.

```typescript
// Correct — key comes from the runtime config
constructor(config: Partial<AdapterConfig> = {}) {
  super({ name: 'My Source', category: DataCategory.CUSTOM, ...config });
}

// Wrong — hardcoded key
constructor() {
  super({ apiKey: 'sk-abc123...' });
}
```

Use `AdapterConfig.apiKey` (passed in by the gateway at runtime) or `secretProvider.getSecret(name)` for secrets that need to be fetched dynamically. CI runs [Gitleaks](https://github.com/gitleaks/gitleaks) on every PR — any hardcoded credential will block the merge.

---

### 2. SSRF — Do Not Accept Arbitrary URLs from Params

The `SovereignAdapter` base class already routes all HTTP calls through `NetworkSafety.validateUrl()`, which blocks requests to private IP ranges (`127.x`, `10.x`, `192.168.x`, `169.254.x`, etc.).

**Plugins must not bypass this:**

```typescript
// Wrong — opens SSRF if params.url is controlled by an untrusted caller
const response = await axios.get(params.url as string);

// Correct — build the URL using a hardcoded base, validated params
const response = await this.client.get(`https://api.example.com/v1/${params.symbol}`);
```

Do not accept `baseUrl`, `host`, or `endpoint` from `params` unless you perform explicit allow-list validation first.

---

### 3. No Dynamic Code Execution

The following are prohibited in any plugin:

```typescript
eval(...)
new Function(...)
require(someVariable)           // dynamic require
import(someVariable)            // dynamic import from user input
vm.runInNewContext(...)
```

Reviewers will reject any PR that contains these patterns regardless of stated intent.

---

### 4. Dependency Vetting

CI runs `pnpm audit --audit-level high` on every PR. Any high or critical CVE in your dependencies blocks the merge.

Before opening a PR:

```bash
pnpm audit --audit-level high
```

If no fixed version is available, document the advisory in your PR description and propose a mitigation (pin, override, or remove dependency).

---

### 5. No Side Effects on Import

Plugins are loaded as worker threads by the gateway. Module-level code that makes network calls,
opens sockets, or writes to disk can corrupt the worker process.

```typescript
// Wrong — network call at module scope
const prices = await fetch('https://api.example.com/init'); // top-level await

// Correct — do any setup in initialize()
async initialize(): Promise<void> {
  // safe to perform setup here
}
```

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via one of:
- GitHub private security advisory: **Settings → Security → Advisories → New draft**
- Email: `security@friehub.io`

Include:
1. Description of the vulnerability
2. Affected plugin(s) and version(s)
3. Steps to reproduce
4. Suggested fix (if known)

We aim to acknowledge reports within 48 hours and publish a fix within 14 days for confirmed critical issues.
