import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPort } from '../src/config.js';

describe('server config', () => {
  it('defaults to port 3000 when PORT is empty', () => {
    assert.equal(getPort(''), 3000);
  });

  it('accepts a valid port', () => {
    assert.equal(getPort('4321'), 4321);
  });

  it('rejects invalid ports', () => {
    for (const value of ['abc', '1.5', '0', '65536']) {
      assert.throws(() => getPort(value), RangeError);
    }
  });
});