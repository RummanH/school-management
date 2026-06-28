import { readCookie } from "../lib/cookies.js";

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

export function requireAuth(authService, env) {
  return async (req, res, next) => {
    try {
      const token = readCookie(req, env.SESSION_COOKIE_NAME) || readBearerToken(req);
      const result = await authService.getUserFromSessionToken(token);

      if (!result) {
        return res.status(401).json({ message: "Authentication required." });
      }

      req.currentUser = result.user;
      req.currentTenant = result.tenant;
      next();
    } catch (error) {
      next(error);
    }
  };
}
