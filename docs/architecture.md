# Architecture

## Layers

```mermaid
flowchart TD
  Routes[Routes] --> Services[Services]
  Services --> Rules[Domain rules]
  Services --> Repositories[Repositories]
  Repositories --> Data[(Data store)]
```

- **Routes** translate HTTP requests and responses. They may call services, but may not contain business rules or access data directly.
- **Services** coordinate use cases. They may call domain rules and repositories, but may not depend on routes or HTTP details.
- **Domain rules** enforce business invariants. They may depend on neither HTTP nor storage.
- **Repositories** read and write data. They may depend on storage, but may not call services or routes.
- **Data store** persists records. It does not call application layers.

## Data model

```mermaid
erDiagram
  USERS ||--o{ EVENTS : organizes
  USERS ||--o{ BOOKINGS : makes
  EVENTS ||--|{ TICKET_TIERS : offers
  TICKET_TIERS ||--o{ BOOKINGS : reserves
  USERS {
    string id
    string role
  }
  EVENTS {
    string id
    string organizer_id
    string title
    string status
  }
  TICKET_TIERS {
    string id
    string event_id
    int price_cents
    int capacity
    int sold
  }
  BOOKINGS {
    string id
    string attendee_id
    string tier_id
    int quantity
    int amount_cents
    string status
  }
```

## Booking life cycle

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> paid
  pending --> cancelled
  paid --> checked_in
  paid --> refunded
  paid --> cancelled
  cancelled --> [*]
  refunded --> [*]
  checked_in --> [*]
```
