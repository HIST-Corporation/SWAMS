import { describe, it, expect } from 'vitest';
import { themePreferenceSchema, preferencesPatchSchema, signInSchema } from './index.js';

describe('themePreferenceSchema', () => {
  it('accepts the three Section 8.3 options', () => {
    for (const value of ['light', 'dark', 'system']) {
      expect(themePreferenceSchema.safeParse(value).success).toBe(true);
    }
    expect(themePreferenceSchema.safeParse('blue').success).toBe(false);
  });
});

describe('preferencesPatchSchema', () => {
  it('accepts partial patches and rejects unknown keys', () => {
    expect(preferencesPatchSchema.safeParse({ theme: 'dark' }).success).toBe(true);
    expect(preferencesPatchSchema.safeParse({ theme: 'dark', nope: 1 }).success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('requires a valid email and 8+ char password', () => {
    expect(signInSchema.safeParse({ email: 'sita@himal.com', password: 'password' }).success).toBe(
      true,
    );
    expect(signInSchema.safeParse({ email: 'nope', password: 'password' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
  });
});
