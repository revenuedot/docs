---
title: Why are webhooks not arriving?
description: Check the webhook's delivery log first. Most misses are a filter that excludes the event, a backend that answers something other than 200, or a URL the server cannot reach.
---

# Why are webhooks not arriving?

Open the webhook's delivery log first: it shows every attempt with its HTTP status and error. No delivery at all means a filter excluded the event, or the webhook did not exist yet when the event happened. Deliveries marked `pending` or `failed` mean your backend answered something other than **HTTP 200**, timed out after 60 seconds, or could not be reached.

## Look at the deliveries
```bash
curl -s -H "Authorization: Bearer $SECRET_KEY" \
  "https://revenuedot.example.com/v2/projects/$PROJECT_ID/webhooks/$WEBHOOK_ID/deliveries?status=failed"
```

The dashboard's **Webhooks** page shows the same log. For a project-wide view, `GET /v2/projects/{project_id}/setup_health` has a `webhooks` block with the delivered share over the last 24 hours and every webhook whose last attempt failed.

To check the wiring end to end, send a `TEST` event:
```bash
curl -s -X POST -H "Authorization: Bearer $SECRET_KEY" \
  https://revenuedot.example.com/v2/projects/$PROJECT_ID/integrations/webhooks/$WEBHOOK_ID/test
```

## No delivery at all
1. **The environment filter excludes it.** A webhook with `environment: "production"` never receives sandbox or Test Store events. Test Store purchases are always sandbox. Set `environment` to `null` for both.
2. **The event type filter excludes it.** If `event_types` is set, only those types are sent.
3. **The app filter excludes it.** If `app_id` is set, events from other apps are skipped.
4. **The webhook did not exist yet.** Deliveries are queued when the event happens, for the webhooks that exist then. A webhook you add later does not get older events.
5. **No event happened.** An imported customer produces no events unless the import ran with `--emit-events`. A purchase RevenueDot has not seen, reported only by a store notification, produces nothing unless `track_new_purchases` is on. See [Why are store notifications not arriving?](store-notifications-not-arriving.md)
6. **The event type is never sent, or only on request.** RevenueDot accepts `TEMPORARY_ENTITLEMENT_GRANT` and `INVOICE_ISSUANCE` in filters but never produces them, and sends `SUBSCRIBER_ALIAS` and the funnel types (`FUNNEL_VIEWED`, `FUNNEL_STEP_COMPLETED`, `FUNNEL_PURCHASE`) only to webhooks whose filter names them. See [Webhooks](../guides/webhooks.md).

## Deliveries that fail
1. **Your backend answers something other than 200.** Only 200 counts as delivered. A 201, 204 or redirect is a failure and is retried. Answer 200 as soon as you have stored the event, and do slow work afterwards.
2. **Your backend is too slow.** RevenueDot waits 60 seconds, then counts the attempt as failed.
3. **Signature checks reject the request.** Verify `X-RevenueCat-Webhook-Signature` against the raw request body, not re-serialized JSON, with the `whsec_` secret of this webhook. The header is `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`. A new signature is made for every attempt. See [Webhooks](../guides/webhooks.md) for verification code.
4. **The `Authorization` header does not match.** If you set `authorization_header` on the webhook, RevenueDot sends it exactly as stored. Compare it with what your backend expects.
5. **The server cannot reach the URL.** A self-hosted container cannot reach `localhost` on your computer. Use `http://host.docker.internal:<port>` on Mac and Windows, and on Linux add `extra_hosts: ["host.docker.internal:host-gateway"]` to the service.

## Retries and timing
- The server sends due webhooks from a background job every 30 seconds, and right after a purchase.
- A failed attempt is retried after 5, 10, 20, 40 and 80 minutes. After that the delivery is marked `failed`. This matches RevenueCat's schedule ([RevenueCat docs](https://www.revenuecat.com/docs/integrations/webhooks)).
- Retry by hand from the dashboard, or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
- Delivery is at least once. Deduplicate on `event.id`.

A real delivery, captured from a local run, looks like this:

```text
POST /api/webhooks/revenuedot
content-type: application/json
user-agent: RevenueDot-Webhooks/1.0
x-revenuecat-webhook-signature: t=1790800914,v1=5e6c0809f9b7b24f7ae36f4744b3b04868222411db4b24c60e6e390c5e9c495f

{"event":{"id":"E6BD2240-52BB-444A-8C96-AA85468119C6","type":"INITIAL_PURCHASE","store":"PROMOTIONAL","app_user_id":"user_9","environment":"PRODUCTION","product_id":"rc_promo_pro_weekly","period_type":"PROMOTIONAL", "...": "..."},"api_version":"1.0"}
```

## Related
- [Webhooks](../guides/webhooks.md)
- [Webhook events](../../api/webhook-events.md)
- [Troubleshooting by symptom](troubleshooting.md)
