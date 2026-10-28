import { createServer } from 'node:http';
import { apiSuccess } from '@interview-lens/contracts/http';
import { apiEnv } from './config/env.ts';

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(
      JSON.stringify(
        apiSuccess({
          service: 'interview-lens-api',
          status: 'ok',
        })
      )
    );
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(
    JSON.stringify({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  );
});

server.listen(apiEnv.API_PORT, apiEnv.API_HOST, () => {
  console.log(`[api] listening on http://${apiEnv.API_HOST}:${apiEnv.API_PORT}`);
});

function shutdown(): void {
  server.close((error) => {
    if (error) {
      console.error('[api] failed to stop cleanly', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
