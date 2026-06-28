import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backendRoot = path.resolve(__dirname, '..');
export const projectRoot = path.resolve(backendRoot, '..');
export const frontendDistPath = path.join(projectRoot, 'frontend', 'dist');
export const backendDistPath = path.join(backendRoot, 'public', 'dist');
