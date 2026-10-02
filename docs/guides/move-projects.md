---
title: How do I move a project between self-hosted RevenueDot and RevenueDot Cloud, or export everything?
description: One command or the dashboard copies a project to another RevenueDot server with its ids, SDK keys, secret keys and webhook signing secrets, verifies every table, then forwards the old server's traffic. A full export gives you every table as JSON Lines with a manifest and checksums.
---

# How do I move a project between self-hosted RevenueDot and RevenueDot Cloud, or export everything?

Run `npx revenuedot move --from <old server> --to <new server>`, or use **Project settings → Export and move** in the dashboard. The project arrives on the new server with the same project, app and customer ids, the same public SDK keys (`appl_`, `goog_`, `test_` …), the same secret API keys (`sk_`) and the same webhook signing secrets. Your apps and your backend keep working without a change. After the switch the old server forwards every SDK call, REST call and store notification to the new one until you point your app and the stores at the new address.

It works in both directions: from your own server to RevenueDot Cloud (`https://api.revenuedot.app`), from Cloud to your own server, or between two self-hosted servers.

## What moves

Everything the project owns, 67 tables in all: the project and its settings, apps and their store credentials, the catalog (products, entitlements, offerings, packages), customers with their aliases and attributes, subscriptions, one-time purchases, transactions, events, webhooks and their delivery log, integrations, scheduled data exports, paywalls with their versions and images, audiences, targeting rules, experiments, in-app currencies with balances and the ledger, Refund Control, retention offers, win-back campaigns, support tickets, web billing (web products, purchase links, funnels, discounts, domains), Auth providers, blocked customers, Verified Metrics, Stripe Connect connections, payment recovery cases and emails, and the audit log.

What does not move:

- **Your teammates' accounts and passwords.** The archive lists each collaborator's email and role, and the move lists them for you to invite on the new server (**Project settings → Collaborators**). Nobody is added without an invite, even with an account there. The person who receives the project owns it there.
- **A custom domain's verification.** DNS proves a domain to one server, so on the new server the domain waits for **Verify**: open **Project settings → Domains** there for its new TXT value, point the CNAME at the new server, then verify. The finish step lists the domain.
- RevenueDot AI conversations (they belong to one person), pending invites, sessions and subscriber access tokens (they last an hour).

## Move with the command line

1. **On the new server, create an import token.** Sign in, open the project switcher and choose **Receive a project** (or go to `/projects/receive`), then **Create import token**. Copy the token (`rdi_…`); it is shown once and works for 24 hours. RevenueDot Cloud asks you to confirm your email address first.
2. **On the old server, create a secret API key** for the project with the **project configuration: read and write** permission (API keys page).
3. **Check what will move.** Nothing is written on either server:

   ```bash
   npx revenuedot move --from https://revenuedot.example.com --to https://api.revenuedot.app --dry-run
   ```

   The CLI asks for the secret key and the import token and hides what you type. In CI, set `REVENUEDOT_FROM_KEY` and `REVENUEDOT_TO_TOKEN` instead. The dry run prints, per table, the rows in the archive, the rows the new server has now and the difference.
4. **Copy and verify.** The old server keeps serving your apps:

   ```bash
   npx revenuedot move --from https://revenuedot.example.com --to https://api.revenuedot.app
   ```

   The CLI exports the project, copies each file, then has the new server recompute the row count and a checksum of every table and compares them with the archive. It ends with `All 67 tables match`. If the copy stops (network, laptop sleep), run the same command again: a state file in the current folder (`revenuedot-move-<old host>-to-<new host>.json`, or `--state <file>`) remembers which files are done.

   Your apps keep using the old server during the copy, and it is read table by table. A row that belongs to something created after its table was read, such as the alias of a user who installed the app a minute ago, is left out and counted, and the verification says how many. `--finish` copies everything again, so nothing is lost.
5. **Switch.** When you are ready:

   ```bash
   npx revenuedot move --from https://revenuedot.example.com --to https://api.revenuedot.app --finish
   ```

   `--finish` pauses writes on the old server, waits 10 seconds so every server process sees the pause, copies again so nothing written in the meantime is lost, verifies, puts the project live on the new server and makes the old one forward. If anything fails before the project is live on the new server (verification finds a difference, the network drops), the pause is lifted and the old server keeps serving; run the same command again to retry.

Exit codes: `0` done, `1` failed or verification found differences, `2` a usage error, `130` cancelled.

## Move from the dashboard

On the old server open **Project settings → Export and move → Move this project**. Choose **RevenueDot Cloud** or type another server's URL, paste the import token from the new server's **Receive a project** page, then:

1. **Check**: the same dry run, as a table of rows per table.
2. **Copy data**: the old server runs the copy and the verification itself. You can close the page; the progress is kept.
3. **Finish move**: pauses, copies the last changes, verifies, goes live there and forwards from here. **Cancel move** stops at any point before that.

Only project Admins can export or move a project.

## During and after the switch

