#!/usr/bin/env node
/**
 * Component generator (Section 6.2 rule 5): `pnpm gen:component <Name> [--pattern|--domain]`
 * Creates component + story + test in packages/ui.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const kind = args.includes('--domain')
  ? 'domain-ui'
  : args.includes('--pattern')
    ? 'patterns'
    : 'primitives';

if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name)) {
  console.error('Usage: pnpm gen:component <PascalCaseName> [--pattern|--domain]');
  process.exit(1);
}

const base = join(process.cwd(), 'packages', 'ui', 'src', kind);
const componentFile = join(base, `${name}.jsx`);
const storyFile = join(base, `${name}.stories.jsx`);
const testFile = join(base, `${name}.test.jsx`);

if (existsSync(componentFile)) {
  console.error(`Component already exists: packages/ui/src/${kind}/${name}.jsx`);
  process.exit(1);
}

mkdirSync(base, { recursive: true });

writeFileSync(
  componentFile,
  `/**
 * ${name}
 * States: default · hover/focus · disabled · loading — each has a story (Section 8.7).
 * @param {object} props
 */
export function ${name}({ children, ...props }) {
  return (
    <div {...props}>
      {children}
    </div>
  );
}
`,
);

writeFileSync(
  storyFile,
  `import { ${name} } from './${name}';

export default {
  title: 'Primitives/${name}',
  component: ${name},
};

export const Default = { args: { children: '${name}' } };
export const Dark = { parameters: { themes: { theme: 'dark' } } };
`,
);

writeFileSync(
  testFile,
  `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders its content', () => {
    render(<${name}>hello</${name}>);
    expect(screen.getByText('hello')).toBeTruthy();
  });
});
`,
);

console.log(`Created packages/ui/src/${kind}/${name}.{jsx,stories.jsx,test.jsx}`);
