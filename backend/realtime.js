import { Server } from "socket.io";
import { readCookie } from "./lib/cookies.js";

// Per-user rooms ("user:<id>") rather than per-thread rooms: a user's unread
// badges and thread list need updating for messages in ANY of their threads,
// not just the one currently open, and a user may have multiple tabs open.
function roomForUser(userId) {
  return `user:${userId}`;
}
function roomForTenant(tenantId) {
  return `tenant:${tenantId}`;
}

export function createRealtimeGateway() {
  let io = null;
  // tenantId -> Map<userId, Set<socketId>> — a user counts as online while
  // their socket set is non-empty, so multiple tabs/devices don't flicker
  // the status offline when just one of them closes.
  const tenantPresence = new Map();

  function presenceMapFor(tenantId) {
    if (!tenantPresence.has(tenantId)) tenantPresence.set(tenantId, new Map());
    return tenantPresence.get(tenantId);
  }

  return {
    // Attaches Socket.IO to the same HTTP server Express listens on (no
    // separate port). Called once from server.js after the server is created.
    attach(httpServer, { authService, env, getThreadParticipantIds }) {
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
        const { id: userId, tenantId } = socket.data.user;
        socket.join(roomForUser(userId));

        // system_developer accounts have no tenant, so there's no school's
        // worth of contacts to show presence for — skip presence entirely.
        if (!tenantId) return;
        socket.join(roomForTenant(tenantId));

        const presence = presenceMapFor(tenantId);
        const wasOffline = !presence.has(userId) || presence.get(userId).size === 0;
        if (!presence.has(userId)) presence.set(userId, new Set());
        presence.get(userId).add(socket.id);

        // Only the connecting client needs the full current snapshot;
        // everyone else just needs the one "this person came online" event.
        const onlineUserIds = [...presence.entries()]
          .filter(([uid, sockets]) => uid !== userId && sockets.size > 0)
          .map(([uid]) => uid);
        socket.emit("presence:snapshot", { onlineUserIds });

        if (wasOffline) {
          socket.to(roomForTenant(tenantId)).emit("presence:online", { userId });
        }

        socket.on("disconnect", () => {
          const sockets = presence.get(userId);
          if (!sockets) return;
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            io.to(roomForTenant(tenantId)).emit("presence:offline", { userId, lastSeenAt: new Date().toISOString() });
          }
        });

        // Typing indicator: purely ephemeral (no DB write), relayed to the
        // other participants of that specific thread. Membership is checked
        // on every event rather than trusted from the client, since anyone
        // could otherwise emit a threadId they don't belong to and learn who
        // else is in it.
        async function relayTyping(event, threadId) {
          if (!threadId || !getThreadParticipantIds) return;
          const participantIds = await getThreadParticipantIds(threadId).catch(() => []);
          if (!participantIds.includes(userId)) return;
          for (const uid of participantIds) {
            if (uid === userId) continue;
            io.to(roomForUser(uid)).emit(event, { threadId, userId, name: socket.data.user.name });
          }
        }
        socket.on("typing:start", ({ threadId } = {}) => relayTyping("typing:update", threadId));
        socket.on("typing:stop", ({ threadId } = {}) => relayTyping("typing:stopped", threadId));
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
