---
title: How do I self-host RevenueDot?
description: Run one Docker image (API plus dashboard) next to Postgres with docker compose. Configure it with a .env file, put HTTPS in front, and set REVENUEDOT_SIGNING_KEY if you sign responses.
---

# How do I self-host RevenueDot?

Clone the repository, copy `.env.example` to `.env`, and run `docker compose up -d`. You get one container that serves the SDK API, the REST API, store notifications and the dashboard on port 8787, next to Postgres 16 with a persistent volume. The server applies database migrations itself when it starts, so upgrades are a rebuild and a restart.

```bash
git clone https://github.com/revenuedot/revenuedot.git
cd revenuedot
cp .env.example .env          # set POSTGRES_PASSWORD before the first start
docker compose up -d          # builds the image and starts RevenueDot and Postgres
curl http://localhost:8787/v1/health        # {"status":"ok"}
```

Open `http://localhost:8787/login` and sign up. **The first account is the owner.** After that, sign-up is closed unless you set `REVENUEDOT_ALLOW_SIGNUP=true`. There is no invite flow yet, so open sign-up for a moment when a teammate needs an account. There is no published image yet; Compose builds it from the source.

## What runs
| Piece | What it does |
|---|---|
| `revenuedot` container (Node.js 22) | One process: SDK API (`/v1`), REST API (`/v2`), dashboard sign-in (`/auth`), OAuth for MCP clients (`/oauth`), store notifications (`/v1/notifications/...`) and the dashboard's web app. A background job runs every 30 seconds: it records expirations, runs the daily Google Play voided-purchase check and sends webhooks |
| `db` container (Postgres 16) | Every customer, purchase, event and setting, in the `revenuedot-data` volume |

Run **one** `revenuedot` container per database for now. The background job has no lock across processes, so two containers could send a webhook twice.

## Settings
Edit `.env` next to `docker-compose.yml`. Store credentials (Apple keys, Google service accounts) are not environment variables: each app holds its own, set in the dashboard or with the REST API.

| Variable | Default | What it does |
|---|---|---|
| `POSTGRES_PASSWORD` | `revenuedot` in Compose | Password of the bundled Postgres. Set it before the first start: it is written into the volume then, and changing it later also needs `ALTER USER` in Postgres |
| `REVENUEDOT_PORT` | `8787` | Host port for everything |
| `REVENUEDOT_ALLOW_SIGNUP` | `false` | `true` lets anyone who reaches the dashboard create an account |
| `REVENUEDOT_SIGNING_KEY` | unset | Base64 Ed25519 seed. Turns on [response signing](trusted-entitlements.md). Not passed through by the default `docker-compose.yml`; see below |

Inside the container the server reads:

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | `pglite://./.data/dev` | `postgres://user:password@host:5432/db` for Postgres (Compose sets it). A `pglite://` path uses an embedded Postgres on disk, for development only |
| `PORT` | `8787` | Port the server listens on |
| `DASHBOARD_DIST` | the built dashboard in the image | Folder of the dashboard's built files. If it has no `index.html`, only the API is served |
| `REVENUEDOT_ALLOW_SIGNUP` | unset (owner only) | See above |
| `REVENUEDOT_SIGNING_KEY` | unset | See above |

### Set the signing key
Generate a key once (`pnpm tsx scripts/signing-keygen.ts` in a checkout with `pnpm install` done), add it to `.env`, and pass it to the container with a `docker-compose.override.yml`, which Compose reads automatically:

```yaml
# docker-compose.override.yml
services:
  revenuedot:
    environment:
      REVENUEDOT_SIGNING_KEY: ${REVENUEDOT_SIGNING_KEY}
```

Check it with `curl http://localhost:8787/.well-known/revenuedot-signing-key`. Stock RevenueCat SDKs still cannot verify these signatures; see [Trusted Entitlements](trusted-entitlements.md).

## Put HTTPS in front
The App Store and Google Pub/Sub send notifications only to public HTTPS URLs, and apps should never talk to your server over plain HTTP. Put a reverse proxy with TLS in front of port 8787, for example Caddy:

```text
# Caddyfile
revenuedot.example.com {
  reverse_proxy localhost:8787
}
```

RevenueDot builds the notification URLs and the SDK's proxy URL it shows in the dashboard from `X-Forwarded-Host` and `X-Forwarded-Proto`. Caddy, nginx and most load balancers send these; check the app page shows `https://revenuedot.example.com/v1/notifications/...`. Session cookies get the `Secure` flag when the request URL is HTTPS.

## Use your own Postgres
Point `DATABASE_URL` at any Postgres 16 database and remove the `db` service, or run the server without Docker:

```bash
pnpm install
pnpm --filter @revenuedot/dashboard build
DATABASE_URL=postgres://revenuedot:secret@db.internal:5432/revenuedot pnpm --filter @revenuedot/server start
```

The server creates its tables on the first start. Managed Postgres (RDS, Cloud SQL, Neon, Railway, Supabase) works; the server keeps a pool of 10 connections.

## Local development
Without `DATABASE_URL`, `pnpm dev` stores data in an embedded Postgres (PGlite) under `.data/dev`, so you need no database server to try changes:

```bash
pnpm install
pnpm --filter @revenuedot/dashboard build   # optional: without it only the API is served
pnpm dev                                    # http://localhost:8787, restarts on changes
```

## Related
- [Upgrades](upgrades.md) and [Backups](backups.md)
- [Going to production](going-to-production.md)
- [Quickstart](../getting-started/quickstart.md)
- [Self-host in 5 minutes](../../blog/self-host-revenuedot-in-5-minutes.md)