| State | Where | What happens |
|---|---|---|
| Paused | Old server, for the last copy | Reads work. Purchases (`POST /v1/receipts` and the other SDK writes) and store notifications answer `503` with `Retry-After: 60`: the SDK keeps the transaction and retries, Apple and Google retry notifications. API v2 writes answer `423`. Webhooks waiting to be sent move with the data and are sent once, by the new server |
| Forwarded | Old server, after the switch | Every `/v1`, `/rcbilling` and secret-key `/v2` request for the project, and every store notification, is passed to the new server with the same method, path, headers and body. The answer, response signature included, comes back unchanged with an `x-revenuedot-moved-to` header. The dashboard shows "This project moved to …" |
| Incoming | New server, while copying | The project is not live. Reads work; SDK writes and store notifications answer `503` and API v2 writes answer `423`. Nothing runs on a schedule for it. An Admin can still delete it, for example after giving up on a move |

Then, at your own pace:

1. **Point your app at the new server** in your next release: set the SDK's proxy URL (`Purchases.proxyURL` on iOS, `setProxyURL` elsewhere) to the new server. Old app versions keep working through the forward.
2. **Change the store notification URLs.** Only the host changes; the path keeps the app id: `https://<new server>/v1/notifications/{apple|google|amazon|stripe}/{app_id}`. The finish step prints the exact URL for each app and where to change it:
   - App Store Connect → your app → App Information → App Store Server Notifications (production and sandbox URLs).
   - Play Console → Monetize → Monetization setup → Real-time developer notifications: the endpoint of the Pub/Sub push subscription.
   - Amazon Developer Console → Real-time Notifications: the SNS subscription.
   - Stripe Dashboard → Developers → Webhooks.
3. **Keep the old server running** until no traffic reaches it. Its request log shows the forwarded calls.

To undo a finished move, call `POST /v2/projects/{project_id}/move/cancel` on the old server: it serves the project again, and the copy on the new server stays.

## Export everything

**Project settings → Export and move → Export project** makes one archive of everything listed above. It is built in the background in short slices and kept for 7 days; **Download** gives a link that works for an hour. From the command line:

```bash
npx revenuedot export --from https://api.revenuedot.app --out my-project.tar
```

The archive is a `.tar` with:

```
manifest.json                      format, version, schema, the project, and per table: columns, rows and checksum
members.json                       email and role of each collaborator (no passwords)
tables/<table>/0001.jsonl.gz       one row per line, as stored (UTC timestamps)
secrets/<table>/0001.json.enc      only with a passphrase
```

Each table's `checksum` is the hex sum, modulo 2^256, of the SHA-256 of every row line, so it does not depend on row order or how rows are split into files. Each file entry also has the SHA-256 of its gzip bytes.

**Secrets** (store credentials, Amazon and Stripe keys, integration secrets, webhook signing secrets and authorization headers) are left out unless you give a passphrase of 12 or more characters (`--include-secrets`, or the passphrase field in the dashboard). Then they are encrypted with AES-256-GCM and a key derived from the passphrase with PBKDF2-SHA-256. Without them, a server that loads the archive gives each webhook a new signing secret and lists the apps whose store credentials you must enter again. `npx revenuedot move` always encrypts secrets with a random passphrase it never shows, so a move keeps them.

Load an archive into a server with `npx revenuedot move --from-archive my-project.tar --to <server>`.

### Where archives are stored

| Server | Storage |
|---|---|
| RevenueDot Cloud | RevenueDot Cloud's own storage, deleted after 7 days |
| Self-hosted | A folder on disk, `REVENUEDOT_ARCHIVE_DIR` (default `.data/archives`, a volume in `docker-compose.yml`). An S3-compatible bucket (AWS S3, Cloudflare R2, MinIO) when `REVENUEDOT_ARCHIVE_S3_BUCKET` is set, with `REVENUEDOT_ARCHIVE_S3_ENDPOINT`, `REVENUEDOT_ARCHIVE_S3_REGION`, `REVENUEDOT_ARCHIVE_S3_ACCESS_KEY_ID` and `REVENUEDOT_ARCHIVE_S3_SECRET_ACCESS_KEY`. `REVENUEDOT_ARCHIVE_DIR=db` keeps them in Postgres |

## API

Every step has an endpoint, so you can script a move. See the [API reference](../../api/extensions.md#data-moves): `POST /v2/projects/{project_id}/exports`, `POST /v2/imports/tokens`, `POST /v2/imports`, `PUT /v2/imports/{import_id}/files/{name}`, `POST /v2/imports/{import_id}/verify`, `POST /v2/imports/{import_id}/finish`, and the move state endpoints `pause`, `forward` and `cancel`.

## Troubleshooting

- **"That is not an import token"**: copy the token from the new server's **Receive a project** page; it starts with `rdi_` and lasts 24 hours.
- **"The archive collides with another project on this server"**: the new server already has a project with the same id or public key, usually a copy left from an earlier move. Run again with `--replace` to replace it.
- **"A project with id … already exists on this server"** after a copy you gave up on: the unfinished copy is still on the new server. Delete it there (**Project settings → General → Delete project**), create a new import token and move again.
- **The archive was written by a newer server**: upgrade the server you load it into. An archive loads into a server with the same or a newer schema.

Moving from RevenueCat instead? See [Migrate from RevenueCat](../migrate/README.md).
