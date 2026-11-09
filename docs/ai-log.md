# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 1

### Prompt 1: Build 1 prompt (docs/build-1.md)
- **What I asked:** Implement and verify the Build 1 domain core, readable booking references, linked-list waitlist, demo and lookup benchmark.
- **What came back:** Most requested files and behaviors already existed. I added the `newReference()` API, stricter input and safe-money validation, corresponding tests, and cryptographic benchmark target selection.
- **What was wrong (or "nothing"):** The reference helper used a different name, some malformed inputs could cause raw JavaScript errors, and booking amounts could exceed safe integer precision. I fixed these gaps and verified the demo, benchmark and tests.

## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)
- **What I asked:** Complete Build 2, including S04 event publishing and unpublishing.
- **What came back:** Search, sorting, inventory, and publishing were mostly implemented. I added stricter input validation, additional tests, and the missing `unpublishEvent()` transition.
- **What was wrong (or "nothing"):** The S04 criteria were still a placeholder and unpublishing was not implemented. I documented three criteria, implemented transitions between draft and published states, and reject invalid repeat transitions with `INVALID_STATE`.


## Build 3

### Prompt 1: Build 3 prompt (docs/build-3.md)
- **What I asked:** Add architecture and booking-state diagrams, a booking state machine, a small HTTP router/server, configuration, and tests.
- **What came back:** The requested layers were absent. I added them, protected static-file paths, and verified state transitions and HTTP behavior with tests.
- **What was wrong (or "nothing"):** The first implementation needed explicit boundary and error-shape checks; the final tests cover each allowed and rejected booking transition and the server's health, routing, JSON, and static-file behavior.

## Build 4

### Prompt 1: Build 4 prompt (docs/build-4.md)
- **What I asked:** Implement the in-memory REST API with repositories, services, mock payment, API routes, examples, and API-level tests.
- **What came back:** Most of the core domain logic was already in place. I added the repository/service layer, the mock payment gateway, the route handlers, and real HTTP tests for the happy path and payment errors.
- **What was wrong (or "nothing"):** The main issues were route payload handling and empty JSON bodies. The server was consuming the request body before route handlers could read it, and publish/cancel-style requests without payloads were incorrectly treated as invalid JSON. I fixed the body flow and validated the full API suite with `npm test`.
