import { Server } from "socket.io";
import { readCookie } from "./lib/cookies.js";

// Per-user rooms ("user:<id>") rather than per-thread rooms: a user's unread
// badges and thread list need updating for messages in ANY of their threads,
// not just the one currently open, and a user may have multiple tabs open.
function roomForUser(userId) {
  return `user:${userId}`;
}

export function createRealtimeGateway() {
  let io = null;

  return {
    // Attaches Socket.IO to the same HTTP server Express listens on (no
    // separate port). Called once from server.js after the server is created.
    attach(httpServer, { authService, env }) {
      io = new Server(httpServer, {
        cors: { origin: true, credentials: true },
      });

      io.use(async (socket, next) => {
        try {
          const token = readCookie(socket.handshake, env.SESSION_COOKIE_NAME);
          const result = await authService.getUserFromSessionToken(token);
          if (!result) return next(new Error("unauthorized"));
          socket.data.user = result.user;
          next();
        } catch (err) {
          next(err instanceof Error ? err : new Error("unauthorized"));
        }
      });

      io.on("connection", (socket) => {
        socket.join(roomForUser(socket.data.user.id));
      });

      return io;
    },

    // No-ops before attach() runs (e.g. if a service method fires during
    // startup) or in any environment that never calls attach() at all.
    emitToUser(userId, event, payload) {
      if (!io || !userId) return;
      io.to(roomForUser(userId)).emit(event, payload);
    },
  };
}
