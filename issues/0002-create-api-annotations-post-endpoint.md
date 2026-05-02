## Parent

## What to build

Create an Express.js endpoint `/api/annotations` that accepts a base64 PNG blob and associates it with a specific practice session ID. The endpoint will store the image in the newly created `annotations` table.

## Acceptance criteria
- [ ] POST /api/annotations endpoint is defined.
- [ ] Request body contains `imageDataUrl` (base64 encoded PNG).
- [ ] Endpoint validates that `sessionId` exists and belongs to a valid practice session.
- [ ] Image blob is decoded from base64, stored in the `annotations` table as a BLOB.

## Blocked by
None - can start immediately