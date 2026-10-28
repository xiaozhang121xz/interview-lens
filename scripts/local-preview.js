#!/usr/bin/env node

const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PREVIEW_PORT || 3000);
const baseUrl = `http://127.0.0.1:${port}`;
const binaryCache = path.join(root, '.cache', 'mongodb-binaries');
const mongoVersion = process.env.MONGOMS_VERSION || '7.0.24';
const demoUser = {
  username: 'demo_user',
  password: 'Demo-2026!',
  displayName: '演示用户',
  email: 'demo@example.test',
};

let replSet;
let nextProcess;
let stopping = false;

function randomSecret() {
  return crypto.randomBytes(48).toString('base64url');
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} exited with ${code}\n${output}`));
    });
  });
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (nextProcess.exitCode !== null) {
      throw new Error(`Preview server exited with ${nextProcess.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Preview server did not become ready in time');
}

async function createDemoUser() {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(demoUser),
  });
  if (response.status !== 201 && response.status !== 409) {
    throw new Error(`Could not create demo user: HTTP ${response.status} ${await response.text()}`);
  }
}

async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (nextProcess && nextProcess.exitCode === null) {
    nextProcess.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => nextProcess.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
  if (replSet) await replSet.stop();
  process.exit(exitCode);
}

async function main() {
  console.log('[Preview] Starting isolated MongoDB...');
  replSet = await MongoMemoryReplSet.create({
    binary: { version: mongoVersion, downloadDir: binaryCache },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const databaseUrl = replSet.getUri('talkagent_local_preview');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: databaseUrl,
    SHENTONG_MIDDLEWARE_MONGO_URI: databaseUrl,
    JWT_SECRET: randomSecret(),
    REFRESH_SECRET: randomSecret(),
    VERIFICATION_CODE_SECRET: randomSecret(),
    AI_API_KEY: 'dummy-key-for-build',
    AZSHENTONG_API_KEY: '',
    ANTHROPIC_API_KEY: '',
  };

  console.log('[Preview] Creating temporary database schema...');
  await run(process.execPath, [
    path.join(root, 'node_modules', 'prisma', 'build', 'index.js'),
    'db', 'push', '--schema', path.join(root, 'prisma', 'schema.prisma'), '--skip-generate',
  ], env);

  console.log('[Preview] Starting the production build...');
  nextProcess = spawn(process.execPath, [
    path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  nextProcess.stdout.pipe(process.stdout);
  nextProcess.stderr.pipe(process.stderr);
  await waitForServer();
  await createDemoUser();

  console.log('');
  console.log(`[Preview] Ready: ${baseUrl}/login`);
  console.log(`[Preview] Username: ${demoUser.username}`);
  console.log(`[Preview] Password: ${demoUser.password}`);
  console.log('[Preview] Press Ctrl+C to stop; all preview data will be discarded.');

  nextProcess.once('exit', (code) => stop(code || 0));
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));

main().catch((error) => {
  console.error('[Preview] Failed:', error);
  stop(1);
});
