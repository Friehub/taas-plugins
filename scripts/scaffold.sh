#!/usr/bin/env bash
# scripts/scaffold.sh
#
# Scaffold a new TaaS Plugin package.
#
# Usage: ./scripts/scaffold.sh <category> <name>
# Example: ./scripts/scaffold.sh onchain etherscan
#
# Creates: <category>/<name>/ with all required files pre-filled.

set -euo pipefail

CATEGORY="${1:-}"
NAME="${2:-}"

if [[ -z "$CATEGORY" || -z "$NAME" ]]; then
  echo "Usage: ./scripts/scaffold.sh <category> <name>"
  echo "Example: ./scripts/scaffold.sh onchain etherscan"
  exit 1
fi

VALID_CATEGORIES=("crypto" "sports" "forex" "weather" "economics" "finance" "onchain"
  "social" "prediction" "news" "music" "dev" "ai" "web" "random" "calendar" "agent" "custom")

VALID=false
for c in "${VALID_CATEGORIES[@]}"; do
  if [[ "$CATEGORY" == "$c" ]]; then VALID=true; break; fi
done

if [[ "$VALID" == false ]]; then
  echo "Error: '$CATEGORY' is not a valid DataCategory."
  echo "Valid values: ${VALID_CATEGORIES[*]}"
  exit 1
fi

# Derive naming variants
CLASS_NAME="$(echo "${NAME:0:1}" | tr '[:lower:]' '[:upper:]')${NAME:1}DataSource"
PACKAGE_NAME="@taas/plugin-${CATEGORY}-${NAME}"
PLUGIN_SLUG="${CATEGORY}-${NAME}"
DEST="${CATEGORY}/${NAME}"

if [[ -d "$DEST" ]]; then
  echo "Error: Directory '$DEST' already exists."
  exit 1
fi

mkdir -p "${DEST}/src"

# ── package.json ────────────────────────────────────────────────────────────
cat > "${DEST}/package.json" <<EOF
{
  "name": "${PACKAGE_NAME}",
  "version": "1.0.0",
  "description": "TaaS plugin for ${NAME} (${CATEGORY})",
  "private": false,
  "type": "module",
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
    "@types/node": "^20.0.0",
    "vitest": "^2.0.0"
  }
}
EOF

# ── tsconfig.json ────────────────────────────────────────────────────────────
cat > "${DEST}/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
EOF

# ── plugin.json ──────────────────────────────────────────────────────────────
cat > "${DEST}/plugin.json" <<EOF
{
  "name": "${PLUGIN_SLUG}",
  "package": "${PACKAGE_NAME}",
  "class": "${CLASS_NAME}",
  "category": "${CATEGORY}",
  "version": "1.0.0"
}
EOF

# ── vitest.config.ts ─────────────────────────────────────────────────────────
cat > "${DEST}/vitest.config.ts" <<EOF
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
EOF

# ── src/<ClassName>.ts ────────────────────────────────────────────────────────
cat > "${DEST}/src/${CLASS_NAME}.ts" <<EOF
import { SovereignAdapter, AdapterConfig, DataCategory } from '@taas/discovery';
import { z } from 'zod';

// TODO: Define the response shape for ${NAME}
export const ${CLASS_NAME}ResponseSchema = z.object({
  value: z.number(),
  timestamp: z.number(),
});
export type ${CLASS_NAME}Response = z.infer<typeof ${CLASS_NAME}ResponseSchema>;

// TODO: Define the params shape for ${name}
export interface ${CLASS_NAME}Params {
  [key: string]: unknown;
}

export class ${CLASS_NAME} extends SovereignAdapter<${CLASS_NAME}Response, ${CLASS_NAME}Params> {
  constructor(config: Partial<AdapterConfig> = {}) {
    super({
      name: '${NAME}',
      category: DataCategory.$(echo "${CATEGORY}" | tr '[:lower:]' '[:upper:]'),
      responseSchema: ${CLASS_NAME}ResponseSchema,
      capabilities: {
        supportsHistorical: false,
        supportsRealtime: true,
        // TODO: list the methods your adapter handles
        methods: ['fetch'],
      },
      ...config,
    });
  }

  protected async fetchData(
    params: ${CLASS_NAME}Params,
    signal?: AbortSignal,
  ): Promise<${CLASS_NAME}Response> {
    // TODO: implement real API call
    // Example:
    // const response = await this.client.get('https://api.example.com/v1/data', {
    //   params: { ... },
    //   signal,
    // });
    // return response.data;
    throw new Error('[${CLASS_NAME}] fetchData not implemented');
  }

  protected async getMockData(_params: ${CLASS_NAME}Params): Promise<${CLASS_NAME}Response> {
    // TODO: return realistic hardcoded data — ZERO network calls
    return {
      value: 0,
      timestamp: Date.now(),
    };
  }
}
EOF

# ── src/index.ts ─────────────────────────────────────────────────────────────
cat > "${DEST}/src/index.ts" <<EOF
export { ${CLASS_NAME} } from './${CLASS_NAME}.js';
export type { ${CLASS_NAME}Response, ${CLASS_NAME}Params } from './${CLASS_NAME}.js';
EOF

# ── src/<ClassName>.test.ts ───────────────────────────────────────────────────
cat > "${DEST}/src/${CLASS_NAME}.test.ts" <<EOF
import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { ${CLASS_NAME} } from './${CLASS_NAME}.js';

// UCM compliance — runs the full harness automatically
describeUcmCompliance('${CLASS_NAME}', () => new ${CLASS_NAME}({ useMocks: true }));

// TODO: Add provider-specific tests below
// describe('${CLASS_NAME} — provider specifics', () => {
//   it('maps symbols correctly', async () => { ... });
// });
EOF

echo ""
echo "Plugin scaffolded at: ${DEST}/"
echo ""
echo "Next steps:"
echo "  1. Implement fetchData() in src/${CLASS_NAME}.ts"
echo "  2. Implement getMockData() with realistic hardcoded data"
echo "  3. Update capabilities.methods with your actual method names"
echo "  4. Run: pnpm install"
echo "  5. Run: pnpm --filter ${PACKAGE_NAME} test"
echo "  6. Open a PR — see CONTRIBUTING.md for the full process"
echo ""
