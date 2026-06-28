import { createBackendApp } from './composition.js';

async function start() {
  const { app, databaseManager, env } = await createBackendApp();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    if (databaseManager.isUsingFallbackDatabase()) {
      console.log('DATABASE_URL database name was unavailable, using "postgres" instead.');
    }
  });
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
