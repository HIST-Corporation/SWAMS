#!/usr/bin/env node
/**
 * Feature generator (Section 6.2 rule 5): `pnpm gen:feature <name> [--release R1]`
 * Creates the exact folder template from Section 6.1.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const releaseArg = args.find((a) => a.startsWith('--release'));
const release = releaseArg ? (releaseArg.split('=')[1] ?? 'R1') : 'R1';

if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: pnpm gen:feature <kebab-case-name> [--release R1]');
  process.exit(1);
}

const APP = process.env.GEN_APP ?? 'web';
const root = join(process.cwd(), 'apps', APP, 'src', 'features', name);

if (existsSync(root)) {
  console.error(`Feature already exists: apps/${APP}/src/features/${name}`);
  process.exit(1);
}

const pascal = name
  .split('-')
  .map((s) => s[0].toUpperCase() + s.slice(1))
  .join('');

for (const dir of ['', 'pages', 'components', 'hooks', 'machines', 'mocks', '__tests__']) {
  mkdirSync(join(root, dir), { recursive: true });
}

const write = (rel, content) => writeFileSync(join(root, rel), content);

write(
  'README.md',
  `# ${pascal} (${release})

Purpose: TODO — one paragraph.
Screens: TODO (link rows in \`docs/design/screen-inventory.md\`).
Permissions: TODO (keys from \`packages/permissions\`).
States: loading · empty · error · denied · offline — designed before happy path.
Open decisions: none yet.
`,
);

write(
  'index.js',
  `// PUBLIC API — the only file other features may import (Section 6.2 rule 1).
export {};
`,
);

write(
  'routes.jsx',
  `// Route objects for this feature. Mounted by apps/${APP}/src/routes (lazy).
export const routes = [];
`,
);

write(
  'api.js',
  `// Calls go through packages/api-client only — components never call fetch (Section 5).\nexport {};\n`,
);

write(
  'schemas.js',
  `// Re-export / extend packages/validation schemas (Section 10, Forms).\nexport {};\n`,
);

write(
  'hooks/keys.js',
  `// Query-key factory for this feature (Section 10, Data).\nexport const ${name.replace(/-/g, '')}Keys = {};\n`,
);

write(
  `pages/${pascal}Page.jsx`,
  `// Thin page: composes components + hooks only (Section 10, Components).
export default function ${pascal}Page() {
  return <div>${pascal}Page — TODO</div>;
}
`,
);

write(
  `__tests__/${name}.test.jsx`,
  `import { describe, it, expect } from 'vitest';

describe('${name} feature scaffold', () => {
  it('has a placeholder test to be replaced', () => {
    expect(true).toBe(true);
  });
});
`,
);

console.log(`Created apps/${APP}/src/features/${name} (release ${release}).`);
