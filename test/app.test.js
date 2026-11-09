import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/http/app.js';
import { createRouter } from '../src/http/router.js';

async function withServer(server, run) {
  server.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

describe('HTTP app', () => {
  it('answers a real HTTP request to /health', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
    });
  });

  it('returns a consistent JSON 404 for an unknown API route', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/missing`);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), {
        error: { code: 'NOT_FOUND', message: 'API route not found' },
      });
    });
  });

  it('returns a JSON 400 for malformed JSON', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/echo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' },
      });
    });
  });

  it('serves static files and prevents paths escaping public/', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const page = await fetch(`${baseUrl}/`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Event Ticketing API/);

      const escaped = await fetch(`${baseUrl}/%2e%2e%2fpackage.json`);
      assert.equal(escaped.status, 404);
      assert.deepEqual(await escaped.json(), {
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      });
    });
  });

  it('hides unexpected error details behind the standard JSON shape', async () => {
    const router = createRouter();
    router.add('GET', '/api/crash', () => {
      throw new Error('private implementation detail');
    });

    await withServer(createApp({ router }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/crash`);
      assert.equal(response.status, 500);
      const body = await response.json();
      assert.deepEqual(body, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
      assert.doesNotMatch(JSON.stringify(body), /private implementation|stack/i);
    });
  });
});