// @ts-check
/**
 * Session tokens — short-lived JWT access + rotating opaque refresh (master §17).
 * Refresh rotation with reuse detection: reuse ⇒ revoke whole family.
 * Refresh tokens live in `refresh_tokens` table (hashed); access is stateless JWT.
 */
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { ROLE_PERMISSIONS, SCOPE_BY_ROLE } from '../../config/constants.js';

function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * @param {{ id: string, orgId: string, role: string, email: string, permissions?: string[], scope?: string, sessionId: string }} user
 * @param {{ accessSecret: string, accessTtl: string }} cfg
 */
export function signAccessToken(user, cfg) {
  const permissions = user.permissions ?? ROLE_PERMISSIONS[user.role] ?? [];
  return jwt.sign(
    {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
      permissions,
      scope: user.scope ?? SCOPE_BY_ROLE[user.role] ?? 'self',
      sid: user.sessionId,
      realm: 'workforce',
    },
    cfg.accessSecret,
    { expiresIn: cfg.accessTtl },
  );
}

/**
 * Issue a new refresh-token family member.
 * @param {{ userId: string, orgId: string }} ids
 * @param {{ days?: number, familyId?: string }} [options]
 */
export async function issueRefreshToken(ids, options = {}) {
  const raw = randomBytes(48).toString('hex');
  const familyId = options.familyId ?? randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + (options.days ?? 30) * 86_400_000);
  const record = await prisma.refreshToken.create({
    data: {
      userId: ids.userId,
      orgId: ids.orgId,
      familyId,
      tokenHash: hashToken(raw),
      expiresAt,
    },
  });
  return { raw, record, familyId, expiresAt };
}

/**
 * Rotate a refresh token. Returns new tokens or throws with `code`.
 * Reuse of an already-rotated token revokes the whole family (reuse detection).
 * @param {string} raw
 */
export async function rotateRefreshToken(raw) {
  const hashed = hashToken(raw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hashed } });
  if (!existing) {
    const err = new Error('Unknown refresh token');
    // @ts-ignore
    err.code = 'unauthorized';
    throw err;
  }
  if (existing.revoked || existing.expiresAt < new Date()) {
    // Possible reuse: revoke family to contain breach.
    await prisma.refreshToken.updateMany({ where: { familyId: existing.familyId }, data: { revoked: true } });
    const err = new Error('Refresh token expired or revoked');
    // @ts-ignore
    err.code = 'unauthorized';
    throw err;
  }
  // Check reuse: if this token was already rotated (a successor exists), revoke family.
  const successor = await prisma.refreshToken.findFirst({
    where: { familyId: existing.familyId, createdAt: { gt: existing.createdAt }, revoked: false },
  });
  // Mark current as revoked, issue successor in same family.
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
  if (successor) {
    await prisma.refreshToken.updateMany({ where: { familyId: existing.familyId }, data: { revoked: true } });
    const err = new Error('Refresh token reuse detected');
    // @ts-ignore
    err.code = 'unauthorized';
    throw err;
  }
  const next = await issueRefreshToken(
    { userId: existing.userId, orgId: existing.orgId },
    { familyId: existing.familyId },
  );
  return { userId: existing.userId, orgId: existing.orgId, familyId: existing.familyId, raw: next.raw, record: next.record };
}

/** Revoke one refresh token (logout) or whole family (logout-all). */
export async function revokeRefreshToken(raw) {
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(raw) }, data: { revoked: true } });
}

/** @param {string} userId */
export async function revokeAllUserSessions(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
}
