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

Open `http://localhost:8787/login` and sign up. **The first account is the owner.** After that, sign-up is closed to everyone except the addresses you [invite to a project](team.md), unless you set `REVENUEDOT_ALLOW_SIGNUP=true`. Set up [email](#email) so password resets, invites and alerts reach people. There is no published image yet; Compose builds it from the source.

## What runs
| Piece | What it does |
|---|---|
| `revenuedot` container (Node.js 22) | One process: SDK API (`/v1`), REST API (`/v2`), dashboard sign-in (`/auth`), OAuth for MCP clients (`/oauth`), store notifications (`/v1/notifications/...`) and the dashboard's web app. A background job runs every 30 seconds: it records expirations, runs the daily Google Play voided-purchase check, re-checks store credentials, sends webhooks and sends [alert emails](alerts.md) |
| `db` container (Postgres 16) | Every customer, purchase, event and setting, in the `revenuedot-data` volume |

Run **one** `revenuedot` container per database for now. The background job has no lock across processes, so two containers could send a webhook twice.

## Settings
Edit `.env` next to `docker-compose.yml`. Store credentials (Apple keys, Google service accounts) are not environment variables: each app holds its own, set in the dashboard or with the REST API.

| Variable | Default | What it does |
|---|---|---|
| `POSTGRES_PASSWORD` | `revenuedot` in Compose | Password of the bundled Postgres. Set it before the first start: it is written into the volume then, and changing it later also needs `ALTER USER` in Postgres |
| `REVENUEDOT_PORT` | `8787` | Host port for everything |
| `REVENUEDOT_ALLOW_SIGNUP` | `false` | `true` lets anyone who reaches the dashboard create an account. Invited addresses can always create one |
| `REVENUEDOT_SMTP_URL`, `REVENUEDOT_MAIL_FROM`, `REVENUEDOT_MAIL_REPLY_TO`, `REVENUEDOT_PUBLIC_URL` | unset | Outgoing email. See [Email](#email) |
| `REVENUEDOT_SIGNING_KEY` | unset | Base64 Ed25519 seed. Turns on [response signing](trusted-entitlements.md). Not passed through by the default `docker-compose.yml`; see below |

Inside the container the server reads:

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | `pglite://./.data/dev` | `postgres://user:password@host:5432/db` for Postgres (Compose sets it). A `pglite://` path uses an embedded Postgres on disk, for development only |
| `PORT` | `8787` | Port the server listens on |
| `DASHBOARD_DIST` | the built dashboard in the image | Folder of the dashboard's built files. If it has no `index.html`, only the API is served |
| `REVENUEDOT_ALLOW_SIGNUP` | unset (owner only) | See above |
| `REVENUEDOT_SIGNING_KEY` | unset | See above |
| `REVENUEDOT_SMTP_URL` and the other mail variables | unset | See [Email](#email) |
| `REVENUEDOT_PAY_URL` | `<this server>/pay` | Where purchase links, funnels and redemption links live. A URL without a path, such as `https://pay.example.com`, serves them at that host's root. Redemption emails link here, else to `REVENUEDOT_PUBLIC_URL` + `/pay`, never to the host a request named. See [Custom domains](custom-domains.md) |
| `REVENUEDOT_CUSTOM_DOMAIN_TARGET` | the pay host | The host customers' custom domains must CNAME to |
| `REVENUEDOT_LICENSE_KEY` | unset | Turns on [RevenueDot Enterprise](enterprise.md) features the key covers. Not passed through by the default `docker-compose.yml`; add it to `docker-compose.override.yml` like the signing key |
| `REVENUEDOT_EE_DEV` | unset | `true` turns on every Enterprise feature for development and testing only ([development mode](enterprise.md#development-mode)) |
| `REVENUEDOT_INSIGHTS_DIGEST` | unset | `on` writes and emails the weekly [growth insights](growth-insights.md) digest with your model key. It needs [email](#email). The one-click opt-out link needs `REVENUEDOT_ENCRYPTION_KEY` or `REVENUEDOT_SIGNING_KEY` |

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

## Email
RevenueDot sends email for password resets, [team invites](team.md) and [alerts](alerts.md). A self-hosted server sends it through any SMTP provider (your own mail server, Amazon SES, Postmark, Resend, Mailgun, SendGrid and others). Add these to `.env`; the default `docker-compose.yml` passes them to the container:

```bash
REVENUEDOT_SMTP_URL=smtp://user:password@smtp.example.com:587
REVENUEDOT_MAIL_FROM=RevenueDot <no-reply@example.com>
REVENUEDOT_MAIL_REPLY_TO=team@example.com
REVENUEDOT_PUBLIC_URL=https://revenuedot.example.com
```

| Variable | What it does |
|---|---|
| `REVENUEDOT_SMTP_URL` | The SMTP server. `smtp://` connects on port 587 and upgrades to TLS with STARTTLS when the server offers it. `smtps://` uses TLS from the start, on port 465. Write special characters in the user name or password URL-encoded: `@` is `%40`, `:` is `%3A`, `/` is `%2F` |
| `REVENUEDOT_MAIL_FROM` | The sender, as `Name <address>` or a bare address. Use an address on a domain your SMTP provider may send for (SPF and DKIM set up), or the emails land in spam. Default: `RevenueDot <no-reply@localhost>`, which most providers reject |
| `REVENUEDOT_MAIL_REPLY_TO` | Optional. Where replies go |
| `REVENUEDOT_PUBLIC_URL` | The address people use to open the dashboard, for the links in emails. Unset: links use the address the request came in on (`X-Forwarded-Host` behind a proxy). Alert emails have no request, so they use the last address the dashboard was opened on since the server started, or `http://localhost:8787`. Set it for correct alert links |

**Without `REVENUEDOT_SMTP_URL`, nothing is sent.** Every email, links included, is printed to the server log instead, so you can still copy a reset or invite link:

```bash
docker compose logs revenuedot
```

When the server starts, its log says which it does: `Email: SMTP (REVENUEDOT_SMTP_URL).` or `Email: not configured; emails are printed to this log.` A failed send is logged with the SMTP error and never blocks sign-up, invites or the background job.

## Reset a password without email
When someone cannot get a reset email, reset the password straight in the database with the `revenuedot` CLI. It needs `DATABASE_URL`, the server's Postgres:

```bash
DATABASE_URL=postgres://revenuedot:secret@localhost:5432/revenuedot npx revenuedot admin reset-password dev@example.com
```

With Docker Compose, run it inside the server container, which has `DATABASE_URL` set already:

```bash
docker compose exec revenuedot pnpm --filter revenuedot cli admin reset-password dev@example.com
```

- **Without `--password`**, the CLI generates a 20-character password and prints it once. Copy it then; it is not stored anywhere readable.
- **`--password <new password>`** sets a password you choose (at least 8 characters).
- **Every session of the user is signed out**, and open reset links stop working.
- **`--database-url <url>`** can replace the `DATABASE_URL` variable.

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
- [Invite your team](team.md) and [Alert emails](alerts.md)
- [Going to production](going-to-production.md)
- [Quickstart](../getting-started/quickstart.md)
- [Self-host in 5 minutes](../../blog/self-host-revenuedot-in-5-minutes.md)
