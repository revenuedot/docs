---
title: Self-host RevenueDot in 5 minutes
description: Start RevenueDot with Docker Compose, seed a Test Store project, make a first purchase with curl, receive the webhook on your laptop, and turn on response signing.
date: 2026-09-30
author: RevenueDot team
---

# Self-host RevenueDot in 5 minutes

You can run RevenueDot on your laptop, make a purchase and receive the webhook in about five minutes, most of which is the first image build. You need Docker with Compose v2, `curl`, `jq` and Node.js 18 or newer for the webhook receiver. You do not need an App Store or Google Play account: the built-in Test Store stands in for them.

Everything below uses the public [examples repository](https://github.com/revenuedot/examples). For production, follow the [going-to-production checklist](../docs/guides/going-to-production.md) afterwards.

## 1. Start the server and Postgres
```bash
git clone https://github.com/revenuedot/examples.git
cd examples/selfhost/docker-compose
cp .env.example .env          # set POSTGRES_PASSWORD before the first start
docker compose up -d          # pulls ghcr.io/revenuedot/revenuedot the first time
curl http://localhost:8787/v1/health
```
```json
{"status":"ok"}
```

The Compose file runs two containers. `revenuedot` is one Node.js process that serves the SDK API under `/v1`, the REST API under `/v2`, store notifications, and the dashboard at `http://localhost:8787/login`. `db` is Postgres 16 with a named volume, so your data survives restarts. Compose pulls the published image, [`ghcr.io/revenuedot/revenuedot`](https://github.com/revenuedot/revenuedot/pkgs/container/revenuedot), built for amd64 and arm64 on every change; `docker compose build` builds the same image from [the source on GitHub](https://github.com/revenuedot/revenuedot).

Two details save time later:
- **Migrations run on start.** Every time the server starts, it applies any new database migrations before it listens. An upgrade is a rebuild and a restart.
- **Port 8787 taken?** Set `REVENUEDOT_PORT=8797` in `.env`, and use that port below.

## 2. Start a webhook receiver
Your backend learns about purchases through webhooks. The examples include small receivers in many languages. Start the Express one in a second terminal:

```bash
cd examples/backend/node-express-webhook
npm install
cp .env.example .env
npm start                     # http://localhost:3000/webhooks/revenuedot
```

## 3. Seed a project
The [seed script](https://github.com/revenuedot/examples/blob/main/selfhost/docker-compose/seed.sh) uses only the public API. It signs up a dashboard account, which creates the first project, then creates a Test Store app, three products, a `pro` entitlement, a `default` offering and a secret key. With `WEBHOOK_URL` set, it also creates a webhook:

```bash
cd examples/selfhost/docker-compose
WEBHOOK_URL=http://host.docker.internal:3000/webhooks/revenuedot ./seed.sh
```
```text
RevenueDot is seeded.
  Dashboard        http://localhost:8787  (sign in as dev@example.com)
  Project id       proj18pzzkao
  Test Store key   test_...      <- the SDK's API key; the SDK's proxy URL is http://localhost:8787
  Secret key       sk_...        <- server-side only (REST API, backend checks)
  Webhook secret   whsec_...     <- REVENUEDOT_WEBHOOK_SECRET in your backend
```

`host.docker.internal` is how the container reaches your computer on Mac and Windows. On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `revenuedot` service.

Put the webhook secret into the receiver's `.env` as `REVENUEDOT_WEBHOOK_SECRET` and restart it with `npm start`. Then save the keys for the next steps:

```bash
export TEST_KEY=test_...  SECRET_KEY=sk_...  PROJECT_ID=proj...
```

The script is safe to run twice. Set `RD_EMAIL` and `RD_PASSWORD` to choose the dashboard account it creates.

## 4. Make a first purchase with curl
Ask for offerings the way the SDK does:

```bash
curl -s -H "Authorization: Bearer $TEST_KEY" http://localhost:8787/v1/subscribers/user_1/offerings
```

Then post a purchase. In an app, the SDK makes this call after the user confirms the Test Store dialog. The Test Store accepts any token of the form `test_<purchase time in ms>_<id>`:

```bash
curl -s http://localhost:8787/v1/receipts \
  -H "Authorization: Bearer $TEST_KEY" -H "Content-Type: application/json" \
  -d "{\"app_user_id\":\"user_1\",\"fetch_token\":\"test_$(date +%s)000_quickstart\",\"product_id\":\"pro_monthly\",\"price\":9.99,\"currency\":\"USD\"}"
```

The answer is the customer info the SDK decodes, with `pro` active for a month:

```json
{"request_date":"2026-09-30T20:41:54Z","subscriber":{"entitlements":{"pro":{"expires_date":"2026-10-30T20:41:54Z","grace_period_expires_date":null,"product_identifier":"pro_monthly","purchase_date":"2026-09-30T20:41:54Z"}},"original_app_user_id":"user_1","subscriptions":{"pro_monthly":{"store":"test_store","is_sandbox":true,"period_type":"normal","price":{"amount":9.99,"currency":"USD"},"...":"..."}}},"purchased_products":{"pro_monthly":{"should_consume":false}}}
```

A bad token shows the error format. RevenueDot answers 4xx only when a purchase can never be valid, because a 4xx makes the SDK finish the transaction for good:

```json
{"code":7103,"message":"The receipt is not a valid Test Store purchase token."}
```

## 5. Watch the webhook arrive
Within a second, the receiver gets a `POST` like this one, captured from a local run:

```text
content-type: application/json
user-agent: RevenueDot-Webhooks/1.0
x-revenuecat-webhook-signature: t=1790800914,v1=5e6c0809f9b7b24f7ae36f4744b3b04868222411db4b24c60e6e390c5e9c495f

{"event":{"id":"66339910-3BFF-49F4-B873-D1283D673DE2","type":"INITIAL_PURCHASE","store":"TEST_STORE","environment":"SANDBOX","app_user_id":"user_1","product_id":"pro_monthly","price":9.99,"currency":"USD","entitlement_ids":["pro"],"period_type":"NORMAL","expiration_at_ms":1793392914000,"...":"..."},"api_version":"1.0"}
```

The receiver checks `v1` against an HMAC-SHA256 of `"<t>.<raw body>"` with the webhook secret, ignores repeats of the same `event.id`, and answers 200. Only 200 counts as delivered. Anything else is retried after 5, 10, 20, 40 and 80 minutes.

To see the rest of a subscription's life without waiting a month, simulate it:

```bash
curl -s -X POST http://localhost:8787/v2/projects/$PROJECT_ID/test_purchases \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"app_user_id":"user_2","product_id":"pro_monthly","scenario":"renewal"}'
```

The scenarios are `purchase`, `trial`, `trial_conversion`, `renewal`, `cancel`, `billing_issue`, `refund` and `expire`. Each one sends the same webhooks a real store would cause. A `refund`, for example, sends `INITIAL_PURCHASE` and then `CANCELLATION` with `cancel_reason: CUSTOMER_SUPPORT` and a negative price.

## 6. Turn on response signing
Recent RevenueCat SDKs can check that responses are signed. RevenueDot signs every successful SDK response when `REVENUEDOT_SIGNING_KEY` holds a base64 Ed25519 seed of 32 random bytes. You can make one with `openssl`, or with `pnpm tsx scripts/signing-keygen.ts` in a checkout of the server repository, which also prints the public key:

```bash
echo "REVENUEDOT_SIGNING_KEY=$(openssl rand -base64 32)" >> .env
```

The example's `docker-compose.yml` passes only `DATABASE_URL` and `PORT` to the container, so add the key under the `revenuedot` service's `environment`:

```yaml
      REVENUEDOT_SIGNING_KEY: ${REVENUEDOT_SIGNING_KEY}
```

Then restart and fetch the public key:

```bash
docker compose up -d
curl -s http://localhost:8787/.well-known/revenuedot-signing-key
```
```json
{"algorithm":"Ed25519","public_key":"ZzwPxGlon0E8ErpDh9QAH0Jh6+E6D6qufvTSetXZY9Y=","encoding":"base64","header":"X-Signature","docs":"https://revenuedot.app/docs"}
```

Responses now carry an `X-Signature` header. The stock RevenueCat SDK still cannot use it, because it trusts only RevenueCat's key, so keep its verification turned off. To get `VERIFIED` in your app, build the RevenueDot SDK forks with your public key. See [Trusted Entitlements](../docs/guides/trusted-entitlements.md).

## 7. Point an app at it
Use the Test Store key as the SDK's API key and your server as the proxy URL:

```ts
// Point the SDK at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL("http://localhost:8787");
Purchases.configure({ apiKey: "test_..." });
```

The quickest end-to-end check is the [purchases-js example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite), which buys through the Test Store in a browser. The unmodified iOS and Android SDKs also buy Test Store products on a simulator or emulator.

## Before you go to production
Your laptop setup is not a production setup. Before real customers:
1. **Serve HTTPS** behind a reverse proxy. Apple and Google send notifications only to public HTTPS URLs.
2. **Set a strong `POSTGRES_PASSWORD`** before the first start. It is stored in the volume, and changing it later needs `ALTER USER` too.
3. **Back up Postgres** on a schedule, and test a restore: `docker compose exec -T db pg_dump -U revenuedot -Fc revenuedot > backup.dump`.
4. **Add store credentials per app**: the App Store in-app purchase key and the Google service account. They live on each app, not in environment variables.
5. **Set the notification URLs** in App Store Connect and on the Pub/Sub push subscription, then check `notification_status` in setup health.
6. **Keep the signing seed secret.** Keep it out of every repository and every image.
7. **Never set `allow_unsigned_receipts`** outside development.
8. **Run one server container per database.** Expirations and webhooks run in a background job inside the container.
9. **Remember the status.** Store purchases are tested against mocked Apple and Google APIs only, and no real sandbox purchase has run end to end yet.

The full list is in [Going to production](../docs/guides/going-to-production.md), with [Backups](../docs/guides/backups.md) and [Upgrades](../docs/guides/upgrades.md).

**About RevenueDot.** RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions on the App Store, Google Play and the web. Start free on [RevenueDot Cloud](https://app.revenuedot.app/signup), free up to $10,000 in monthly tracked revenue, or self-host it with Docker and Postgres. New apps install the [RevenueDot SDK](../docs/sdks/README.md) and pass their key. Apps that ship the RevenueCat SDK point its proxy URL at RevenueDot and keep their code, offerings and customers. Read the [quickstart](../docs/getting-started/quickstart.md) or the code on [GitHub](https://github.com/revenuedot/revenuedot).
