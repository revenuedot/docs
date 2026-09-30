---
title: How do I fix common RevenueDot problems?
description: A symptom-to-fix list for the SDK, receipts, store notifications, webhooks, the dashboard and self-hosting, with the cause of each.
---

# How do I fix common RevenueDot problems?

Find your symptom below; each row gives the cause and the fix. Most problems come from one of three places: the SDK is not pointed at your server, a key or ID does not match the app, or the server cannot reach, or be reached by, the store or your backend. Always read the error's `message` and the server log first. RevenueDot writes the cause into both.

## SDK
| Symptom | Cause | Fix |
|---|---|---|
| Requests still go to RevenueCat | The proxy URL is set after `configure`, or not at all | Set the proxy URL before `configure`. See the [SDK guides](../sdks/README.md) |
| Every call fails with HTTP 401, code 7225 | The public key is wrong, belongs to another server, or has a typo | Copy the app's key from the app page, or `GET /v2/projects/{project_id}/apps/{app_id}/public_api_keys` |
| Logs say entitlement verification FAILED | The stock SDK checks RevenueCat's signing key | Turn verification off. See [signature verification](signature-verification-failed.md) |
| Offerings are empty | No offering is marked current, or its packages point at products of another app | Mark an offering current and add this app's products to its packages. See [Offerings and packages](../concepts/offerings-and-packages.md) |
| iOS says "No base price found for product" with a `test_` key | The server was built before the 2026-09-30 Test Store fix | Rebuild the server from the current source. See [Known issues](known-issues.md) |
| Web purchases with an `rcb_` key fail | Web Billing is not supported yet | Use a Test Store (`test_`) key. See [Known issues](known-issues.md) |
| An Android emulator cannot reach `http://localhost:8787` | `localhost` is the emulator itself | Use `http://10.0.2.2:8787` |
| Android needs HTTPS | Android blocks cleartext HTTP by default | Use HTTPS, or allow cleartext for your dev host in the network security config |

## Receipts and access
| Symptom | Cause | Fix |
|---|---|---|
| Purchase succeeds in the store, but the entitlement is not active | Product not attached, wrong app user ID, or the post failed | See [Why is my entitlement not active?](entitlement-not-active.md) |
| `/v1/receipts` answers 400, code 7103 | The receipt cannot be verified, or is for another bundle ID or package name | See [4xx or 5xx](receipt-errors-4xx-vs-5xx.md) |
| `/v1/receipts` answers 500, code 7234 | A StoreKit 1 receipt, and no App Store in-app purchase key | Add the key. See [Connect the App Store](../guides/app-store.md) |
| `/v1/receipts` answers 503, code 7101 | Apple or Google failed, or the Google service account is wrong | Run **Verify credentials** on the app page. The SDK retries on its own |
| `/v1/receipts` answers 400, code 7662 | The app is an Amazon, Stripe, Web Billing, Paddle or Roku app | Not supported yet. Use App Store, Mac App Store, Google Play or Test Store |
| Restore fails with 7102 | Another user owns the purchase and the transfer behaviour forbids moving it | See [How do I restore purchases?](restore-purchases.md) |
| Xcode StoreKit test purchases fail with 7103 | Xcode signs them with its own certificate | Add the `xcode_certificate` credential. See [Test purchases](test-sandbox-purchases.md) |

## Store notifications
| Symptom | Cause | Fix |
|---|---|---|
| `notification_status` stays `waiting` | The store has the wrong URL, or cannot reach your server | Copy `notification_url` from setup health into App Store Connect or the Pub/Sub push subscription |
| Status stays `received` | Notifications arrive only for purchases RevenueDot does not know | Normal before the first purchase. Send a test notification, or set `track_new_purchases` |
| Status is `failing` with a bundle ID or package name message | The app's `bundle_id` or `package_name` does not match the store | Fix it on the app |
| Google pushes get 401, code 7224 | `pubsub_audience` is set, and the push has no valid token | Turn on push authentication with the same audience, or remove the credential |

Details: [Why are store notifications not arriving?](store-notifications-not-arriving.md)

## Webhooks
| Symptom | Cause | Fix |
|---|---|---|
| No deliveries in the log | A filter excludes the event, or the webhook was created after it | Check `environment`, `event_types` and `app_id` |
| Deliveries `pending` or `failed` | Your backend answered something other than 200, or took more than 60 seconds | Answer 200 fast. Retries follow after 5, 10, 20, 40 and 80 minutes |
| Signature check fails | Verifying parsed JSON instead of the raw body, or using another webhook's secret | Verify the raw body with this webhook's `whsec_` secret. See [Webhooks](../guides/webhooks.md) |
| A self-hosted server cannot reach `localhost:3000` | `localhost` is the container itself | Use `http://host.docker.internal:3000` |

Details: [Why are webhooks not arriving?](webhooks-not-arriving.md)

## Dashboard
| Symptom | Cause | Fix |
|---|---|---|
| `/` shows a small JSON document | The dashboard lives at `/login` | Open `http://localhost:8787/login` |
| You cannot sign in after a fresh start | The account is created by signing up or by the seed script | Sign up at `/signup`, or sign in as the email the seed script printed |
| You forgot your password, and no reset email arrives | The server has no `REVENUEDOT_SMTP_URL`, so emails go to the log | Copy the link from `docker compose logs revenuedot`, or run `revenuedot admin reset-password <email>`. See [I forgot my password](forgot-password.md) |

## Self-hosting
| Symptom | Cause | Fix |
|---|---|---|
| `docker compose up` fails with "port is already allocated" | Something else uses port 8787 | Set `REVENUEDOT_PORT=8797` in `.env`, then use that port in URLs and in `RD_URL` for the seed script |
| The server exits at start with a database error | `DATABASE_URL` is wrong, or Postgres is not ready | Compose sets `DATABASE_URL` for you. Outside Compose, set it to a `postgres://` URL. Without it, the server uses an embedded database in `./.data/dev`, which is for development only |
| The server exits at start after an upgrade | A database migration failed. Migrations run every time the server starts, before it listens | Read the log line, fix the cause, restart. Restore your backup if you need to roll back. See [Upgrades](../guides/upgrades.md) |
| Postgres rejects the password after you changed `POSTGRES_PASSWORD` | The password is stored in the data volume at first start | Change it inside Postgres too with `ALTER USER`, or start over with `docker compose down -v`, which deletes all data |
| `REVENUEDOT_SIGNING_KEY` seems ignored | The shipped `docker-compose.yml` passes only `DATABASE_URL` and `PORT` to the container | Add `REVENUEDOT_SIGNING_KEY: ${REVENUEDOT_SIGNING_KEY}` under the `revenuedot` service's `environment` |
| The server exits with "REVENUEDOT_SIGNING_KEY must be the base64 of a 32-byte Ed25519 private key seed" | The value is not a valid seed | Generate one with `pnpm tsx scripts/signing-keygen.ts` |
| `/.well-known/revenuedot-signing-key` answers 404 | No signing key is set | Set `REVENUEDOT_SIGNING_KEY`. See [Trusted Entitlements](../guides/trusted-entitlements.md) |
| Expirations and webhooks happen late | They run in a background job every 30 seconds | Expected. Run one server container per database for now |

## Related
- [Self-hosting](../guides/self-hosting.md)
- [Going to production](../guides/going-to-production.md)
- [Known issues](known-issues.md)
