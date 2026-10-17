// @ts-check
/**
 * Password hashing — Argon2id (master §17). One small wrapper so the
 * algorithm choice lives in exactly one file.
 */
import argon2 from 'argon2';

export async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** @param {string} hash @param {string} password */
export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
