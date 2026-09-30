---
title: How does RevenueDot keep sandbox purchases apart from real ones?
description: Every purchase carries an environment, sandbox or production, taken from the store. Metrics count production by default, and each webhook can receive one environment or both.
---

# How does RevenueDot keep sandbox purchases apart from real ones?

Every purchase and every event carries an **environment**: `sandbox` or `production`. RevenueDot takes it from the store, so you never set it yourself. Sandbox purchases unlock entitlements exactly like real ones, but metrics count production only by default, and each webhook chooses which environment it receives.

## Where sandbox purchases come from
| Source | Environment |
|---|---|
| App Store sandbox accounts and TestFlight | `sandbox` (from Apple's signed transaction) |
| StoreKit testing in Xcode | `sandbox`, accepted only when the app has the StoreKit test certificate (`xcode_certificate`) |
| Google Play license testers and test tracks | `sandbox` (Google's test purchase flag) |
| The RevenueDot [Test Store](../guides/test-store.md) (`test_` keys) | always `sandbox` |
| Real purchases | `production` |

## What changes with the environment
- **Customer info:** each subscription has `is_sandbox`. Entitlements do not care about the environment.
- **Webhooks:** `event.environment` is `SANDBOX` or `PRODUCTION`. A webhook with `environment: "production"` receives only real events; `null` receives both. Use a separate webhook URL for sandbox while you develop.
- **Metrics:** `GET /v2/projects/{project_id}/metrics/overview` counts production. Add `?environment=sandbox` to see test purchases (a RevenueDot extension).
- **REST API v2:** subscriptions and purchases have `environment`, and customer lists of subscriptions, purchases and events accept `?environment=`.
- **Restores:** a project can use a different transfer behaviour for sandbox purchases (`sandbox_transfer_behavior`). See [who owns a restored purchase](customers-and-app-user-ids.md#who-owns-a-restored-purchase).
- **Store notifications:** App Store Connect has one production URL and one sandbox URL. Point both at the same RevenueDot notification URL; each notification says its environment.

## Related
- [Test Store](../guides/test-store.md)
- [Test with App Store sandbox and Google Play testers](../guides/sandbox-testing.md)
- [How do I test purchases without real money?](../help/test-sandbox-purchases.md)
