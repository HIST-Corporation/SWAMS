// @ts-check
/**
 * Prisma client singleton — one connection pool per process.
 * JavaScript-only: generated client is plain JS, no TS build step.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = /** @type {{ prisma?: PrismaClient }} */ (globalThis);

/**
 * Base client. Requests add tenant scoping in services (master §8.3:
 * strict modular monolith with enforced orgId on every business row).
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
