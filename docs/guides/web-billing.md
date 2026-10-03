---
title: How do I sell my app's subscriptions on the web with Stripe?
description: Connect your Stripe account with a restricted key and a webhook, add a web config, let RevenueDot create web products in Stripe, put them in an offering, then share a purchase link or publish a funnel. Buyers pay on Stripe Checkout and unlock the app with a redemption link.
---

# How do I sell my app's subscriptions on the web with Stripe?

RevenueDot hosts the checkout pages and runs every payment on **your own Stripe account**. Open **Web** in the dashboard and do four steps: connect Stripe, add a web config, create web products, and put them in an offering. Then share a [purchase link](purchase-links.md) or publish a [funnel](funnels.md). Buyers pay on Stripe Checkout. RevenueDot records the purchase like any Stripe purchase, sends the usual webhooks, and gives the buyer a [redemption link](redemption-links.md) that unlocks the app.

You need a Stripe account and a RevenueDot project with your app. You write no checkout code.

## How a web purchase works
1. A buyer opens a purchase link or a funnel, such as `https://api.revenuedot.app/pay/scanner/spring-sale`.
2. They pick a plan. RevenueDot creates a Stripe Checkout Session with your Stripe key and sends them to Stripe's payment page.
3. Stripe sends them back to the success page. RevenueDot reads the session from Stripe and records the purchase.
4. The success page shows **Open the app** and the store buttons. The buyer also gets the link by email.
5. The app opens the redemption link and calls `redeemWebPurchase`. The purchase moves to the app's user and the entitlement is active.

When the page already knows the buyer's app user id (`?app_user_id=` on a purchase link, or the iOS SDK's web checkout), step 5 is not needed: the purchase goes straight to that user.

## 1. Connect Stripe
On the **Web** page, click **Add web provider** and pick Stripe. Or create a Stripe app with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner Web","type":"stripe"}'
```

Then give the app a **restricted key** and add the Stripe webhook (below). **On RevenueDot Cloud this is the only way today:** Connect with Stripe is not available there yet. On a self-hosted server whose operator has set up a Stripe Connect platform, you can instead select **Connect with Stripe** on the app's page and allow RevenueDot in Stripe: no keys and no webhook to set up. See [Connect with Stripe](stripe-connect.md).

Create a **restricted key** in the [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys/create). Web billing needs more than [tracking Stripe subscriptions](stripe.md) does, because RevenueDot creates products, prices, Checkout Sessions, coupons and promotion codes in your account:

| Stripe resource | Permission |
|---|---|
| Products | Write |
| Prices | Write |
| Checkout Sessions | Write |
| Coupons | Write |
| Promotion Codes | Write |
| Subscriptions | Read |
| Invoices | Read |
| Charges | Read |
| Customers | Read |

Leave everything else at None. Save the key on the Stripe app page, or with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"stripe":{"stripe_secret_key":"rk_test_…"}}'
```

**Check credentials** on the app page tests the read permissions. It does not test the write permissions: a key without them fails when you create the first web product, with a 422 `store_error` that says the key needs write access to Products and Prices.

