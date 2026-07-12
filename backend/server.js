import http from 'node:http';
import { createBackendApp } from './composition.js';
import { startFeeCronScheduler } from './services/feeCronScheduler.js';

async function start() {
  const { app, databaseManager, env, feeService, authService, realtime, getThreadParticipantIds } = await createBackendApp();

  const httpServer = http.createServer(app);
  realtime.attach(httpServer, { authService, env, getThreadParticipantIds });

  httpServer.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    if (databaseManager.isUsingFallbackDatabase()) {
      console.log('DATABASE_URL database name was unavailable, using "postgres" instead.');
    }
  });

  // Only meaningful for a long-lived process (this file); Vercel's serverless
  // deployment instead relies on the "crons" entry in vercel.json.
  startFeeCronScheduler(feeService);
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
