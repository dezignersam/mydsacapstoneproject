import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, BOOKING_STATES, canTransition } from '../src/domain/bookingStateMachine.js';
import { DomainError } from '../src/domain/errors.js';

const allowed = new Set([
  'pending:paid',
  'pending:cancelled',
  'paid:checked_in',
  'paid:refunded',
  'paid:cancelled',
]);

describe('booking state machine', () => {
  for (const from of BOOKING_STATES) {
    for (const to of BOOKING_STATES) {
      const isAllowed = allowed.has(`${from}:${to}`);

      it(`${isAllowed ? 'allows' : 'rejects'} ${from} -> ${to}`, () => {
        assert.equal(canTransition(from, to), isAllowed);
        if (isAllowed) {
          assert.doesNotThrow(() => assertTransition(from, to));
        } else {
          assert.throws(
            () => assertTransition(from, to),
            (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
          );
        }
      });
    }
  }

  it('rejects unknown states', () => {
    assert.equal(canTransition('unknown', 'paid'), false);
    assert.throws(
      () => assertTransition('pending', 'unknown'),
      (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
    );
  });
});