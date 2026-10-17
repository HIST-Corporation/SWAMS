#!/usr/bin/env node
/**
 * Import-boundary checks (Section 6.2 anti-mess rule 1):
 *  1. Features import only another feature's `index.js`.
 *  2. `packages/*` never imports from `apps/*`.
 *  3. Apps never import each other.
 * Exit code 1 with a list of violations. Runs in `pnpm lint`.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const IGNORE = new Set([
  'node_modules',
  'dist',
  '.next',
  'out',
  'storybook-static',
  '.turbo',
  'e2e',
]);

/** @param {string} dir */
function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc; // directory does not exist in this app (e.g. marketing uses app/)
  }
  for (const entry of entries) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(js|jsx)$/.test(full)) acc.push(full);
  }
  return acc;
}

/** @param {string} file */
function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  const specifiers = [];
  const re =
    /(?:import\s[^'"]*?from\s*|import\s*\(\s*|export\s[^'"]*?from\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) specifiers.push(m[1]);
  return specifiers;
}

const violations = [];

/** @param {string} file @param {string} spec @param {string} reason */
function violation(file, spec, reason) {
  violations.push(`${relative(ROOT, file)} → "${spec}"  (${reason})`);
}

const apps = ['web', 'marketing', 'console'];

for (const app of apps) {
  const featureRoot = join(ROOT, 'apps', app, 'src', 'features');
  let featureDirs = [];
  try {
    featureDirs = readdirSync(featureRoot).filter((d) =>
      statSync(join(featureRoot, d)).isDirectory(),
    );
  } catch {
    featureDirs = [];
  }

  for (const srcDir of ['src', 'app', 'components']) {
    for (const file of walk(join(ROOT, 'apps', app, srcDir))) {
      const rel = relative(join(ROOT, 'apps', app), file);
      const inFeature = rel.startsWith('src/features/');
      const parts = rel.split('/');
      const ownFeature = inFeature ? parts[2] : null;

      for (const spec of importsOf(file)) {
        // Rule 3: apps never import each other (by workspace package name).
        for (const other of apps) {
          if (other !== app && spec.startsWith(`@swams/${other}`)) {
            violation(file, spec, 'apps must not import each other');
          }
        }

        if (!inFeature) continue;

        // Rule 1: cross-feature imports resolve only through a feature's index.js
        const cross = spec.match(/^\.\.\/([^/]+)(\/.*)?$/);
        if (cross) {
          const [, target, rest] = cross;
          if (featureDirs.includes(target) && target !== ownFeature) {
            const ok = rest === undefined || rest === '/index.js' || rest === '/index.jsx';
            if (!ok) {
              violation(
                file,
                spec,
                `features may import only ../${target}/index.js (Section 6.2 rule 1)`,
              );
            }
          }
        }

        // Rule 2 via relative path: a feature must not reach into another app/package internals.
        if (spec.includes('/apps/'))
          violation(file, spec, 'relative import into apps/ is forbidden');
      }
    }
  }
}

// Rule 2: packages never import from apps.
for (const pkg of readdirSync(join(ROOT, 'packages'))) {
  const dir = join(ROOT, 'packages', pkg);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of walk(dir)) {
    for (const spec of importsOf(file)) {
      if (
        spec.startsWith('@swams/web') ||
        spec.startsWith('@swams/marketing') ||
        spec.startsWith('@swams/console')
      ) {
        violation(file, spec, 'packages must never import from apps (Section 6.2 rule 1)');
      }
      if (spec.includes('/apps/')) violation(file, spec, 'packages must never import from apps');
    }
  }
}

if (violations.length > 0) {
  console.error('Boundary violations:\n  ' + violations.join('\n  '));
  process.exit(1);
}
console.log('check-boundaries: ok');
