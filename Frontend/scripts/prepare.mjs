#!/usr/bin/env node
/**
 * `prepare` lifecycle: install git hooks only when .git exists, so a fresh
 * scaffold never fails `pnpm install`.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (existsSync('.git')) {
  try {
    execSync('npx husky', { stdio: 'inherit' });
  } catch (err) {
    console.warn('husky setup skipped:', err.message);
  }
} else {
  console.log('prepare: no .git directory — skipping git hooks');
}
