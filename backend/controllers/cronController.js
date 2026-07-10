export class CronController {
  constructor(feeService, env) {
    this.feeService = feeService;
    this.env = env;
  }

  // Shared-secret auth instead of a session: this endpoint is hit by the
  // Vercel Cron scheduler (GET, sends "Authorization: Bearer <CRON_SECRET>"
  // automatically when a CRON_SECRET env var is set) or by manual/testing
  // calls via the "x-cron-secret" header — not a logged-in user either way.
  requireCronSecret = (req, res, next) => {
    const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const provided = bearer || req.get('x-cron-secret') || '';
    if (!this.env.CRON_SECRET || provided !== this.env.CRON_SECRET) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }
    next();
  };

  generateMonthlyInvoices = async (req, res, next) => {
    try {
      const period = req.query.period || req.body?.period || new Date().toISOString().slice(0, 7);
      const results = await this.feeService.generateMonthlyInvoicesForAllTenants(period);
      res.json({ period, results });
    } catch (err) { next(err); }
  };

  applyOverdueFines = async (req, res, next) => {
    try {
      const results = await this.feeService.applyOverdueFinesForAllTenants(req.query.today || req.body?.today);
      res.json({ results });
    } catch (err) { next(err); }
  };
}
