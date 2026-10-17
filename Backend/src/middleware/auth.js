// @ts-check
/**
 * AuthN middleware — verifies short-lived JWT access token (master §17).
 * Access token in memory (frontend), refresh via httpOnly cookie.
 * Attaches req.principal = { userId, orgId, role, permissions, scope, sessionId }.
 */
import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../common/errors.js';
import { ROLE_PERMISSIONS, SCOPE_BY_ROLE } from '../config/constants.js';

/**
 * @param {import('express').Request} req
 */
function principalFromPayload(payload) {
  const role = payload.role;
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions
    : ROLE_PERMISSIONS[role] ?? [];
  return {
    userId: payload.sub,
    orgId: payload.orgId ?? null,
    role,
    permissions,
    scope: payload.scope ?? SCOPE_BY_ROLE[role] ?? 'self',
    sessionId: payload.sid ?? null,
    email: payload.email ?? null,
  };
}

export function requireAuth(secret) {
  return (req, _res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(unauthorized('Missing or invalid Authorization header'));
    }
    try {
      const payload = jwt.verify(token, secret);
      req.principal = principalFromPayload(payload);
      return next();
    } catch {
      return next(unauthorized('Invalid or expired access token'));
    }
  };
}

/**
 * Server-enforced RBAC — UI hiding is cosmetic only (master §17).
 * @param {...string} required any one of these permissions grants access
 */
export function requirePermission(...required) {
  return (req, _res, next) => {
    const principal = req.principal;
    if (!principal) return next(unauthorized());
    const ok = required.some((p) => principal.permissions.includes(p));
    if (!ok) return next(forbidden('forbidden', 'Missing required permission'));
    return next();
  };
}

/**
 * Role gate — e.g. staff-only board rejects HR with not_a_staff_board.
 * @param {...string} roles
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    const principal = req.principal;
    if (!principal) return next(unauthorized());
    if (!roles.includes(principal.role)) {
      return next(forbidden('forbidden', `Requires role: ${roles.join(', ')}`));
    }
    return next();
  };
}
