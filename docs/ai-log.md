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

### Prompt 2:
- **What I asked:**
- **What came back:**
- **What was wrong (or "nothing"):**
