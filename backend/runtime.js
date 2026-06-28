import { createBackendApp } from './composition.js';

export async function createBackendRuntime() {
  return createBackendApp();
}
