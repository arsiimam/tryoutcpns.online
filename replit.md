# SiapCPNS — Platform Tryout CPNS Online

Platform simulasi CAT BKN untuk mempersiapkan ujian CPNS dengan ribuan soal HOTS, analisis skor, dan ranking nasional.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cpns-tryout run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — secret for express-session cookie signing
- Required secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — for Google OAuth

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (at `/`)
- API: Express 5 (at `/api`)
- DB: PostgreSQL + Drizzle ORM
- Auth: Custom session-based auth (express-session + connect-pg-simple + bcryptjs + Google OAuth2)
- Payments: Duitku payment gateway
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/users.ts` — users table definition (source of truth for auth)
- `lib/api-spec/openapi.yaml` — API contract
- `artifacts/api-server/src/routes/auth.ts` — all auth routes (register, login, logout, me, google oauth)
- `artifacts/api-server/src/app.ts` — express app setup with session middleware
- `artifacts/cpns-tryout/src/lib/auth-context.tsx` — frontend auth context (session-based)
- `artifacts/cpns-tryout/src/pages/auth/` — sign-in, sign-up, forgot-password pages

## Architecture decisions

- **Custom auth over Clerk**: Session-based auth with bcryptjs and Google OAuth2 (direct flow, no passport). Removed Clerk entirely for full control over user data and DB schema.
- **Sessions in PostgreSQL**: `connect-pg-simple` stores sessions in `user_sessions` table for persistence across server restarts.
- **Google OAuth flow**: GET `/api/auth/google?flow=signin|signup` → Google → `/api/auth/google/callback`. Sign-in rejects unknown emails; sign-up creates new accounts.
- **No email OTP/verification**: Registrations are immediately active. Passwords use bcryptjs (salt rounds: 10).
- **Role-based routing**: `role` field on users table (`participant` | `admin`). DashboardGuard and AdminGuard enforce routing in the frontend.

## Product

- Landing page with Masuk/Daftar buttons
- Registration: email+password (no OTP) or Google OAuth (auto-create)
- Login: email+password or Google OAuth (email must exist)
- Participant dashboard with tryout list, session, result, ranking, subscription, profile pages
- Admin panel with questions, categories, tryouts, users, subscriptions, payments, coupons, reports, CMS

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Google OAuth REDIRECT_URI must match what's registered in Google Cloud Console. Currently uses `https://${REPLIT_DEV_DOMAIN}/api/auth/google/callback`.
- Session cookie is `httpOnly`, `sameSite: lax`, secure in production. In dev, `secure: false`.
- The `user_sessions` table is auto-created by connect-pg-simple (`createTableIfMissing: true`).
- Always run `pnpm --filter @workspace/db run push` after schema changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
