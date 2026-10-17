// @ts-check
/**
 * Auth service — login, MFA, session assembly (contract rows 4–8).
 * The session shape is exactly what `GET /me` and `/auth/login` return in the
 * frontend mock contract (`features/auth/mocks`), so the web app needs no
 * changes: { user, principal, entitlements, preferences, org }.
 */
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma.js';
import { AppError, unauthorized, badRequest } from '../../common/errors.js';
import { verifyPassword } from '../../common/password.js';
import { ROLE_PERMISSIONS, SCOPE_BY_ROLE } from '../../config/constants.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
} from './tokens.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Entitlements mirror the mock sessions: staff lacks 'calendar'. */
function entitlementsFor(role) {
  return role === 'staff' ? ['attendance', 'leave', 'tasks'] : ['attendance', 'leave', 'tasks', 'calendar'];
}

/**
 * The one session payload every auth endpoint returns.
 * @param {object} user Prisma user (with preferences + org)
 */
export function sessionFor(user) {
  const preferences = user.preferences ?? { theme: 'system', language: 'en', calendar: 'bs' };
  return {
    user: {
      id: user.id,
      name: user.name,
      initials: user.initials,
      email: user.email,
      locale: user.locale ?? 'en',
      jobKey: user.jobKey ?? '',
      ...(user.staffRole ? { staffRole: user.staffRole } : {}),
    },
    principal: { id: user.id, role: user.role },
    entitlements: entitlementsFor(user.role),
    preferences: {
      theme: preferences.theme ?? 'system',
      language: preferences.language ?? 'en',
      calendar: preferences.calendar ?? 'bs',
    },
    org: user.org ? { id: user.org.id, name: user.org.name } : null,
  };
}

/** Load a user with relations needed to build a session. @param {string} userId */
async function loadUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true, org: true },
  });
}

/** @param {import('express').Response} res @param {AppEnv} env @param {string} raw */
export function setRefreshCookie(res, env, raw) {
  res.cookie('swams_rt', raw, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: `${env.API_PREFIX}/auth`,
    maxAge: 30 * 86_400_000,
  });
}

/** @param {import('express').Response} res @param {AppEnv} env */
export function clearRefreshCookie(res, env) {
  res.clearCookie('swams_rt', {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: `${env.API_PREFIX}/auth`,
  });
}

/**
 * Issue an access token + rotating refresh cookie for a user.
 * @param {object} user
 * @param {import('express').Response} res
 * @param {AppEnv} env
 */
/**
 * Issue an access token + rotating refresh cookie for a user.
 * @param {object} user
 * @param {import('express').Response} res
 * @param {AppEnv} env
 */
export async function issueSession(user, res, env) {
  const sessionId = `ses_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const accessToken = signAccessToken(
    {
      id: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
      scope: user.scope ?? SCOPE_BY_ROLE[user.role] ?? 'self',
      sessionId,
    },
    { accessSecret: env.JWT_ACCESS_SECRET, accessTtl: env.JWT_ACCESS_TTL },
  );
  const { raw } = await issueRefreshToken({ userId: user.id, orgId: user.orgId });
  setRefreshCookie(res, env, raw);
  return { accessToken, session: sessionFor(user) };
}

/**
 * Password login. Enumeration-safe: unknown email and wrong password give the
 * same `unauthorized` answer; weak inputs give the mock's validation codes so
 * the frontend shows identical messages.
 */
export async function login({ email, password }, res, env) {
  if (!EMAIL_RE.test(email ?? '')) {
    throw badRequest('invalid_email', 'Enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw badRequest('weak_password', 'Password must be at least 8 characters.');
  }
  const user = await prisma.user.findFirst({
    where: { email: (email ?? '').toLowerCase(), active: true },
    include: { preferences: true, org: true },
  });
  const valid = user ? await verifyPassword(user.passwordHash, password) : false;
  if (!user || !valid) {
    throw unauthorized('Email or password is incorrect.');
  }
  if (user.mfaEnabled) {
    // A pending-MFA token stands between password and session; the code check
    // happens in completeMfa. Demo code lives in mfaSecret (dev seed: 123456).
    const mfaToken = jwt.sign({ sub: user.id, orgId: user.orgId, mfa: true }, env.JWT_ACCESS_SECRET, {
      expiresIn: '10m',
    });
    return { mfaRequired: true, mfaToken };
  }
  return issueSession(user, res, env);
}

/** Complete an MFA challenge. @param {{ mfaToken: string, code: string }} input */
export async function completeMfa({ mfaToken, code }, res, env) {
  let payload;
  try {
    payload = jwt.verify(mfaToken, env.JWT_ACCESS_SECRET);
  } catch {
    throw badRequest('no_mfa_challenge', 'No MFA challenge in progress.');
  }
  if (!payload?.mfa) throw badRequest('no_mfa_challenge', 'No MFA challenge in progress.');
  if (!/^\d{6}$/.test(code ?? '')) {
    throw badRequest('invalid_code', 'Enter the 6-digit code.');
  }
  const user = await loadUser(payload.sub);
  if (!user || !user.mfaEnabled) throw unauthorized();
  if (code !== user.mfaSecret) {
    throw badRequest('invalid_code', 'That code is not correct.');
  }
  return issueSession(user, res, env);
}

/** Rotate the refresh cookie into a fresh access token + session. */
export async function refresh(req, res, env) {
  const raw = req.cookies?.swams_rt;
  if (!raw) throw unauthorized('Sign in again.');
  try {
    const rotated = await rotateRefreshToken(raw);
    const user = await loadUser(rotated.userId);
    if (!user || !user.active) throw unauthorized('Sign in again.');
    setRefreshCookie(res, env, rotated.raw);
    const sessionId = `ses_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const accessToken = signAccessToken(
      {
        id: user.id,
        orgId: user.orgId,
        role: user.role,
        email: user.email,
        permissions: ROLE_PERMISSIONS[user.role] ?? [],
        scope: user.scope ?? SCOPE_BY_ROLE[user.role] ?? 'self',
        sessionId,
      },
      { accessSecret: env.JWT_ACCESS_SECRET, accessTtl: env.JWT_ACCESS_TTL },
    );
    return { accessToken, session: sessionFor(user) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw unauthorized('Sign in again.');
  }
}

/** Logout — revoke the refresh token and clear the cookie. */
export async function logout(req, res, env) {
  const raw = req.cookies?.swams_rt;
  if (raw) await revokeRefreshToken(raw).catch(() => {});
  clearRefreshCookie(res, env);
  return { status: 204 };
}

export { revokeAllUserSessions };
