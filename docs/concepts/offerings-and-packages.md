---
title: How do offerings and packages decide what my paywall shows?
description: An offering is a set of packages, and each package holds one product per app. The SDK shows the current offering, so you change the paywall's products on the server without an app update.
---

# How do offerings and packages decide what my paywall shows?

The SDK asks RevenueDot for **offerings** and shows the **current** one. An offering holds **packages** such as "Monthly" and "Yearly". Each package holds one product per app, so the same offering serves your iOS and Android apps. To change prices or plans, change the current offering on the server; the app picks it up on its next `getOfferings()` call.

```text
Offering "default" (current)          metadata: {"headline":"Go Pro"}
├── $rc_monthly  "Monthly"   →  pro_monthly (App Store)   ·  pro:monthly (Google Play)
├── $rc_annual   "Yearly"    →  pro_annual  (App Store)   ·  pro:annual  (Google Play)
└── $rc_lifetime "Lifetime"  →  pro_lifetime (App Store)
```

## What the SDK receives
`GET /v1/subscribers/{app_user_id}/offerings` answers only the packages whose product belongs to the calling app (the app is known from the public key):

```json
{"current_offering_id":"default","offerings":[{"description":"Standard plans","identifier":"default","metadata":null,"packages":[{"identifier":"$rc_monthly","platform_product_identifier":"pro_monthly"},{"identifier":"$rc_annual","platform_product_identifier":"pro_annual"},{"identifier":"$rc_lifetime","platform_product_identifier":"pro_lifetime"}]}]}
```

The SDK then loads prices and titles from the store (or from RevenueDot for Test Store products) and builds `Offerings`, `Offering` and `Package` objects. For Google Play products stored as `subscription:basePlan`, the package also carries `platform_product_plan_identifier`.

## Build an offering
```bash
B="$REVENUEDOT_URL/v2/projects/$PROJECT_ID"; H="Authorization: Bearer $SECRET_KEY"
# 1. The offering. The project's first offering becomes current.
curl -s -X POST "$B/offerings" -H "$H" -H "Content-Type: application/json" -d '{"lookup_key":"default","display_name":"Standard plans"}'
# 2. A package, placed first.
curl -s -X POST "$B/offerings/$OFFERING_ID/packages" -H "$H" -H "Content-Type: application/json" -d '{"lookup_key":"$rc_monthly","display_name":"Monthly","position":0}'
# 3. One product per app in the package.
curl -s -X POST "$B/packages/$PACKAGE_ID/actions/attach_products" -H "$H" -H "Content-Type: application/json" \
  -d '{"products":[{"product_id":"'$IOS_MONTHLY'","eligibility_criteria":"all"},{"product_id":"'$ANDROID_MONTHLY'","eligibility_criteria":"all"}]}'
```

- **Use the standard package lookup keys** (`$rc_weekly`, `$rc_monthly`, `$rc_two_month`, `$rc_three_month`, `$rc_six_month`, `$rc_annual`, `$rc_lifetime`) so the SDK's shortcuts such as `offering.monthly` work. Any other key is a custom package.
- **Order** follows `position`, lowest first, then creation time.
- **One product per app per package.** Two products of the same app can share a package only when their `eligibility_criteria` do not overlap (`google_sdk_lt_6` and `google_sdk_ge_6`); otherwise the API answers 409.
- **Metadata** is free-form JSON on the offering (`metadata`). Use it for paywall copy or feature flags; the SDK exposes it as `offering.metadata`.

## Change the paywall without an app update
- **Make another offering current:** `POST .../offerings/{offering_id}` with `{"is_current": true}`. Exactly one offering is current. An archived offering cannot be made current.
- **Show one customer a different offering:** `POST .../customers/{customer_id}/actions/assign_offering` with `{"offering_id": "ofrng..."}` (v2), or `POST /v1/subscribers/{app_user_id}/offerings/{offering}/override` (v1). That customer's `current_offering_id` becomes this offering. Send `null` (v2) or `DELETE /v1/subscribers/{app_user_id}/offerings/override` to undo it.
- **Retire an offering:** archive it (`.../actions/archive`). The current offering cannot be archived; make another one current first.

Experiments, targeting rules and server-driven paywalls are not built yet (planned for Tier 2). The SDK's paywall components get no paywall from RevenueDot today.

## Related
- [Products and entitlements](products-and-entitlements.md)
- [REST API v2: offerings and packages](../../api/rest-v2.md)
- [SDK endpoints: offerings](../../api/sdk-endpoints.md)
