## Parent

## What to build

Connect the `AnnotationOverlay` component's “Save” button to the `/api/annotations` endpoint. On save, capture the canvas content and send it as a POST request.

## Acceptance criteria
- [ ] Save button triggers export of current canvas state.
- [ ] Exports data is base64 encoded PNG string.
- [ ] Request includes `sessionId` from the parent practice session context.
- [ ] After successful save, component shows confirmation message.

## Blocked by
#5