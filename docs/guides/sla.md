---
title: What does the RevenueDot SLA promise?
description: RevenueDot Enterprise promises 99.9% monthly uptime for the purchase path on RevenueDot Cloud, with service credits, and support response times from 1 hour for failing purchases, on Cloud and self-hosted.
---

# What does the RevenueDot SLA promise?

RevenueDot Enterprise customers get two promises. On **RevenueDot Cloud**, the purchase path is up **99.9% of each calendar month**, or the month earns a service credit. On **Cloud and self-hosted**, we **answer within 1 hour, at any hour, when purchases are failing in production**, and faster than our standard support for everything else. Pro and the open-source server have no SLA. Pro includes email support with a first reply within 2 business days, which is a support target, not an SLA.

Your order form is the contract. If it says something different from this page, the order form wins.

## Uptime on RevenueDot Cloud
**The purchase path** is what your apps need to sell and unlock access: the SDK endpoints (`/v1/receipts`, `/v1/subscribers/…`, offerings, product entitlement mapping, identify and alias) and the App Store and Google Play notification endpoints. The dashboard, the REST API, charts, exports and integrations are covered by support response times, not by the uptime number.

**How it is measured.** External checks call the purchase path every minute from at least three regions. A minute counts as down when the checks fail from two or more regions, or when more than 5% of real purchase-path requests in that minute get a 5xx answer or no answer within 30 seconds. Monthly uptime is the share of the month's minutes that were not down.

**Service credits**, as a share of that month's Enterprise fee:

| Monthly uptime | Credit |
|---|---|
| 99.9% or more | none |
| below 99.9% | 10% |
| below 99.5% | 25% |
| below 99.0% | 50% |

Ask for a credit within 30 days of the month's end by email or in your Slack channel. Credits come off the next invoice and are the only remedy for missed uptime.

**Not counted as down:**
- Problems at Apple, Google, Amazon or Stripe. RevenueDot keeps answering from its own records while a store is down, and catches up when the store is back.
- Requests your account sends above its rate limits, or that our terms do not allow.
- Features marked beta, and anything you changed (a wrong key, a deleted app, a paused webhook).
- Events outside reasonable control, such as a regional outage of our cloud provider declared by that provider.

The SDKs soften short outages on their own: they keep a cached customer info, and they keep and retry any receipt post that gets a 5xx answer ([offline entitlements](offline-entitlements.md)).

## Support response times (Cloud and self-hosted)
| Severity | Example | First response |
|---|---|---|
| 1. Purchases failing | Production apps cannot buy or unlock, or customers lose access | **1 hour, 24 hours a day, every day** |
| 2. A feature is broken | Webhooks stopped, a chart is wrong, the dashboard will not load | 4 business hours |
| 3. A question | How to set something up, a feature request | 1 business day |

Business hours are 9:00 to 18:00 US Pacific time, Monday to Friday. Enterprise support comes through a private Slack channel with a named engineer; email works too. For severity 1, we keep you updated at least every hour until it is fixed, and send a written report of what happened and what changes within 5 business days.

## Self-hosted servers
You run the servers, so **uptime is yours**, and we promise the support response times above, including for your infrastructure when RevenueDot is involved. The [high-availability setups](high-availability.md) are designed so that no single server, zone or database instance stops purchases: two or more replicas in different zones, a Postgres standby with automatic failover, health checks that take a replica out before it stops, and upgrades one replica at a time.

We also:
- fix a security problem rated critical in the server within 7 days of confirming it, and tell Enterprise customers before the fix is public;
- keep each release able to run next to the one before it during an upgrade, or say in the release notes when it cannot.

## Related
- [Enterprise](enterprise.md)
- [High availability](high-availability.md)
- [Offline entitlements](offline-entitlements.md)
- [Pricing](https://revenuedot.app/pricing)
