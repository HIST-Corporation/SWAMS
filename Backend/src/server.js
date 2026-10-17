// @ts-check
/**
 * Server entrypoint — HTTP + Socket.IO (realtime notifications). Fails fast
 * on invalid env (master §8.4), checks the DB once at boot, and shuts down
 * gracefully on SIGTERM/SIGINT.
 */
import http from 'node:http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { loadEnv } from './config/env.js';
import { logger } from './common/logger.js';
import { buildApp } from './app.js';
import { prisma } from './db/prisma.js';

const env = loadEnv();
const app = buildApp();
const server = http.createServer(app);

// Realtime — same-origin policy enforced via the socket CORS allowlist. The
// client authenticates the handshake with its access token; the socket joins
// a per-user room so notifications fan out without leaking across tenants.
const io = new IOServer(server, {
  cors: { origin: env.socketOrigins, credentials: true },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    socket.data.userId = payload.sub;
    socket.data.orgId = payload.orgId;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { userId, orgId } = socket.data;
  if (userId) socket.join(`user:${userId}`);
  if (orgId) socket.join(`org:${orgId}`);
  logger.debug({ userId }, 'Socket connected');
});

/** Emit a notification to a user's sockets (called by services). */
export function emitToUser(userId, event, payload) {
  io.to(`user:${userId}`).emit(event, payload);
}

const PORT = env.PORT;

async function main() {
  // Fail fast when the database is unreachable — never serve 500s forever.
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database reachable');
  } catch (err) {
    logger.error({ err }, 'Database unreachable at startup');
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info(`SWAMS API listening on :${PORT} (${env.NODE_ENV})`);
  });
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      io.close();
      await prisma.$disconnect();
      process.exit(0);
    });
    // Hard exit if graceful shutdown stalls.
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
