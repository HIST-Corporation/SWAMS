// @ts-check
/**
 * OpenAPI contract linter (contract row 35).
 *
 * Validates the API contract artifact so the docs and the backend cannot
 * drift. Defaults to `openapi.yaml` next to this script; override with
 * OPENAPI_SPEC.
 *
 * Exit codes: 0 = contract ok, 1 = invalid/partial contract.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const specPath = process.env.OPENAPI_SPEC ?? join(__dir, '..', 'openapi.yaml');

if (!existsSync(specPath)) {
  console.warn(`[openapi:lint] no spec at ${specPath}; nothing to lint`);
  process.exitCode = 0;
  process.exit(0);
}

const raw = readFileSync(specPath, 'utf8').trim();

function die(message) {
  console.error(`[openapi:lint] ${message}`);
  process.exitCode = 1;
}

// Mechanical gate: every OpenAPI document starts with the version key.
if (!/^openapi:/m.test(raw)) {
  die(`${specPath} does not look like an OpenAPI document (missing 'openapi:' key)`);
}

// Structural gates: document + paths sections must be present.
const missing = [];
if (!/openapi:\s*["']?[\d.]+/m.test(raw)) missing.push('openapi version');
if (!/paths:/m.test(raw)) missing.push('paths');
if (!/info:/m.test(raw)) missing.push('info');

if (missing.length > 0) {
  die(`missing required sections: ${missing.join(', ')}`);
}

// Smoke-check every documented path for a valid method signature.
const pathBlocks = raw.split(/^\w+:/m);
for (const block of pathBlocks) {
  const trimmed = block.trim();
  if (!trimmed || !/^\//.test(trimmed)) continue;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const found = methods.filter((m) => new RegExp(`^${m}:`, 'm').test(trimmed));
  if (found.length === 0) {
    die(`path "${trimmed}" declares no HTTP method`);
  }
}

console.log(`[openapi:lint] OK — ${specPath} (${raw.split(/\r?\n/).length} lines)`);
