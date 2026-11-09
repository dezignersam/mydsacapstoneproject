import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/http/app.js';

async function withServer(run) {
  const server = createApp();
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

describe('Build 4 API', () => {
  it('creates, publishes and searches events through the API', async () => {
    await withServer(async (baseUrl) => {
      const created = await fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-1' },
        body: JSON.stringify({
          title: 'Launch Night',
          city: 'Lagos',
          venue: 'The Dome',
          startsAt: '2026-12-01T18:00:00Z',
        }),
      });

      assert.equal(created.status, 201);
      const event = await created.json();
      assert.equal(event.title, 'Launch Night');
      assert.equal(event.organizerId, 'organizer-1');

      const tier = await fetch(`${baseUrl}/api/events/${event.id}/tiers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-1' },
        body: JSON.stringify({ name: 'VIP', priceCents: 2500, capacity: 10 }),
      });
      assert.equal(tier.status, 201);
      const tierBody = await tier.json();
      assert.equal(tierBody.name, 'VIP');

      const published = await fetch(`${baseUrl}/api/events/${event.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-1' },
      });
      assert.equal(published.status, 200);

      const search = await fetch(`${baseUrl}/api/events?city=Lagos&sort=date`);
      assert.equal(search.status, 200);
      const searchBody = await search.json();
      assert.equal(searchBody.length, 1);
      assert.equal(searchBody[0].title, 'Launch Night');
    });
  });

  it('books and pays a booking with the payer identified by x-user-id', async () => {
    await withServer(async (baseUrl) => {
      const created = await fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-2' },
        body: JSON.stringify({ title: 'Concert', city: 'Abuja', venue: 'Arena', startsAt: '2026-12-05T19:00:00Z' }),
      });
      const event = await created.json();

      const tier = await fetch(`${baseUrl}/api/events/${event.id}/tiers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-2' },
        body: JSON.stringify({ name: 'Standard', priceCents: 1500, capacity: 5 }),
      });
      const tierBody = await tier.json();

      await fetch(`${baseUrl}/api/events/${event.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-2' },
      });

      const booked = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'user-9' },
        body: JSON.stringify({ tierId: tierBody.id, quantity: 2 }),
      });
      assert.equal(booked.status, 201);
      const booking = await booked.json();
      assert.equal(booking.status, 'pending');
      assert.equal(booking.amountCents, 3000);

      const paid = await fetch(`${baseUrl}/api/bookings/${booking.reference}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'user-9' },
        body: JSON.stringify({ card: { number: '4242424242424242' } }),
      });
      assert.equal(paid.status, 200);
      const paidBody = await paid.json();
      assert.equal(paidBody.status, 'paid');
      assert.equal(paidBody.userId, 'user-9');
    });
  });

  it('rejects a declined card and a wrong user paying someone else\'s booking', async () => {
    await withServer(async (baseUrl) => {
      const created = await fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-3' },
        body: JSON.stringify({ title: 'Festival', city: 'Abuja', venue: 'Field', startsAt: '2026-02-10T09:00:00Z' }),
      });
      const event = await created.json();
      const tier = await fetch(`${baseUrl}/api/events/${event.id}/tiers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-3' },
        body: JSON.stringify({ name: 'General', priceCents: 1800, capacity: 4 }),
      });
      const tierBody = await tier.json();
      await fetch(`${baseUrl}/api/events/${event.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'organizer-3' },
      });

      const booked = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'user-imp' },
        body: JSON.stringify({ tierId: tierBody.id, quantity: 1 }),
      });
      const booking = await booked.json();

      const declined = await fetch(`${baseUrl}/api/bookings/${booking.reference}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'user-imp' },
        body: JSON.stringify({ card: { declined: true } }),
      });
      assert.equal(declined.status, 402);
      const declinedBody = await declined.json();
      assert.equal(declinedBody.error.code, 'PAYMENT_DECLINED');

      const forbidden = await fetch(`${baseUrl}/api/bookings/${booking.reference}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': 'other-user' },
        body: JSON.stringify({ card: { number: '4242424242424242' } }),
      });
      assert.equal(forbidden.status, 403);
      const forbiddenBody = await forbidden.json();
      assert.equal(forbiddenBody.error.code, 'FORBIDDEN');
    });
  });
});
