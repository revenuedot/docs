---
title: Which project settings does RevenueDot have?
description: Rename the project, limit who can test with sandbox purchases, hand ownership to another admin, keep brand colours and fonts for paywalls, block abusive app user IDs, and publish a public page of verified revenue numbers.
---

# Which project settings does RevenueDot have?

Open **Project settings** in the sidebar. The tabs are **General**, **AI features**, **Benchmarks** (RevenueDot Cloud; see [Benchmarks](benchmarks.md)), **Brand**, **Audit logs**, **Blocked customers**, **Collaborators**, **Verified Metrics** and **Domains**. Everything on them also has an API v2 endpoint, so you can script it with a secret key. This guide covers General, Brand, Blocked customers and Verified Metrics; see [Invite your team](team.md) for Collaborators and [Custom domains](custom-domains.md) for Domains.

## General

- **Project name** and **project ID**. The ID (`proj…`) goes in every API v2 path: `/v2/projects/{project_id}/…`.
- **Handling multiple app user IDs.** What happens when a purchase already owned by one app user ID is restored by another. See [who owns a restored purchase](../concepts/customers-and-app-user-ids.md#who-owns-a-restored-purchase).
- **Sandbox testing access**, **Transfer project ownership** and **Delete project**, below.

### Sandbox testing access

"Allow testing entitlements and in-app currency for" decides who gets anything from **sandbox purchases**: App Store sandbox, Google Play test purchases, Xcode StoreKit testing and every [Test Store](test-store.md) purchase.

| Setting | What happens |
|---|---|
| **Anybody** (default) | Every sandbox purchase unlocks entitlements and credits in-app currency. |
| **Allowlisted app user IDs** | Only customers with one of the listed app user IDs (up to 500, any alias counts) get entitlements and currency from sandbox purchases. |
| **Nobody** | Sandbox purchases never unlock entitlements or credit currency. |

The server enforces it. A sandbox purchase by someone outside the setting is still recorded and still sent to your webhooks, so you can see it, but customer info shows no entitlement for it, API v2 `active_entitlements` leaves it out (its subscription shows `gives_access: false`), and product grants credit no currency. Production purchases are never affected.

Use **Allowlisted app user IDs** when people outside your team can reach sandbox purchases, for example through a TestFlight build that anyone with the link can install.

```bash
curl -X POST https://api.revenuedot.app/v2/projects/$PROJECT_ID \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"sandbox_testing_access":"allowlist","sandbox_testers":["qa_tester_1","qa_tester_2"]}'
```

### Transfer project ownership

Every project has one **owner**: the person who created it, or the person it was handed to. Only the owner can transfer the project, and only to a collaborator who already has the **Admin** role. Click **Transfer ownership**, pick the admin and type the project name. You stay an admin. You both get an email, and the audit log records it. The owner always stays an Admin member: nobody can remove or demote them, and they transfer the project before they leave. If the owner's account is deleted, any admin can transfer the project.

### Delete project

Admins can delete a project from the dashboard after typing its name. Its apps, SDK keys, catalog, customers, purchase history, webhooks and API keys are deleted at once, and apps using its keys stop working. This cannot be undone.

## Brand

Keep your app's colours, gradients and fonts in one place for paywalls.

- **Colour presets:** a name, a light colour and an optional dark-mode colour (`#RRGGBB` or `#RRGGBBAA`), up to 50.
- **Gradient presets:** linear (with an angle) or radial, 2 to 10 stops, up to 50.
- **Fonts:** TrueType or OpenType files up to 5 MB. Each weight and style is its own file.

The [paywall editor](paywalls.md) shows colour presets under every colour field and gradient presets in background pickers; one click applies the colour. Its font picker lists your uploaded fonts. Apps also receive every preset as a named colour in the offerings response (`ui_config.app.colors`), keyed by the preset's key, so a paywall written in JSON can use `{"type": "alias", "value": "brand_gold"}`. The editor copies a preset's value into the paywall, so deleting a preset later does not change paywalls built in the editor.

API: `GET` and `POST /v2/projects/{project_id}/brand`, and `/v2/projects/{project_id}/fonts`.

## Blocked customers

Block an app user ID when someone abuses refunds, shares one account widely or uses forged receipts. A blocked customer **loses access to paid features on every platform at once**:

- Customer info has no entitlements, in the SDK, through a subscriber access token and in REST API v1.
- API v2 `active_entitlements` is empty, their subscriptions show `gives_access: false`, and targeting and audiences see no entitlements.
- New purchases credit no in-app currency.
- Their purchases cannot be restored onto another app user ID: a restore on a fresh ID answers `7102` (receipt already in use) whatever the project's transfer behaviour, so a new account does not bring the access back.

What stays the same: their purchases are still recorded, revenue still counts, and **webhooks are still sent** with their usual `entitlement_ids`. If your backend grants access from webhooks, check the block list there:

```bash
curl https://api.revenuedot.app/v2/projects/$PROJECT_ID/blocked_customers/$APP_USER_ID \
  -H "Authorization: Bearer $SECRET_KEY"   # 200 when blocked, 404 when not
```

A customer is blocked when any of its app user IDs is blocked, and you can block an ID before it is ever seen. **Unblock** gives access back immediately. Each block and unblock is in the audit log.

## Verified Metrics

Publish a public page with your production numbers, computed by RevenueDot, for investors, buyers or a public "open startup" post. The page lives on the API host: `https://api.revenuedot.app/verified/<slug>` on RevenueDot Cloud, `https://<your server>/verified/<slug>` when you host it yourself.

1. Open **Project settings → Verified Metrics**.
2. Pick a **share URL** slug (3 to 40 characters: a-z, 0-9 and dashes; the dashboard checks it is free) and a **display name**.
3. Order the six metrics (MRR, Revenue, Active subscriptions, Active trials, New customers, Active customers) and hide the ones you do not want to show.
4. Optionally show an uploaded image as the project icon, and links to your App Store and Google Play pages.
5. Click **Publish**. **Unpublish** takes the page down at once; publishing again keeps the same URL.

What the page shows, and does not:

- **Totals only:** each visible metric's current value and a 28-day sparkline, from production purchases. No customers, app user IDs, sandbox purchases or project ID.
- **Fresh within 15 minutes.** The page is cached (5 minutes in browsers, 15 at the edge). Saving or unpublishing clears the cache on RevenueDot Cloud.
- **Link previews:** `/verified/<slug>/og.png` is a 1200×630 image with the name and up to three metrics. `/verified/<slug>/metrics.json` has the same numbers as JSON.

New customers and active customers count everyone your apps have seen, because customers have no environment; the money and subscription numbers are production only. Definitions match the [Overview cards and charts](charts.md).
