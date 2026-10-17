#!/usr/bin/env node
/**
 * JavaScript-only guard (Section 5A: "No .ts files, no TS build step").
 * Fails when any TypeScript source file exists in the workspace.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['apps', 'packages', 'scripts', 'tests'];
const IGNORE = new Set(['node_modules', 'dist', '.next', 'out', 'storybook-static', '.turbo']);

/** @param {string} dir @param {string[]} acc */
function walk(dir, acc) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const offenders = [];
for (const dir of SCAN_DIRS) {
  try {
    for (const file of walk(join(ROOT, dir), [])) {
      if (/\.(ts|tsx|mts|cts)$/.test(file)) offenders.push(relative(ROOT, file));
    }
  } catch {
    // directory may not exist yet
  }
}

if (offenders.length > 0) {
  console.error('TypeScript files are forbidden (JavaScript only):\n  ' + offenders.join('\n  '));
  process.exit(1);
}
console.log('check-js-only: ok (no TypeScript files)');
