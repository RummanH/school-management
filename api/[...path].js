import { createBackendRuntime } from '../backend/runtime.js';

let runtimePromise;

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = createBackendRuntime();
  }

  return runtimePromise;
}

export default async function handler(req, res) {
  const { app } = await getRuntime();
  return app(req, res);
}
