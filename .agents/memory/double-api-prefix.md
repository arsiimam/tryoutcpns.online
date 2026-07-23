---
name: Double /api prefix bug
description: Route paths in sub-routers must NOT include the /api prefix since app.ts already mounts the main router at /api.
---

## The Rule
All route paths in every sub-router file (`admin-bundles.ts`, `admin-tryout-bundles.ts`, `auth.ts`, `admin.ts`, etc.) must use paths WITHOUT the `/api` prefix.

Example — WRONG: `router.get("/api/admin/bundles", ...)` → actual path becomes `/api/api/admin/bundles`
Example — CORRECT: `router.get("/admin/bundles", ...)` → actual path becomes `/api/admin/bundles`

**Why:** `app.ts` does `app.use("/api", router)` which strips the `/api` prefix before the sub-routers see the request. If sub-routers add `/api` back, the paths are doubled and never match.

**How to apply:** When adding new routes to ANY sub-router, always start the path with `/auth/`, `/admin/`, `/plans`, `/participant/`, etc. — never `/api/...`.

**Note:** `router.use(requireAdmin)` (without a path) runs for ALL requests through the sub-router regardless of route matching, so it returns 403 JSON even when the route path doesn't match. This can mask the double-prefix bug as "Admin only" instead of 404.
