---
name: VPS Deployment Config
description: Final working VPS deployment settings for tryoutcpns.online on shared VPS with aaPanel/nginx
---

## Working Configuration (tryoutcpns.online)

**Server:** Debian, Node.js v24, PM2, aaPanel nginx at `/www/server/panel/vhost/nginx/`
**App dir:** `/var/www/tryoutcpns`
**API port:** `3009` (NOT 3001 — 3001 is taken by esa-energy on this VPS)

## Key Decisions

### Port
- `API_PORT=3009` in `.env`
- nginx config proxies `/api/` → `http://127.0.0.1:3009`
- ecosystem.config.cjs default `PORT: "3009"`

**Why:** Port 3001 conflicts with `esa-energy` app already running on same VPS.

### PM2 + env vars
- Use `interpreter_args: "--env-file=/var/www/tryoutcpns/.env"` in ecosystem.config.cjs
- Do NOT rely on `source .env` in shell before `pm2 start` — PM2 daemon does NOT inherit shell env vars
- `exec_mode: "fork"` required (ESM modules incompatible with cluster mode)

**Why:** PM2 daemon runs independently of the user shell. Only `--env-file` (Node 20+ built-in) reliably passes vars to the process.

### Admin account creation
- Use `node create-admin.mjs` at `/var/www/tryoutcpns/create-admin.mjs`
- Override: `ADMIN_EMAIL=x@y.com node create-admin.mjs`
- Uses parameterized pg queries — no bash `$` escaping issues

**Why:** Bash `$` expansion corrupts bcrypt hashes (`$2a$10$...`) when using psql `-c "..."` with shell variable interpolation.

### nginx config location (aaPanel)
- `/www/server/panel/vhost/nginx/tryoutcpns.online.conf`
- NOT `/etc/nginx/sites-available/` (standard Debian path, wrong for aaPanel)

## Deploy Workflow
```bash
cd /var/www/tryoutcpns
bash deploy.sh
```
deploy.sh handles: git pull → pnpm install → build libs → build API → build frontend → pm2 restart

## Nginx Proxy Config (key section)
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3009;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## CORS
- `app.set("trust proxy", 1)` required — nginx sets X-Forwarded-For, express-rate-limit throws without it
- `APP_URL=https://tryoutcpns.online` must be in `.env` to whitelist production domain in CORS
