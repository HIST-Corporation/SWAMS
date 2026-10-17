// @ts-check
/**
 * Platform (console) auth realm — separate from workforce sessions
 * (contract request 31). Platform sessions hold NO business-data permissions.
 */
import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../common/errors.js';

const PLATFORM_PERMISSIONS = Object.freeze(['users.manage', 'roles.manage', 'billing.manage', 'audit.read']);

export function requirePlatformAuth(secret) {
  return (req, _res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthorized('Missing platform token'));
    try {
      const payload = jwt.verify(token, secret);
      if (payload.realm !== 'platform') return next(unauthorized('Not a platform session'));
      req.platformAdmin = { adminId: payload.sub, level: payload.level, permissions: PLATFORM_PERMISSIONS };
      return next();
    } catch {
      return next(unauthorized('Invalid or expired platform token'));
    }
  };
}

/** @param {...string} required */
export function requirePlatformPermission(...required) {
  return (req, _res, next) => {
    if (!req.platformAdmin) return next(unauthorized());
    const ok = required.some((p) => req.platformAdmin.permissions.includes(p));
    if (!ok) return next(forbidden('forbidden', 'Missing platform permission'));
    return next();
  };
}
