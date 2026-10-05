---
title: What is the checklist for cutting over from RevenueCat to RevenueDot?
description: The migration steps in order, from creating a RevenueDot Cloud project (or starting your own server) to turning RevenueCat off, as a checklist. Each step says how to check it is done.
---

# What is the checklist for cutting over from RevenueCat to RevenueDot?

Work through these steps in order. RevenueCat keeps running until the last section, so any step can be paused or undone. `revenuedot import plan` prints the same steps with your app ids and URLs filled in.

## 1. Set up RevenueDot
- [ ] Create a free RevenueDot Cloud project at [app.revenuedot.app/signup](https://app.revenuedot.app/signup) and confirm your email. Its API is at `https://api.revenuedot.app`. To self-host instead, run a RevenueDot server that the internet can reach over HTTPS; see [Self-hosting](../guides/self-hosting.md) and [Going to production](../guides/going-to-production.md). Check: `GET https://api.revenuedot.app/v1/health` (or your server's `/v1/health`) returns `{"status":"ok"}`.
- [ ] Create a project, if you have none yet, and a secret key (`sk_...`) on the dashboard's **API keys** page.
- [ ] Create a RevenueCat v2 secret key with read access to project configuration and customer information.
- [ ] Self-hosting only, optional: set `REVENUEDOT_SIGNING_KEY` if you plan to build the RevenueDot SDKs with your own key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## 2. Import
- [ ] Dry run: `npx revenuedot import --from-revenuecat --rc-project proj... --to https://revenuedot.example.com --dry-run`. It asks for both secret keys. On RevenueDot Cloud, use `--to https://api.revenuedot.app`. See [The importer](importer.md#run-it).
- [ ] Import: the same command without `--dry-run`. Re-run it until the report says the pass is complete.
- [ ] Add each app's store credentials in the dashboard: the App Store in-app purchase key, and the Google Play service account with "View financial data". See [Connect the App Store](../guides/app-store.md) and [Connect Google Play](../guides/google-play.md).
- [ ] Click **Check credentials** on each app page, so Apple and Google confirm the credentials work.
- [ ] Run the import again, so Apple transaction ids are confirmed and Google purchase tokens are looked up.
- [ ] Optional: pass `--google-tokens tokens.csv` if you have a token export.
- [ ] Check `GET /v2/projects/{project_id}/import/status`: `needs_token_refresh` should be falling. The rest arrive with renewals and `syncPurchases()`.
- [ ] Run `npx revenuedot import verify ...`. Fix or explain every difference.

## 3. Run side by side
- [ ] For each App Store app, set RevenueDot's forwarding URL to RevenueCat's App Store notification URL. See [Dual run](dual-run.md#forward-app-store-notifications).
- [ ] In App Store Connect, set the production and sandbox Server Notification URLs (version 2) to RevenueDot's `notification_url`.
- [ ] For each Google Play app, add a second Pub/Sub push subscription to RevenueDot's URL, or forward like Apple. See [Dual run](dual-run.md#forward-google-play-notifications).
- [ ] Turn on **Track new purchases from server-to-server notifications** for each store app.
- [ ] Check the app page: notifications show a recent "last received" time, and the last forward shows status 200.
- [ ] Keep acting on RevenueCat's webhooks. If you add a RevenueDot webhook now, point it at an endpoint that only logs.

## 4. Ship the app update
- [ ] Set the proxy URL before `configure`, and turn signature checks off. Per SDK: [SDK changes](sdk-changes.md).
- [ ] Call `syncPurchases()` once on the first launch after the update.
- [ ] Test the build against RevenueDot with the [Test Store](../guides/test-store.md) and the stores' sandboxes. See [Sandbox testing](../guides/sandbox-testing.md).
- [ ] Release the update.
- [ ] Watch the SDK compatibility panel on the **Apps** page and the customer timeline for purchases from the new version.

## 5. Keep both in step
- [ ] Re-run the import daily while old app versions still call RevenueCat.
- [ ] Run `import verify` after each re-import.
- [ ] Optional: raise the minimum app version, so old versions stop calling RevenueCat sooner.

## 6. Cut over
- [ ] `import verify` shows no differences, and few active users run an old version.
- [ ] Create your webhooks in RevenueDot. Save each signing secret (`whsec_...`) and verify signatures. See [Webhooks](../guides/webhooks.md).
- [ ] Turn off the webhooks in RevenueCat, in the same hour.
- [ ] Remove each forwarding URL: send `"notification_forward_url": null`.
- [ ] Move dashboards, alerts and internal tools to RevenueDot's [REST API v2](../../api/rest-v2.md); it uses the same shapes.
- [ ] Turn RevenueCat off for this project.

## Related
- [Migrate from RevenueCat](README.md)
- [The importer](importer.md)
- [Dual run](dual-run.md)
- [What differs from RevenueCat](what-differs.md)
