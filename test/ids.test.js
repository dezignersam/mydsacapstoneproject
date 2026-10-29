import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { newId, newReference } from '../src/domain/ids.js';
import { DomainError } from '../src/domain/errors.js';

describe('IDs', () => {
  it('creates UUIDs and readable references', () => {
    assert.match(newId(), /^[0-9a-f-]{36}$/i);
    assert.match(newReference(), /^[A-HJ-NP-Z2-9]{8}$/);
  });

  it('validates reference length', () => {
    for (const length of [0, -1, 1.5, 33]) {
      assert.throws(() => newReference(length), (error) =>
        error instanceof DomainError && error.code === 'VALIDATION');
    }
  });
});
