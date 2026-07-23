---
name: Participant router mount path
description: How the participant-tryout router must be mounted in routes/index.ts
---

## Rule

`participantTryoutRouter` must be mounted with a path prefix in `routes/index.ts`:

```typescript
router.use("/participant", participantTryoutRouter);
```

**Not** `router.use(participantTryoutRouter)`.

## Why

The admin routers (`adminBundlesRouter`, `adminTryoutBundlesRouter`) each have `router.use(requireAdmin)` which intercepts ALL requests passing through them. They are mounted after the participant router. If the participant router doesn't match (e.g., because the routes inside use relative paths like `/tryouts` but the router is mounted at root without a prefix), the requests fall through to the admin routers and return 403 "Admin only".

The routes inside `participant-tryout.ts` use short paths (`/tryouts`, `/sessions/:id`, `/results`, `/dashboard`, `/ranking`, `/review`) — they rely on the router being mounted at `/participant`.

## How to apply

Whenever adding new routes to `participant-tryout.ts`, use short paths without the `/participant/` prefix. The prefix is provided by the mount in `routes/index.ts`.