### Add the Stripe webhook
Use the same webhook endpoint as the [Stripe guide](stripe.md#3-add-the-webhook-endpoint): `https://<your server>/v1/notifications/stripe/{app_id}`, with its signing secret saved as `stripe_webhook_secret`. **Select `checkout.session.completed`.** Add `checkout.session.async_payment_succeeded` too if you accept payment methods that confirm later, such as bank debits.

The webhook is your backup for the success page. A buyer who closes the tab after paying still gets the purchase, because the webhook records it. A session that RevenueDot's checkout created is always recorded, even when **Track new purchases** is off.

## 2. Add a web config
The web config sets how the pages look and what happens after payment. One config per Stripe app. On the **Web** page, open the provider's menu and click **Add web config**.

| Field | What it does |
|---|---|
| `app_name` | Shown at the top of every page. Default: the Stripe app's name |
| `logo_url` | Logo at the top of every page |
| `theme` | `background`, `text`, `accent` and `button_text` as `#RRGGBB`, and `corner_radius` from 0 to 24. Presets: Ink, Night, Ocean, Forest, Sunset |
| `terms_url`, `privacy_url` | Links at the bottom of every page |
| `support_email` | A Support link on the pages, and the reply-to address of the redemption email |
| `success_mode` | `show_redemption` (RevenueDot's success page) or `redirect` (your own page) |
| `success_redirect_url` | Required for `redirect`. RevenueDot answers 303 to it and adds `redemption_url` to the query |
| `success_title`, `success_body` | The success page's title and text |
| `cancel_url` | Where a cancelled checkout goes. Default: back to the page, which says "Checkout was cancelled" |
| `app_scheme` | Your app's URL scheme for [redemption links](redemption-links.md), such as `scanner`. Default: `rd-` and 10 hex characters. Schemes a browser opens itself (`https`, `javascript`, `mailto` and the like) are refused |
| `app_store_url`, `play_store_url` | Store buttons on the success and redemption pages |
| `redemption_link_hours` | How long a redemption link works, 1 to 720. Default 24 |

Every URL must be https. With the API, send only the fields you change:

```bash
curl -s -X PUT "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/web_config" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"app_name":"Scanner","support_email":"help@scanner.example","terms_url":"https://scanner.example/terms","privacy_url":"https://scanner.example/privacy","app_scheme":"scanner","app_store_url":"https://apps.apple.com/app/id123","play_store_url":"https://play.google.com/store/apps/details?id=com.example.scanner"}'
```
```json
{"object":"web_config","app_id":"appstrp8k2m9q4","saved":true,"updated_at":1790801342625,"app_name":"Scanner","logo_url":null,"theme":{"background":"#FFFFFF","text":"#0A0A0A","accent":"#0A0A0A","button_text":"#FFFFFF","corner_radius":0},"terms_url":"https://scanner.example/terms","privacy_url":"https://scanner.example/privacy","support_email":"help@scanner.example","success_mode":"show_redemption","success_redirect_url":null,"success_title":null,"success_body":null,"cancel_url":null,"app_scheme":"scanner","app_store_url":"https://apps.apple.com/app/id123","play_store_url":"https://play.google.com/store/apps/details?id=com.example.scanner","redemption_link_hours":24,"presets":["…"]}
```

`GET` on the same path returns the config, or the defaults with `saved: false` before the first save.

## 3. Create web products
A web product is a price you sell on the web. On the **Web** page, open the provider's menu and click **Create web product**. RevenueDot then, with your key:

1. Creates a **Stripe Product** named after the web product, with `metadata.revenuedot_project` set to your project id.
2. Creates a **Stripe Price** on it: the amount and currency, and for a subscription the billing period.
3. Creates a RevenueDot product whose **`store_identifier` is the Stripe price id** (`price_…`). Stripe purchases of that price map to this product, so each price is its own product.
4. Attaches it to the entitlements you pick.

Billing periods are `P1W` (week), `P1M` (month), `P3M` (3 months), `P6M` (6 months) and `P1Y` (year). `trial_days` adds a free trial to each checkout; it is not stored on the Stripe price. `type` is `subscription`, `consumable` or `non_consumable` (one-time prices).

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/web_products" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"display_name":"Pro monthly","type":"subscription","price":{"amount":9.99,"currency":"USD"},"duration":"P1M","trial_days":7,"entitlement_ids":["entl1a2b3c4d5e"]}'
```
```json
{"object":"web_product","product":{"object":"product","id":"prod1a2b3c4d5e6f7g","store_identifier":"price_1QxR2nKc8Hn4AbCd","type":"subscription","state":"active","subscription":{"duration":"P1M","grace_period_duration":null,"trial_duration":null},"one_time":{"is_consumable":null},"created_at":1790800901115,"app_id":"appstrp8k2m9q4","display_name":"Pro monthly"},"stripe_product_id":"prod_RqA1b2C3d4E5f6","stripe_price_id":"price_1QxR2nKc8Hn4AbCd","price":{"amount":9.99,"amount_minor":999,"currency":"USD"},"interval":"month","interval_count":1,"trial_days":7,"created_at":1790800901115}
```

**Already have prices in Stripe?** Send `stripe_price_id` instead of `price` and `duration`. RevenueDot reads the amount and period from Stripe and creates nothing there. The price needs a fixed amount, and its type must match: recurring for `subscription`, one-time otherwise. A second product for the same price answers 409.

List them with `GET /v2/projects/{project_id}/apps/{app_id}/web_products`.

## 4. Put web products in an offering
Pages sell an offering's packages. A package can hold one product per app, so the same package can hold your App Store product, your Google Play product and your web product. The web pages show only the packages that have a web product of the Stripe app.

```bash
# Create the offering, a package, and attach the web product.
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/offerings" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d '{"lookup_key":"web","display_name":"Go Pro on the web"}'
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/offerings/$OFFERING_ID/packages" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d '{"lookup_key":"$rc_monthly","display_name":"Monthly","position":1}'
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/packages/$PACKAGE_ID/actions/attach_products" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d '{"products":[{"product_id":"prod1a2b3c4d5e6f7g","eligibility_criteria":"all"}]}'
```

The checklist on the **Web** page is now complete. Read it with the API:

```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/web" -H "Authorization: Bearer $SECRET_KEY"
```
```json
{"object":"web_overview","pay_base":"https://api.revenuedot.app/pay","project_base":"https://api.revenuedot.app/pay/scanner","checklist":{"connect_stripe":true,"web_config":true,"web_products":true,"offering":true},"web_products":3,"offerings_with_web_products":["ofrngm2u3h89blc"],"providers":["…"],"domain":{"…":"…"}}
```

Now create a [purchase link](purchase-links.md) or a [funnel](funnels.md).

## The hosted checkout
A checkout starts from a purchase link, a funnel's paywall step, or the iOS SDK's paywall web checkout. RevenueDot checks the plan and any [discount](web-discounts.md), then creates a Stripe Checkout Session:

- `mode` is `subscription` for a recurring price and `payment` for a one-time price, with one line item: the package's price.
- `subscription_data.trial_period_days` when the web product has a trial.
- `customer_email` when the page knows the email (`?email=`, or a funnel's email step).
- `discounts` with the code's promotion code, or the page's automatic coupon.
- `metadata` with `app_user_id`, `rd_checkout` (the web checkout id) and `rd_source`. A subscription gets the same metadata.
- `success_url` is the page's success page. `cancel_url` is the web config's `cancel_url`, or the page itself.

**Who the purchase belongs to.** When the page has an app user id, the purchase goes to that customer. Otherwise the buyer gets a new anonymous id, `$RCAnonymousID:` and 32 hex characters, and a redemption link later moves the purchase to the app's user. A funnel uses its visitor's anonymous id, unless a customer already has that id.

**How it is recorded.** The success page and the `checkout.session.completed` webhook both record the purchase; whichever comes first does it, once. Both read the session from Stripe and record it through the same path as [`POST /v1/receipts` with `X-Platform: stripe`](stripe.md#4-post-each-purchase-from-your-backend). So you get the usual events: `INITIAL_PURCHASE` (`TRIAL` during a trial) or `NON_RENEWING_PURCHASE`, with `store: STRIPE` and `presented_offering_id` set to the offering. Renewals, cancellations and refunds then come from Stripe's webhooks as described in the [Stripe guide](stripe.md#how-stripe-states-map-to-events).

**The buyer's email** becomes the customer's `$email` attribute. For an app user id that already exists, the email and funnel answers only fill in attributes the customer does not have; they never overwrite them. The redemption link is emailed to it when the server can send email. RevenueDot Cloud always can. A self-hosted server needs [SMTP settings](self-hosting.md#email).

## The success page
After payment, Stripe sends the buyer to `<page>/success`. The page shows:
- **Paid, anonymous buyer:** the success title and text, **Open the app** (the [redemption link](redemption-links.md)), and the App Store and Google Play buttons.
- **Paid, buyer with an app user id:** "Your purchase is linked to your account. Open the app to use it." and the store buttons. No redemption link is needed.
- **Not confirmed yet:** "Your payment is processing. This page updates by itself." The page reloads until Stripe confirms.

With `success_mode: redirect`, the page answers 303 to your `success_redirect_url` and adds `redemption_url` (the https redemption link) to the query, so your own page can show it.

## The iOS SDK's web checkout
A RevenueCatUI paywall can have a purchase button that opens web checkout (see [Paywalls](paywalls.md)). The iOS SDK then calls `POST /rcbilling/v1/hosted-checkout` with the package. RevenueDot finds the Stripe app that sells that package and answers with a Stripe Checkout URL for the SDK's app user id. The SDK closes the page when it reaches the success or cancel URL, and the purchase is already on the customer. A package with no web product answers 400 with code 7000. Reference: [SDK endpoints](../../api/sdk-endpoints.md#start-a-hosted-web-checkout).

## Test before you go live
Use a test-mode key (`rk_test_…`), or on a server with Connect with Stripe, connect in **Test** mode. Purchases are then sandbox data, kept out of production charts, and webhooks carry `environment: SANDBOX`. Pay with [Stripe's test cards](https://docs.stripe.com/testing), such as `4242 4242 4242 4242`. For production, create a second Stripe app with a live key and its own webhook endpoint (or connected in **Live** mode) and its own web products: Stripe keeps test and live products apart.

## Not built yet
- **Paddle** as a web provider.
- **An embedded checkout** (Stripe Elements on your page) and the purchases-js Web Billing checkout for `rcb_` keys. RevenueDot's checkout is a hosted page.
- **Apple Pay domain registration** for your custom domain.
- No real Stripe account has run these flows yet. The tests run against an in-memory copy of Stripe's API. Run a purchase in Stripe test mode before you send buyers.

## Related
- [Purchase links](purchase-links.md), [Funnels](funnels.md), [Redemption links](redemption-links.md), [Web discounts](web-discounts.md), [Custom domains](custom-domains.md)
- [Connect Stripe](stripe.md): subscriptions from your own checkout, the webhook and the event mapping
- [Extensions: Web billing](../../api/extensions.md#web-billing)
