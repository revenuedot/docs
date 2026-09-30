---
title: What should I check before running RevenueDot in production?
description: A checklist for a self-hosted RevenueDot with real customers - HTTPS, a real Postgres with backups, store credentials and notifications verified, webhooks tested, secrets kept out of apps, and monitoring.
---

# What should I check before running RevenueDot in production?

Work through this list before real customers depend on your server. Run a real sandbox purchase on each store first, and consider a [dual run](../migrate/dual-run.md) next to your current system.

## Server
- [ ] HTTPS in front of the server, with a certificate that renews itself. See [Self-hosting](self-hosting.md#put-https-in-front).
- [ ] A real Postgres (`DATABASE_URL=postgres://...`), not the embedded PGlite.
- [ ] `POSTGRES_PASSWORD` changed from the default before the first start.
- [ ] Daily backups copied off the server, and one test restore done. See [Backups](backups.md).
- [ ] One `revenuedot` container per database.
- [ ] Sign-up closed (`REVENUEDOT_ALLOW_SIGNUP` unset); add teammates with [invites](team.md) instead.
- [ ] `REVENUEDOT_SMTP_URL`, `REVENUEDOT_MAIL_FROM` and `REVENUEDOT_PUBLIC_URL` set, and one password reset email received, so resets, invites and [alert emails](alerts.md) reach people. See [Email](self-hosting.md#email).
- [ ] Uptime monitoring on `GET /v1/health`, and alerts on the container's restarts.
- [ ] `REVENUEDOT_SIGNING_KEY` set and stored in a password manager, if you ship SDK builds that verify responses. See [Trusted Entitlements](trusted-entitlements.md).

## Stores
- [ ] Each store app has its credentials, and **Check credentials** says valid: the App Store In-App Purchase key, the Google Play service account.
- [ ] Store notifications arrive: the app's status is **Ready** in the dashboard, or `notification_status: "ready"` in `GET /v2/projects/{project_id}/setup_health`.
- [ ] App Store Connect has RevenueDot's URL as both the Production and Sandbox Server URL, Version 2.
- [ ] Google Play's Pub/Sub topic has a push subscription to RevenueDot, and Play Console's test notification arrived.
- [ ] Every product's `store_identifier` matches the store exactly (Google Play subscriptions as `subscriptionId:basePlanId`), and each product is attached to the right entitlement and package.

## Apps
- [ ] The SDK's proxy URL is your HTTPS URL, set before `configure`.
- [ ] Entitlement verification is `DISABLED` with the stock SDK, or the app uses a fork built with your key.
- [ ] Release builds use the store keys (`appl_`, `goog_`), never a `test_` key.
- [ ] No secret key (`sk_...`) anywhere in an app.

## Your backend
- [ ] Webhooks verify the `X-RevenueCat-Webhook-Signature` HMAC and deduplicate on `event.id`. See [Webhooks](webhooks.md).
- [ ] A test event reached your backend and was answered 200.
- [ ] Secret keys used by your backend have only the permissions they need. See [Authentication](../../api/authentication.md).
- [ ] Failed deliveries are watched: `GET /v2/projects/{project_id}/setup_health` lists failing webhooks.

## Related
- [Cutover checklist for a migration](../migrate/cutover-checklist.md)
- [Known issues](../help/known-issues.md)
- [Troubleshooting](../help/troubleshooting.md)
