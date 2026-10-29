import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  unpublishEvent,
  listEventSummaries,
  bookTickets,
  cancelBooking,
  joinWaitlist,
  offerNextOnWaitlist,
  findBookingByReference,
  seatsLeft,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

const throwsCode = (fn, code) =>
  assert.throws(fn, (error) => error instanceof DomainError && error.code === code);

describe('inventory', () => {
  let store;
  let event;
  let tier;

  beforeEach(() => {
    store = createStore();
    event = createEvent(store, {
      title: 'Test Event',
      city: 'Lagos',
      startsAt: '2026-12-05T17:00:00Z',
      organizerId: 'org-1',
    });
    tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 3 });
  });

  describe('creating events and tiers', () => {
    it('starts events as drafts', () => {
      assert.equal(event.status, 'draft');
    });

    it('rejects a missing title, a bad date and bad numbers', () => {
      const sizeBefore = store.events.size;
      throwsCode(() => createEvent(store, { title: ' ', city: 'x', startsAt: '2026-12-05' }), 'VALIDATION');
      throwsCode(() => createEvent(store, { title: 'x', city: 'x', startsAt: 'nope' }), 'VALIDATION');
      throwsCode(() => createEvent(store, { title: 'x', city: 'x', venue: 42, startsAt: '2026-12-05' }), 'VALIDATION');
      throwsCode(() => createEvent(store, null), 'VALIDATION');
      assert.equal(store.events.size, sizeBefore);
      throwsCode(() => addTier(store, event.id, { name: 'x', priceCents: 19.99, capacity: 5 }), 'VALIDATION');
      throwsCode(() => addTier(store, event.id, { name: 'x', priceCents: 100, capacity: 0 }), 'VALIDATION');
      throwsCode(() => addTier(store, event.id, null), 'VALIDATION');
    });

    it('cannot publish an event with no tiers', () => {
      const empty = createEvent(store, { title: 'Empty', city: 'Abuja', startsAt: '2026-12-06' });
      throwsCode(() => publishEvent(store, empty.id), 'INVALID_STATE');
      assert.equal(publishEvent(store, event.id).status, 'published');
    });

    it('publishes a draft and makes it visible in the public event list', () => {
      assert.equal(listEventSummaries(store).some((summary) => summary.id === event.id), false);
      const published = publishEvent(store, event.id);
      assert.equal(published.status, 'published');
      assert.equal(listEventSummaries(store).some((summary) => summary.id === event.id), true);
    });

    it('rejects publishing an event that is already published', () => {
      publishEvent(store, event.id);
      throwsCode(() => publishEvent(store, event.id), 'INVALID_STATE');
    });

    it('unpublishes a published event and hides it from the public list', () => {
      publishEvent(store, event.id);
      const unpublished = unpublishEvent(store, event.id);
      assert.equal(unpublished.status, 'draft');
      assert.equal(listEventSummaries(store).some((summary) => summary.id === event.id), false);
      assert.equal(listEventSummaries(store, { publishedOnly: false }).some((summary) => summary.id === event.id), true);
    });

    it('rejects unpublishing an event that is still a draft', () => {
      throwsCode(() => unpublishEvent(store, event.id), 'INVALID_STATE');
      assert.equal(event.status, 'draft');
    });

    it('rejects adding a tier to a missing event', () => {
      throwsCode(() => addTier(store, 'missing-event', { name: 'GA', priceCents: 100, capacity: 1 }), 'NOT_FOUND');
    });

    it('adds an unsold tier with the expected capacity and seats remaining', () => {
      assert.equal(tier.sold, 0);
      assert.equal(tier.capacity, 3);
      assert.equal(seatsLeft(tier), 3);
    });
  });

  describe('booking', () => {
    it('reduces the seats left and prices in whole cents', () => {
      const booking = bookTickets(store, tier.id, 'ada', 2);
      assert.equal(booking.amountCents, 5000);
      assert.equal(booking.status, 'pending');
      assert.equal(seatsLeft(tier), 1);
    });

    it('rejects a booking bigger than the seats left, and changes nothing', () => {
      bookTickets(store, tier.id, 'ada', 2);
      const bookingCount = store.bookings.size;
      const references = store.bookingsByReference.size;
      throwsCode(() => bookTickets(store, tier.id, 'bayo', 2), 'SOLD_OUT');
      assert.equal(seatsLeft(tier), 1);
      assert.equal(store.bookings.size, bookingCount);
      assert.equal(store.bookingsByReference.size, references);
    });

    it('validates the user and keeps booking amounts within safe whole cents', () => {
      throwsCode(() => bookTickets(store, tier.id, ' ', 1), 'VALIDATION');
      tier.priceCents = Number.MAX_SAFE_INTEGER;
      throwsCode(() => bookTickets(store, tier.id, 'ada', 2), 'VALIDATION');
      assert.equal(seatsLeft(tier), 3);
      assert.equal(store.bookings.size, 0);
    });

    it('lets the last ticket be booked, then reports sold out', () => {
      bookTickets(store, tier.id, 'ada', 3);
      assert.equal(seatsLeft(tier), 0);
      throwsCode(() => bookTickets(store, tier.id, 'bayo', 1), 'SOLD_OUT');
    });

    it('validates the quantity', () => {
      for (const bad of [0, -1, 1.5, 11, '2', undefined]) {
        throwsCode(() => bookTickets(store, tier.id, 'ada', bad), 'VALIDATION');
      }
    });

    it('finds a booking by its reference code', () => {
      const booking = bookTickets(store, tier.id, 'ada', 1);
      assert.match(booking.reference, /^[A-Z2-9]{8}$/);
      assert.equal(findBookingByReference(store, booking.reference), booking);
      assert.equal(findBookingByReference(store, 'NOPE0000'), undefined);
    });
  });

  describe('cancelling', () => {
    it('gives the seats back', () => {
      const booking = bookTickets(store, tier.id, 'ada', 2);
      cancelBooking(store, booking.reference);
      assert.equal(seatsLeft(tier), 3);
      assert.equal(booking.status, 'cancelled');
    });

    it('cannot be done twice (seats are released once)', () => {
      const booking = bookTickets(store, tier.id, 'ada', 2);
      cancelBooking(store, booking.reference);
      throwsCode(() => cancelBooking(store, booking.reference), 'INVALID_STATE');
      assert.equal(seatsLeft(tier), 3);
    });
  });

  describe('waitlist', () => {
    it('only opens when the tier cannot satisfy the request', () => {
      throwsCode(() => joinWaitlist(store, tier.id, 'ada', 1), 'NOT_SOLD_OUT');
      bookTickets(store, tier.id, 'bayo', 3);
      assert.deepEqual(joinWaitlist(store, tier.id, 'ada', 1), { position: 1 });
      assert.deepEqual(joinWaitlist(store, tier.id, 'chidi', 1), { position: 2 });
    });

    it('offers seats first come, first served', () => {
      const booking = bookTickets(store, tier.id, 'bayo', 3);
      joinWaitlist(store, tier.id, 'ada', 1);
      joinWaitlist(store, tier.id, 'chidi', 1);
      assert.equal(offerNextOnWaitlist(store, tier.id), undefined, 'no seats yet');
      cancelBooking(store, booking.reference);
      assert.equal(offerNextOnWaitlist(store, tier.id).userId, 'ada');
      assert.equal(offerNextOnWaitlist(store, tier.id).userId, 'chidi');
    });
  });
});
