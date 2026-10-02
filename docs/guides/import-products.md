---
title: How do I import my products from App Store Connect, Google Play or Stripe?
description: Click Import products, pick the store products you already set up, and RevenueDot creates them in the catalog with their type, duration and name, attached to the entitlements you choose. Works with App Store Connect, Google Play and Stripe; Amazon products are added by SKU.
---

# How do I import my products from App Store Connect, Google Play or Stripe?

Open **Product catalog → Products** and click **Import products** (or **Import** next to one app, or **Import products** on the app's own page). RevenueDot reads the store with the credentials the app already has, lists every product with its type and duration, marks the ones already in the catalog, and creates the ones you pick. Nothing changes in the store. RevenueCat's dashboard has the same button under **+ New → Import Products** ([RevenueCat docs](https://www.revenuecat.com/docs/offerings/products-overview)).

## What each store needs
| Store | Credential on the app | Permission |
|---|---|---|
| App Store, Mac App Store | **App Store Connect API key**: the `.p8` file, its key ID and the issuer ID (app page → App Store Connect API key). The In-App Purchase key cannot read the product list. | A team key with the **App Manager** role ([Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)) |
| Google Play | The **service account JSON** you already use for purchases | **View app information and download bulk reports (read-only)** for the app in [Play Console → Users and permissions](https://play.google.com/console/developers/users-and-permissions) |
| Stripe | The app's **restricted key** | **Products: Read** (it covers prices) |
| Amazon Appstore | Not possible | Amazon has no API that lists an app's in-app items. Add each product with **New product**: a subscription by its term SKU, a one-time product by its SKU. |

When a credential is missing or the store refuses it, the dialog says which one and which role or permission it needs, with a link to the app's settings.

**App Store Connect answers 401?** The most common cause is saving the **In-App Purchase key** (a `SubscriptionKey_….p8` file, used for purchases and notifications) in the App Store Connect API key fields. Apple accepts that key only on the App Store Server API, never on the App Store Connect API, so the product list stays closed. Create a separate team key under [Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api) with the App Manager role and save that one. The app can keep both.

## What gets imported
- **App Store Connect:** every subscription, grouped by subscription group, and every in-app purchase. The product ID becomes the store identifier, the reference name the display name. Subscription periods become durations (`ONE_MONTH` is `P1M`, `ONE_YEAR` is `P1Y`). Consumable, non-consumable and non-renewing types carry over.
- **Google Play:** one product per **base plan**, as `subscription_id:base_plan_id` (for example `premium:monthly`), with the base plan's billing period; prepaid and installment plans are marked. One-time products come in as `one_time` by product ID. A subscription without a base plan is listed but cannot be imported until it has one. A one-time product with no backwards-compatible purchase option is importable, with a note: SDK versions that predate purchase options cannot buy it. RevenueCat asks you to add those by hand.
- **Stripe:** one product per **active price** (`price_…`), named after its Stripe product. Recurring prices become subscriptions with their interval; one-time prices become non-consumables (change them to consumable if they can be bought again). Prices whose product ID is already in the catalog count as imported. Metered prices and products without a price cannot be imported. Flat-rate prices can also be sold through [web billing](web-billing.md) right away. RevenueCat imports the Stripe product and has you pick one price ([RevenueCat docs](https://www.revenuecat.com/docs/web/integrations/stripe)); importing prices lets a monthly and a yearly price of one Stripe product both be in the catalog.

The import does not copy prices into the catalog. The Products page reads each App Store and Google Play product's price and status separately, and the [product editor](product-editor.md) changes them; see [Store prices and status](product-editor.md#store-prices-and-status-on-the-products-page).

## In the dashboard
1. Click **Import products** and choose the app.
2. Search, tick products, or tick the box in the header to **select all** that can be imported. Products already in the catalog show **In catalog** and cannot be ticked.
3. Optionally tick **entitlements** to attach every imported product to, such as `pro`.
4. Click **Import N products**. The summary lists what was created, what was already there and anything that failed.

Importing the same products again changes nothing.

## With the API
List what the store has (every page of the store's lists is read; `next_page` is always null):

```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/store_products" -H "Authorization: Bearer $SECRET_KEY"
```

```json
{
  "object": "list", "next_page": null, "app_id": "app1a2b3c4d", "store": "play_store", "warnings": [],
  "items": [
    { "object": "store_product_listing", "store_identifier": "premium:monthly", "type": "subscription", "display_name": "Premium (monthly)",
      "duration": "P1M", "store_state": "ACTIVE", "group": { "id": "premium", "name": "Premium" }, "price": null,
      "importable": true, "note": null, "in_catalog": true, "product_id": "prod1a2b3c4d5e" }
  ]
}
```

Import the ones you want, attached to entitlements:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/store_products/actions/import" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"store_identifiers":["premium:annual","gems_50"],"entitlement_ids":["entl1a2b3c4d5e"]}'
```

The answer has `created`, `existing` (left unchanged) and `failed` (`not_in_store` or `not_importable`, with a message). It is 201 when something was created, else 200. The key needs `project_configuration:products:read_write`, and `project_configuration:entitlements:read_write` too when you pass `entitlement_ids`. Reference: [List the products in the app's store](../../api/rest-v2.md#list-the-products-in-the-apps-store) and [Import products from the app's store](../../api/rest-v2.md#import-products-from-the-apps-store).

## Related
- [Products and entitlements](../concepts/products-and-entitlements.md)
- [App Store setup](app-store.md), [Google Play setup](google-play.md), [Stripe](stripe.md)
