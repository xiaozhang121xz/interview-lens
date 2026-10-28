#!/usr/bin/env node

const http = require('node:http');
const next = require('next');

const port = Number(process.env.TEST_PORT || 3111);
const app = next({ dev: true, dir: process.cwd(), webpack: true });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();
  const server = http.createServer((request, response) => {
    if (request.url === '/__test_shutdown') {
      response.writeHead(204);
      response.end();
      setImmediate(() => process.exit(0));
      return;
    }
    handle(request, response);
  });

  const shutdown = () => {
    server.closeAllConnections?.();
    server.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.listen(port, '127.0.0.1');
}

main().catch((error) => {
  console.error('[Test Server]', error);
  process.exit(1);
});
