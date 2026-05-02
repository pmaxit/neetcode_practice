## Parent

## What to build

Create an integration test for the `/api/annotations` endpoint using Supertest. Test that a valid annotation can be saved and retrieved.

## Acceptance criteria
- [ ] POST request with valid base64 image data returns 200 OK.
- [ ] Verify annotation is created in database with correct session_id.
- [ ] GET request to retrieve annotation by id returns the stored blob.

## Blocked by
None - can start immediately