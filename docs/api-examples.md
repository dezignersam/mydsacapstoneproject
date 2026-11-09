# API examples

These curl examples show the happy path in the order requested by Build 4: create, publish, book, pay.

## Create an event

```bash
curl -X POST http://localhost:3000/api/events \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1' \
  -d '{
    "title": "Launch Night",
    "city": "Lagos",
    "venue": "The Dome",
    "startsAt": "2026-12-01T18:00:00Z"
  }'
```

## Add a tier

```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID/tiers \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1' \
  -d '{
    "name": "VIP",
    "priceCents": 2500,
    "capacity": 10
  }'
```

## Publish the event

```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID/publish \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1'
```

## Book tickets

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H 'content-type: application/json' \
  -H 'x-user-id: attendee-1' \
  -d '{
    "tierId": "TIER_ID",
    "quantity": 2
  }'
```

## Pay for the booking

```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_REFERENCE/pay \
  -H 'content-type: application/json' \
  -H 'x-user-id: attendee-1' \
  -d '{
    "card": { "number": "4242424242424242" }
  }'
```
