import { authState } from '../../auth/mocks/authState.js';
import { FIXTURES } from '../../../mocks/fixtures.js';

/**
 * Who is asking, and what they may see — the board's hierarchy scope (MOCK
 * server rules; the real API owns the same decisions). One session key decides
 * both: an HR/manager session reads and writes every task, a staff session
 * reads and writes only the work referred to them — tasks in their own name
 * plus tasks they are the reviewer of (§4.1 scope lens: the server resolves
 * the scope, the UI only echoes what came back).
 */

/** The signed-in fixture session as `{role, id, name, initials}`. */
export function sessionContext() {
  const key = authState.sessionKey ?? 'hr';
  const session = FIXTURES.sessions[key] ?? FIXTURES.session;
  return {
    role: session.principal?.role ?? 'hr',
    id: session.user?.id ?? null,
    name: session.user?.name ?? null,
    initials: session.user?.initials ?? null,
  };
}

/**
 * Resolve `?scope=` against the session. No parameter means the session's own
 * lens: staff → self, everyone else → all. A staff session asking for `all`
 * is refused rather than quietly narrowed, so the client learns the rule.
 * @returns {{ok: true, scope: string} | {ok: false, status: number, code: string, message: string}}
 */
export function resolveScope(param, ctx) {
  const scope = param ?? (ctx.role === 'staff' ? 'self' : 'all');
  if (scope !== 'self' && scope !== 'all') {
    return {
      ok: false,
      status: 422,
      code: 'invalid_scope',
      message: 'Scope must be "self" or "all".',
    };
  }
  if (scope === 'all' && ctx.role === 'staff') {
    return {
      ok: false,
      status: 403,
      code: 'scope_denied',
      message: 'This session can only see its own work.',
    };
  }
  return { ok: true, scope };
}

/** `self`: tasks in my name or referred to me for review. */
export function inScope(task, ctx, scope) {
  if (scope === 'all') return true;
  return task.assignee?.id === ctx.id || task.reviewer?.id === ctx.id;
}

/** Writes follow the same hierarchy: staff move only their own/reviewed work. */
export function canWrite(task, ctx) {
  if (ctx.role !== 'staff') return true;
  return task.assignee?.id === ctx.id || task.reviewer?.id === ctx.id;
}
