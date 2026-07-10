import cron from "node-cron";

// Persistent-server (Render/local `npm start`) path for the monthly fee
// automation. On Vercel, the equivalent work is triggered by the "crons"
// entry in vercel.json hitting POST /api/cron/fees/generate-monthly instead
// (serverless functions can't host a live setInterval/cron between requests).
// Both paths call the same idempotent FeeService methods, so running both
// in the same deployment (e.g. during a migration) is harmless.
export function startFeeCronScheduler(feeService) {
  // 00:05 on the 1st of every month: bill every active student for the new period.
  cron.schedule("5 0 1 * *", async () => {
    const period = new Date().toISOString().slice(0, 7);
    try {
      await feeService.generateMonthlyInvoicesForAllTenants(period);
    } catch (error) {
      console.error("Monthly fee invoice generation failed", error);
    }
  });

  // 00:15 daily: apply configured late fees to invoices that are now overdue.
  cron.schedule("15 0 * * *", async () => {
    try {
      await feeService.applyOverdueFinesForAllTenants();
    } catch (error) {
      console.error("Overdue fine application failed", error);
    }
  });
}
