import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../src/http/router.js';

describe('router', () => {
  it('matches a method and path, extracting named parameters', () => {
    const router = createRouter();
    const handler = () => {};
    router.add('get', '/api/events/:eventId', handler);

    assert.deepEqual(router.match('GET', '/api/events/event-123'), {
      handler,
      params: { eventId: 'event-123' },
    });
  });

  it('does not match a different method or path', () => {
    const router = createRouter();
    router.add('GET', '/api/events/:eventId', () => {});

    assert.equal(router.match('POST', '/api/events/event-123'), null);
    assert.equal(router.match('GET', '/api/other'), null);
  });

  it('decodes parameter values and permits an optional trailing slash', () => {
    const router = createRouter();
    router.add('GET', '/api/events/:eventId', () => {});

    assert.deepEqual(router.match('GET', '/api/events/a%20b/').params, { eventId: 'a b' });
  });
});