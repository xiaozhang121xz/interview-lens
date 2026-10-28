#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.FUNCTIONAL_TEST_PORT || 3211);
const baseUrl = `http://127.0.0.1:${port}`;
const binaryCache = path.join(root, '.cache', 'mongodb-binaries');
const mongoVersion = process.env.MONGOMS_VERSION || '7.0.24';

process.env.MONGOMS_DOWNLOAD_DIR = binaryCache;

const results = [];
let serverOutput = '';

function secret() {
  return crypto.randomBytes(48).toString('base64url');
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}\n${output}`));
    });
  });
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(response) {
    const values = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
    for (const value of values) {
      const firstPart = value.split(';', 1)[0];
      const separator = firstPart.indexOf('=');
      if (separator < 1) continue;
      const name = firstPart.slice(0, separator).trim();
      const cookieValue = firstPart.slice(separator + 1).trim();
      if (cookieValue) this.cookies.set(name, cookieValue);
      else this.cookies.delete(name);
    }
    return values;
  }

  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  clone() {
    const copy = new CookieJar();
    copy.cookies = new Map(this.cookies);
    return copy;
  }

  delete(name) {
    this.cookies.delete(name);
  }
}

async function request(jar, pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = jar?.header();
  if (cookie) headers.set('cookie', cookie);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const method = (options.method || 'GET').toUpperCase();
  const serializedBody = options.body === undefined || typeof options.body === 'string'
    ? options.body
    : JSON.stringify(options.body);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers,
      body: serializedBody,
    });
    const setCookies = jar ? jar.absorb(response) : [];
    const text = await response.text();
    const transientManifestError =
      response.status === 500 &&
      (text.includes('Unexpected end of JSON input') ||
        text.includes('Manifest file is empty')) &&
      attempt < 2;
    if (transientManifestError) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      continue;
    }

    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { response, body, setCookies };
  }
  throw new Error(`Request retry loop ended unexpectedly for ${pathname}`);
}

function expectStatus(result, expected, label) {
  assert.equal(
    result.response.status,
    expected,
    `${label}: expected HTTP ${expected}, got ${result.response.status}: ${JSON.stringify(result.body)}`
  );
}

async function step(label, action) {
  const started = Date.now();
  await action();
  const elapsed = Date.now() - started;
  results.push({ label, elapsed });
  console.log(`  PASS ${label} (${elapsed} ms)`);
}

async function waitForServer(child, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js test server exited early with ${child.exitCode}\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {
      // The server is still compiling.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next.js test server was not ready within ${timeoutMs} ms\n${serverOutput}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    await fetch(`${baseUrl}/__test_shutdown`);
  } catch {
    // Fall back to a process signal below.
  }
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGTERM');
}

async function main() {
  let replSet;
  let server;
  try {
    console.log(`Starting isolated MongoDB ${mongoVersion} replica set...`);
    replSet = await MongoMemoryReplSet.create({
      binary: { version: mongoVersion, downloadDir: binaryCache },
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const databaseUrl = replSet.getUri('talkagent_functional_test');
    const testEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SHENTONG_MIDDLEWARE_MONGO_URI: databaseUrl,
      JWT_SECRET: secret(),
      REFRESH_SECRET: secret(),
      VERIFICATION_CODE_SECRET: secret(),
      AI_API_KEY: 'dummy-key-for-build',
      AZSHENTONG_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      TEST_PORT: String(port),
    };

    console.log('Creating the temporary database schema...');
    await run(process.execPath, [
      path.join(root, 'node_modules', 'prisma', 'build', 'index.js'),
      'db', 'push', '--schema', path.join(root, 'prisma', 'schema.prisma'), '--skip-generate',
    ], { env: testEnv });

    console.log('Starting the application test server...');
    server = spawn(process.execPath, [path.join(root, 'scripts', 'test-server.js')], {
      cwd: root,
      env: testEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const appendServerOutput = (chunk) => {
      serverOutput = `${serverOutput}${chunk}`.slice(-30_000);
    };
    server.stdout.on('data', appendServerOutput);
    server.stderr.on('data', appendServerOutput);
    await waitForServer(server);

    const suffix = `${Date.now()}${crypto.randomInt(1000, 9999)}`;
    const firstUser = {
      username: `smoke_${suffix}`.slice(0, 20),
      password: 'Functional-Test-2026!',
      displayName: '功能测试用户甲',
      email: `smoke-${suffix}@example.test`,
    };
    const secondUser = {
      username: `guard_${suffix}`.slice(0, 20),
      password: 'Functional-Test-2026!',
      displayName: '功能测试用户乙',
      email: `guard-${suffix}@example.test`,
    };
    const firstJar = new CookieJar();
    const secondJar = new CookieJar();
    let customerId;
    let interviewId;

    console.log('Running end-to-end API checks...');

    await step('未登录请求会被拒绝，伪造 X-User-Id 也无法绕过', async () => {
      const result = await request(null, '/api/customers', {
        headers: { 'x-user-id': '000000000000000000000000' },
      });
      expectStatus(result, 401, 'anonymous access');
    });

    await step('账号注册', async () => {
      const result = await request(firstJar, '/api/auth/register', { method: 'POST', body: firstUser });
      expectStatus(result, 201, 'register first user');
      assert.equal(result.body.user.username, firstUser.username);
      assert.equal('password' in result.body.user, false, 'registration response leaked a password field');
    });

    await step('密码登录并设置 HttpOnly 双 Cookie', async () => {
      const result = await request(firstJar, '/api/auth/login', {
        method: 'POST',
        body: { username: firstUser.username, password: firstUser.password },
      });
      expectStatus(result, 200, 'login first user');
      assert.equal(result.body.user.username, firstUser.username);
      assert.equal('accessToken' in result.body, false, 'access token was returned in JSON');
      assert.ok(firstJar.cookies.has('access_token'), 'access_token cookie missing');
      assert.ok(firstJar.cookies.has('refresh_token'), 'refresh_token cookie missing');
      assert.ok(result.setCookies.every((value) => /HttpOnly/i.test(value)), 'auth cookie is not HttpOnly');
    });

    await step('读取当前登录用户', async () => {
      const result = await request(firstJar, '/api/users/current');
      expectStatus(result, 200, 'current user');
      assert.equal(result.body.data.username, firstUser.username);
    });

    await step('刷新令牌轮换，并拒绝旧刷新令牌重放', async () => {
      const replayJar = firstJar.clone();
      firstJar.delete('access_token');
      const refreshed = await request(firstJar, '/api/auth/refresh', { method: 'POST', body: {} });
      expectStatus(refreshed, 200, 'refresh session');
      assert.ok(firstJar.cookies.has('access_token'), 'rotated access cookie missing');
      assert.ok(firstJar.cookies.has('refresh_token'), 'rotated refresh cookie missing');
      replayJar.delete('access_token');
      const replay = await request(replayJar, '/api/auth/refresh', { method: 'POST', body: {} });
      expectStatus(replay, 401, 'replay old refresh token');
      assert.equal(replay.body.error.code, 'TOKEN_REUSED');
    });

    await step('创建客户', async () => {
      const result = await request(firstJar, '/api/customers', {
        method: 'POST',
        body: {
          name: '自动化测试客户',
          companyFullName: '自动化测试客户有限公司',
          industry: '软件与信息服务',
          contactName: '测试联系人',
          contactEmail: 'contact@example.test',
        },
      });
      expectStatus(result, 201, 'create customer');
      customerId = result.body.data.id;
      assert.match(customerId, /^[0-9a-f]{24}$/i);
    });

    await step('查询并更新客户', async () => {
      const detail = await request(firstJar, `/api/customers/${customerId}`);
      expectStatus(detail, 200, 'get customer');
      assert.equal(detail.body.data.name, '自动化测试客户');
      const update = await request(firstJar, `/api/customers/${customerId}`, {
        method: 'PUT',
        body: { notes: '功能联调测试已更新' },
      });
      expectStatus(update, 200, 'update customer');
      assert.equal(update.body.data.notes, '功能联调测试已更新');
    });

    await step('创建访谈项目', async () => {
      const result = await request(firstJar, '/api/interviews', {
        method: 'POST',
        body: {
          title: '自动化功能验收访谈',
          objective: '验证访谈项目、状态和记录接口可以协同工作',
          background: '该数据位于一次性测试数据库中',
          customerId,
        },
      });
      expectStatus(result, 201, 'create interview');
      interviewId = result.body.data.id;
      assert.equal(result.body.data.status, 'draft');
    });

    await step('读取访谈、添加记录并推进状态', async () => {
      const detail = await request(firstJar, `/api/interviews/${interviewId}`);
      expectStatus(detail, 200, 'get interview');
      assert.equal(detail.body.data.customer.id, customerId);
      const record = await request(firstJar, `/api/interviews/${interviewId}/records`, {
        method: 'POST',
        body: { content: '客户希望减少重复录入，提高需求梳理效率。', type: 'requirement', isHighlight: true },
      });
      expectStatus(record, 201, 'create interview record');
      assert.equal(record.body.data.isHighlight, true);
      const status = await request(firstJar, `/api/interviews/${interviewId}/status`, {
        method: 'PUT',
        body: { status: 'prepared' },
      });
      expectStatus(status, 200, 'advance interview status');
      assert.equal(status.body.data.status, 'prepared');
    });

    await step('第二个账号无法访问第一个账号的数据', async () => {
      expectStatus(await request(secondJar, '/api/auth/register', { method: 'POST', body: secondUser }), 201, 'register second user');
      expectStatus(await request(secondJar, '/api/auth/login', {
        method: 'POST',
        body: { username: secondUser.username, password: secondUser.password },
      }), 200, 'login second user');
      expectStatus(await request(secondJar, `/api/customers/${customerId}`), 403, 'cross-user customer access');
      expectStatus(await request(secondJar, `/api/interviews/${interviewId}`), 403, 'cross-user interview access');
    });

    await step('退出登录后会话失效', async () => {
      const logout = await request(firstJar, '/api/auth/logout', { method: 'POST', body: {} });
      expectStatus(logout, 200, 'logout');
      assert.equal(firstJar.cookies.has('access_token'), false);
      assert.equal(firstJar.cookies.has('refresh_token'), false);
      expectStatus(await request(firstJar, '/api/users/current'), 401, 'access after logout');
    });

    console.log(`\nFunctional smoke test passed: ${results.length}/${results.length} checks.`);
    console.log('Temporary test data will now be discarded.');
  } catch (error) {
    console.error('\nFunctional smoke test failed.');
    console.error(error && error.stack ? error.stack : error);
    if (serverOutput) console.error(`\nLast application output:\n${serverOutput}`);
    process.exitCode = 1;
  } finally {
    await stopServer(server);
    if (replSet) await replSet.stop();
  }
}

main();
