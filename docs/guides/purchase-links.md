---
title: How do I share a checkout link for an offering?
description: A purchase link is a hosted checkout page for one offering at /pay/<project>/<link>. Add ?app_user_id= to buy for a signed-in user, ?email= to pre-fill the email and ?code= to pre-fill a discount code. Links can expire and carry an automatic discount.
---

# How do I share a checkout link for an offering?

Create a **purchase link**. It is a checkout page for one offering that RevenueDot hosts, at an address such as `https://api.revenuedot.app/pay/scanner/spring-sale`. The page shows the offering's web plans, takes payment on Stripe Checkout, and ends on the success page with a redemption link. Put it in emails, ads, QR codes or your website.

First finish the four steps in [Sell on the web with Stripe](web-billing.md): Stripe connected, a web config, web products, and an offering with them.

## Create a link
In the dashboard, open **Funnels**, then **Purchase links → Create purchase link**. Pick the offering and give the link a name. With the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Spring sale","offering_id":"ofrngm2u3h89blc","slug":"spring-sale"}'
```
```json
{"object":"purchase_link","id":"plink_4k8m2q9x1z3c","name":"Spring sale","slug":"spring-sale","app_id":"appstrp8k2m9q4","offering_id":"ofrngm2u3h89blc","offering_lookup_key":"web","offering_display_name":"Go Pro on the web","discount_id":null,"expires_at":null,"disabled_at":null,"status":"active","url":"https://api.revenuedot.app/pay/scanner/spring-sale","checkouts":0,"purchases":0,"created_at":1790800901115}
```

| Field | What it does |
|---|---|
| `name` | Your name for the link. Buyers do not see it |
| `offering_id` | The offering whose packages the page sells |
| `slug` | The end of the address. Default: made from the name. 3 to 40 lower-case letters, digits or `-`, unique among the project's links and funnels. A few words are reserved, such as `api`, `r` and `success` |
| `app_id` | The Stripe app to sell through. Default: the project's first Stripe app |
| `discount_id` | An automatic [web discount](web-discounts.md), applied without a code |
| `expires_at` | When the link stops working, in epoch milliseconds |
| `enabled` | `false` creates it turned off |

`checkouts` and `purchases` count the checkouts started and paid from the link.

## The URL
```
<pay base>/<project slug>/<link slug>
```

- On RevenueDot Cloud the pay base is `https://api.revenuedot.app/pay` today.
- On a self-hosted server it is `https://<your server>/pay`, or `REVENUEDOT_PAY_URL` when you set it.
- With a verified [custom domain](custom-domains.md), the link is `https://<your domain>/<link slug>`.

The `url` field always holds the current address. Change the project slug or the domain, and every link follows.

### Query parameters
| Parameter | What it does |
|---|---|
| `?app_user_id=user_123` | Buys for this app user id. The purchase goes straight to that customer, so no redemption link is needed. Use it in emails or in-app links to signed-in users |
| `?email=ana@example.com` | Pre-fills the email. Stripe Checkout shows it and the receipt goes there |
| `?code=SPRING20` | Pre-fills a discount code. The page checks it at once and shows the result |

Combine them: `https://api.revenuedot.app/pay/scanner/spring-sale?app_user_id=user_123&code=SPRING20`. In the dashboard, **Copy link for a signed-in user** copies the link with an `app_user_id` placeholder.

The purchase goes to whatever `app_user_id` the link carries. Put your app's real user id there, the same one the app passes to `Purchases.logIn`.

## What the page shows
- The web config's logo, app name and colours.
- One card per package that holds a web product of the Stripe app: the package name, the price per period, and the trial ("7-day free trial, then $9.99 per month"). The plan with the lowest monthly price gets a "Save N%" badge when it saves 5% or more.
- A discount code field with a live check ("20% off for 3 months applied at checkout.").
- Your terms, privacy and support links.

A cancelled checkout returns to the page with `?canceled=1`, which says "Checkout was cancelled. Pick a plan to try again." Set `cancel_url` in the web config to send buyers elsewhere.

## Expiry and turning a link off
An expired or turned-off link answers **410** with a page that says "This link has expired". Starting a checkout from it also answers 410.

```bash
# Turn the link off, or set an expiry (null removes it).
curl -s -X PATCH "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links/plink_4k8m2q9x1z3c" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" -d '{"enabled":false}'
curl -s -X PATCH "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links/plink_4k8m2q9x1z3c" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" -d '{"expires_at":1793392914000}'
```

`status` is `active`, `expired` or `disabled`. A deleted link answers 404.

## Automatic discount
Set `discount_id` to apply a [web discount](web-discounts.md) to every checkout from the link, with no code. A buyer who types a code gets the code's discount instead. The discount's own checks still apply: it must be enabled, not expired, under its cap, for the chosen plan, and the buyer must be eligible.

```bash
curl -s -X PATCH "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links/plink_4k8m2q9x1z3c" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" -d '{"discount_id":"disc8h3n1v6w0z2y4d"}'
```

## Other operations
```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links" -H "Authorization: Bearer $SECRET_KEY"
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links/plink_4k8m2q9x1z3c" -H "Authorization: Bearer $SECRET_KEY"
curl -s -X DELETE "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/purchase_links/plink_4k8m2q9x1z3c" -H "Authorization: Bearer $SECRET_KEY"
```

The key needs `project_configuration:offerings:read_write` to change links. Reference: [Extensions: Purchase links](../../api/extensions.md#purchase-links).

## Related
- [Sell on the web with Stripe](web-billing.md)
- [Redemption links](redemption-links.md): how an anonymous buyer unlocks the app
- [Funnels](funnels.md): several steps before the plans
- [Custom domains](custom-domains.md)
