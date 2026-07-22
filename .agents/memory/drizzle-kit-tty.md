---
name: drizzle-kit push no-TTY
description: drizzle-kit push crashes in non-interactive shells; use psql directly to create tables
---

## Rule
Never run `pnpm drizzle-kit push` from ShellExec — it requires TTY and throws "Interactive prompts require a TTY terminal".

**Why:** drizzle-kit push needs to prompt about renaming vs creating tables when there's schema ambiguity. ShellExec has no TTY, so it crashes even if there's nothing ambiguous.

**How to apply:** Instead, write `CREATE TABLE IF NOT EXISTS` SQL and run it with:
```bash
psql "$DATABASE_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS ...;
SQL
```
This is safe to run multiple times thanks to `IF NOT EXISTS`.
