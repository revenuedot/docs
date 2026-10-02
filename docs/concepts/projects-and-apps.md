---
title: What are projects, apps and API keys?
description: A project is one product you sell. An app is that product on one store, with its own public SDK key. Secret keys belong to a project and unlock the REST API.
---

# What are projects, apps and API keys?

A **project** is one product you sell, such as "Scanner". It owns the catalog, the customers, the webhooks and the secret keys. An **app** is that product on one store. Each app has its own public key, which the SDK sends with every request.

## Projects
- Signing up in the dashboard (`/signup`) or with `POST /auth/signup` creates your account and its first project.
- More projects: dashboard → **New project**, or `POST /v2/projects` while signed in to the dashboard. A secret key belongs to one project, so it cannot create projects.
- Project settings (`GET` or `POST /v2/projects/{project_id}`): `name`, `transfer_behavior` and `sandbox_transfer_behavior`. See [Customers and app user IDs](customers-and-app-user-ids.md#who-owns-a-restored-purchase).
- Deleting a project deletes everything in it. Only an admin can do it, and only from the dashboard.

## Apps
Create an app per store with `POST /v2/projects/{project_id}/apps` or on the dashboard's **Apps** page.

| `type` | Store | Public key prefix | Store id field | Receipts accepted today |
|---|---|---|---|---|
| `app_store` | Apple App Store (iOS, iPadOS, tvOS, visionOS, watchOS) | `appl_` | `app_store.bundle_id` | Yes |
| `mac_app_store` | Mac App Store | `mac_` | `mac_app_store.bundle_id` | Yes |
| `play_store` | Google Play | `goog_` | `play_store.package_name` | Yes |
| `test_store` | RevenueDot Test Store | `test_` | none | Yes |
| `amazon` | Amazon Appstore | `amzn_` | `amazon.package_name` | Yes ([guide](../guides/amazon-appstore.md)) |
| `stripe` | Stripe, your own account | `strp_` | none | Yes: posted by your backend ([guide](../guides/stripe.md)), or sold on RevenueDot's hosted checkout ([web billing](../guides/web-billing.md)) |
| `paddle` | Paddle Billing, your own account | `pdl_` | none | Yes: posted by your backend ([guide](../guides/paddle.md)) |
| `roku` | Roku Pay | `roku_` | none (`roku.roku_channel_id` tells channels apart) | Yes ([guide](../guides/roku.md)) |
| `galaxy` | Samsung Galaxy Store (a RevenueDot extension of the v2 API) | `galx_` | `galaxy.package_name` | Yes ([guide](../guides/galaxy-store.md)) |
| `rc_billing` | RevenueCat Billing | `rcb_` | none | No. Sell on the web with a `stripe` app instead |

```bash
curl -s -X POST http://localhost:8787/v2/projects/$PROJECT_ID/apps \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner (iOS)","type":"app_store","app_store":{"bundle_id":"com.example.scanner"}}'
```
```json
{"object":"app","id":"appk6jbcorn","name":"Scanner (iOS)","created_at":1790798214712,"type":"app_store","project_id":"projujvzn2wl","custom_url_scheme":"rc-3c3d62a884","app_store":{"bundle_id":"com.example.scanner","app_store_connect_api_key_configured":false,"subscription_key_configured":false,"app_store_connect_vendor_number":null}}
```

Store credentials, such as Apple's in-app purchase key and Google's service account, belong to the app. They are never returned by the API; responses only say whether each is configured. Setup is in [Connect the App Store](../guides/app-store.md) and [Connect Google Play](../guides/google-play.md).

## Which key goes where
| Key | Looks like | Where it lives | What it can do |
|---|---|---|---|
| Public app key | `appl_…`, `goog_…`, `test_…` | In your app, passed to `Purchases.configure` | The [SDK endpoints](../../api/sdk-endpoints.md) for that app's project: customer info, offerings, receipts, logIn, attributes |
| Secret key | `sk_…` | Your backend and scripts only | [REST API v1](../../api/rest-v1.md) and [v2](../../api/rest-v2.md) for one project, limited by its permissions |
| Dashboard session | cookie `rd_session` | Your browser | The dashboard, and `/v2` for every project you are a member of |
| Webhook signing secret | `whsec_…` | Your backend | Verifying webhook signatures |

Get an app's public key with `GET /v2/projects/{project_id}/apps/{app_id}/public_api_keys` or on the app's dashboard page. Create secret keys on **API keys** or with `POST /v2/projects/{project_id}/api_keys`. The key is returned once. See [Authentication](../../api/authentication.md).

## Related
- [Products and entitlements](products-and-entitlements.md)
- [REST API v2: apps](../../api/rest-v2.md#apps)
