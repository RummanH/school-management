import { readCookie } from "../lib/cookies.js";

export class AuthController {
  constructor(authService, env) {
    this.authService = authService;
    this.env = env;
  }

  login = async (req, res, next) => {
    try {
      const { email, password, orgSlug } = req.body;
      const requestMeta = { ip: req.ip, userAgent: req.headers["user-agent"] || "" };
      const result = await this.authService.login({ email, password, orgSlug }, requestMeta);

      res.cookie(this.env.SESSION_COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: this.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: result.expiresAt,
      });

      res.json({ user: result.user, tenant: result.tenant });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const token = readCookie(req, this.env.SESSION_COOKIE_NAME);
      if (token) await this.authService.logout(token);
      res.clearCookie(this.env.SESSION_COOKIE_NAME);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  requestPasswordReset = async (req, res, next) => {
    try {
      const requestMeta = { ip: req.ip, userAgent: req.headers["user-agent"] || "" };
      const result = await this.authService.requestPasswordReset(req.body, requestMeta);
      res.json(result);
    } catch (error) { next(error); }
  };

  confirmPasswordReset = async (req, res, next) => {
    try {
      const requestMeta = { ip: req.ip, userAgent: req.headers["user-agent"] || "" };
      const result = await this.authService.confirmPasswordReset(req.body, requestMeta);
      res.json(result);
    } catch (error) { next(error); }
  };

  me = async (req, res, next) => {
    try {
      res.json({ user: req.currentUser, tenant: req.currentTenant });
    } catch (error) {
      next(error);
    }
  };
}
