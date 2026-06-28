import { spawn } from 'node:child_process';
import { mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(projectRoot, 'frontend');
const backendRoot = path.join(projectRoot, 'backend');
const frontendDist = path.join(frontendRoot, 'dist');
const publicDist = path.join(projectRoot, 'public');
const backendDist = path.join(backendRoot, 'public', 'dist');

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const actualCommand = isWindows ? 'cmd' : command;
    const actualArgs = isWindows ? ['/c', command, ...args] : args;

    const child = spawn(actualCommand, actualArgs, {
      cwd: options.cwd || projectRoot,
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  await run('npm', ['install'], { cwd: backendRoot });
  await run('npm', ['install', '--include=dev'], { cwd: frontendRoot });
  await run('npm', ['run', 'build'], { cwd: frontendRoot });

  await rm(publicDist, { recursive: true, force: true });
  await rm(backendDist, { recursive: true, force: true });
  await mkdir(publicDist, { recursive: true });
  await mkdir(path.dirname(backendDist), { recursive: true });
  await cp(frontendDist, publicDist, { recursive: true });
  await cp(frontendDist, backendDist, { recursive: true });

  console.log(`Frontend copied to ${publicDist} and ${backendDist}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
