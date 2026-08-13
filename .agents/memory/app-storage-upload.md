---
name: App Storage upload setup
description: Durable requirement for presigned upload URLs in the CPNS app
---

**Rule:** Before debugging a presigned image upload failure, ensure the App Storage bucket is provisioned and its bucket/path environment values are present for the API workflow.

**Why:** The upload route can be correctly mounted and authenticated yet still return a generic 500 when the private object directory is not configured; the missing configuration is not visible from the frontend error.

**How to apply:** Provision App Storage idempotently, restart the API workflow so the injected values are loaded, then test the authenticated upload request. Keep the upload route's authentication guard in place.