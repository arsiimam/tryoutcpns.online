---
name: Session persistence fixes
description: Two bugs that silently break express-session with connect-pg-simple when bundled by esbuild
---

## Bug 1 — `createTableIfMissing: true` crashes at runtime

**Rule:** Never use `createTableIfMissing: true` in `connect-pg-simple` when the server is bundled with esbuild.

**Why:** The option reads a `table.sql` file from the package directory at runtime via `fs.readFile`. esbuild bundles JS but does not copy non-JS assets, so the file is missing and the store throws `ENOENT: no such file or directory, open '.../dist/table.sql'` on every request — silently swallowing the session.

**How to apply:** Create the `user_sessions` table manually before first run (a one-off SQL script is fine), then omit `createTableIfMissing` from the PgStore config entirely.

```sql
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");
```

---

## Bug 2 — Session not persisted before response is sent

**Rule:** Always explicitly call `req.session.save()` before `res.json()` / `res.redirect()` in login/register handlers.

**Why:** `express-session` auto-saves when the response ends, but the async write to the Postgres store may not complete before the client receives the response and fires the next request. The next request then finds an empty session.

**How to apply:**

```typescript
req.session.userId = user.id;
await new Promise<void>((resolve, reject) => {
  req.session.save((err) => (err ? reject(err) : resolve()));
});
return res.json({ user: userPayload(user) });
```

Apply to every handler that sets session data: register, login, and Google OAuth callback.
