import { describe, expect, it } from 'vitest';
import { LANGUAGES, resources } from './i18n.js';

/** Every key path inside a namespace, as `a.b.c` leaf paths. */
const keyPaths = (value, prefix = '') =>
  Object.entries(value)
    .flatMap(([key, child]) =>
      typeof child === 'object' && child !== null
        ? keyPaths(child, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort();

/** Every non-empty string leaf, as `a.b.c=value`. */
const leaves = (value, prefix = '') =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leaves(child, `${prefix}${key}.`)
      : [`${prefix}${key}=${child}`],
  );

/**
 * Catalog parity (Section 8.10 / DoD: i18n en and ne). Catches a key added to
 * one locale only — the failure mode that ships a raw key to a visitor.
 */
describe('i18n catalogs', () => {
  const reference = LANGUAGES[0];
  const namespaces = Object.keys(resources[reference]).sort();

  it('exposes the same namespaces in every locale', () => {
    for (const lng of LANGUAGES) {
      expect(Object.keys(resources[lng]).sort(), lng).toEqual(namespaces);
    }
  });

  for (const lng of LANGUAGES) {
    for (const ns of namespaces) {
      it(`${lng}:${ns} has the same keys as ${reference}:${ns}`, () => {
        expect(keyPaths(resources[lng][ns])).toEqual(keyPaths(resources[reference][ns]));
      });

      it(`${lng}:${ns} has no empty values`, () => {
        const empty = leaves(resources[lng][ns]).filter((entry) => entry.endsWith('='));
        expect(empty).toEqual([]);
      });
    }
  }
});
