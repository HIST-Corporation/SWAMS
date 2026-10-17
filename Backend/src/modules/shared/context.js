// @ts-check
/**
 * Per-request user context — enriches req.principal with the org facts the
 * scope middleware needs (department + team ids) in one query. Mounted after
 * requireAuth on every workforce route.
 */
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../common/async-handler.js';

export const withUserContext = asyncHandler(async (req, _res, next) => {
  const principal = req.principal;
  if (principal?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: principal.userId },
      select: {
        id: true,
        name: true,
        initials: true,
        departmentId: true,
        staffRole: true,
        site: true,
        memberTeams: { select: { id: true } },
        leadingTeams: { select: { id: true } },
      },
    });
    if (user) {
      const teamIds = [
        ...new Set([...user.memberTeams.map((t) => t.id), ...user.leadingTeams.map((t) => t.id)]),
      ];
      principal.userId = user.id;
      principal.name = user.name;
      principal.initials = user.initials;
      principal.staffRole = user.staffRole;
      principal.site = user.site;
      principal.departmentId = user.departmentId;
      principal.teamIds = teamIds;
    }
  }
  next();
});
