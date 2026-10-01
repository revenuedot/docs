---
title: How do I receive and verify RevenueDot webhooks?
description: Add a webhook URL, keep the whsec_ signing secret, verify the X-RevenueCat-Webhook-Signature HMAC on the raw body, answer 200 fast and deduplicate on event.id. Failed deliveries retry 5 times.
---

# How do I receive and verify RevenueDot webhooks?

Add a webhook in the dashboard or with the API and keep the `whsec_...` signing secret it returns. RevenueDot then POSTs each event to your URL as JSON in RevenueCat's webhook format. Verify the `X-RevenueCat-Webhook-Signature` header against the **raw** request body, answer **200** quickly, and ignore events whose `event.id` you have already handled. Anything but 200 is retried after 5, 10, 20, 40 and 80 minutes.

## 1. Add a webhook
In the dashboard: **Integrations → Webhooks → Add webhook**. Or with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/integrations/webhooks" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Backend","url":"https://api.example.com/webhooks/revenuedot","authorization_header":"Bearer my-shared-token","environment":"production"}'
```
```json
{"object":"webhook_integration","id":"wh_ceps8nr7mczvhaqw","project_id":"proj18pzzkao","name":"Backend","url":"https://api.example.com/webhooks/revenuedot","environment":"production","event_types":[],"app_id":null,"created_at":1790801342625,"signing_secret":"whsec_3f5b7fb5a591c17aaa9108376df0bddbe1555f0a908bfdc0"}
```

- **`signing_secret` is shown once**, in this answer. Store it as a secret in your backend.
- `authorization_header` (optional) is sent verbatim as the `Authorization` header, the same role as the authorization header setting in [RevenueCat's webhooks](https://www.revenuecat.com/docs/integrations/webhooks).
- `environment`: `production`, `sandbox`, or `null` for both.
- `event_types`: lower-case types such as `["initial_purchase","renewal"]`; empty means all.
- `app_id`: only one app's events; `null` for all apps.
- **Pause without deleting:** send `{"enabled":false}` to `POST /v2/projects/{project_id}/integrations/webhooks/{id}`, or use the Deliveries switch on the webhook's dashboard page. Events recorded while it is paused are not sent; queued retries resume when you turn it back on. `enabled` is a RevenueDot addition; read it with `GET /v2/projects/{project_id}/webhooks`.

## 2. What a delivery looks like
```http
POST /webhooks/revenuedot HTTP/1.1
Content-Type: application/json
User-Agent: RevenueDot-Webhooks/1.0
Authorization: Bearer my-shared-token
X-RevenueCat-Webhook-Signature: t=1790800914,v1=0a1552334e825926036f7efe21527800ea45caa63eca523c6120c6da9041ef99

{"api_version":"1.0","event":{"id":"66339910-3BFF-49F4-B873-D1283D673DE2","type":"INITIAL_PURCHASE","app_user_id":"user_1","original_app_user_id":"user_1","aliases":["user_1"],"product_id":"pro_monthly","entitlement_ids":["pro"],"period_type":"NORMAL","purchased_at_ms":1790800914000,"expiration_at_ms":1793392914000,"environment":"SANDBOX","store":"TEST_STORE","price":9.99,"currency":"USD","presented_offering_id":"default","transaction_id":"test_1790800914000_quickstart","...":"..."}}
```

Every field of every event type, with full examples, is on [Webhook events](../../api/webhook-events.md). Handlers written for RevenueCat's webhooks work unchanged: the field names and values are the same.

RevenueDot sends 18 of RevenueCat's 21 event types:
- **`SUBSCRIBER_ALIAS`** is sent only to webhooks whose `event_types` names `subscriber_alias`. RevenueCat deprecated it and sends it only to older projects, so a webhook without a filter never gets it.
- **`TEMPORARY_ENTITLEMENT_GRANT`, `INVOICE_ISSUANCE` and `PURCHASE_REDEEMED`** are never sent. RevenueDot never grants access it has not verified during a store outage (the SDK keeps access on the device instead, see [offline entitlements](offline-entitlements.md)), has no billing engine that issues invoices, and issues no web purchase redemption links.
- **`offer_code`** carries the App Store or Google Play offer id of the period, such as a [win-back offer](win-back-offers.md).

## 3. Verify the signature
The header is `t=<unix seconds>,v1=<hex>`, where the hex is HMAC-SHA256 of `"<t>.<raw body>"` keyed with the signing secret. RevenueDot signs again on every attempt, so `t` is the attempt's time.

1. Read the raw body bytes. Parsing JSON and serializing it again changes the bytes and breaks the check.
2. Parse `t` and `v1` from the header.
3. Refuse the request if `t` is more than 5 minutes from your clock. This stops replays.
4. Compute the HMAC and compare it to `v1` in constant time.

```js
// Node.js. Verifies the HMAC signature on a RevenueDot webhook delivery.
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(rawBody, header, secret, { now = new Date(), toleranceSeconds = 300 } = {}) {
  const match = /(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/.exec(header ?? "");
  if (!match) return false;
  const timestamp = Number(match[1]);
  // Refuse old deliveries so a captured request cannot be replayed.
  if (Math.abs(Math.floor(now.getTime() / 1000) - timestamp) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  const received = Buffer.from(match[2], "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
```
```python
# Python. Verifies the HMAC signature on a RevenueDot webhook delivery.
import hashlib, hmac, re, time

_PATTERN = re.compile(r"(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)")

def verify_signature(raw_body: bytes, header: str | None, secret: str, tolerance_seconds: int = 300) -> bool:
    match = _PATTERN.search(header or "")
    if not match:
        return False
    timestamp = int(match.group(1))
    # Refuse old deliveries so a captured request cannot be replayed.
    if abs(int(time.time()) - timestamp) > tolerance_seconds:
        return False
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, match.group(2))
```
```go
// Go. Verifies the HMAC signature on a RevenueDot webhook delivery.
var signaturePattern = regexp.MustCompile(`(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)`)

func VerifySignature(rawBody []byte, header, secret string, now time.Time, tolerance time.Duration) bool {
	m := signaturePattern.FindStringSubmatch(header)
	if m == nil {
		return false
	}
	ts, err := strconv.ParseInt(m[1], 10, 64)
	if err != nil {
		return false
	}
	// Refuse old deliveries so a captured request cannot be replayed.
	if age := now.Sub(time.Unix(ts, 0)); age > tolerance || age < -tolerance {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(m[1] + "."))
	mac.Write(rawBody)
	received, err := hex.DecodeString(m[2])
	return err == nil && hmac.Equal(received, mac.Sum(nil))
}
```

A complete Express handler that keeps the raw body:

```js
// Node.js + Express: receive RevenueDot webhooks.
import express from "express";
import { verifySignature } from "./verify.js";

const app = express();
const seen = new Set(); // use your database in production

app.post("/webhooks/revenuedot", express.raw({ type: "application/json" }), (req, res) => {
  if (!verifySignature(req.body, req.get("X-RevenueCat-Webhook-Signature"), process.env.REVENUEDOT_WEBHOOK_SECRET)) {
    return res.status(401).send("bad signature");
  }
  const { event } = JSON.parse(req.body.toString("utf8"));
  if (seen.has(event.id)) return res.sendStatus(200); // a retry of an event you already handled
  seen.add(event.id);
  // Grant or remove access in your own database here. Keep it fast: RevenueDot waits at most 60 seconds.
  res.sendStatus(200);
});
app.listen(3000);
```

Runnable, tested receivers: [Node.js + Express](https://github.com/revenuedot/examples/tree/main/backend/node-express-webhook), [Next.js](https://github.com/revenuedot/examples/tree/main/backend/nextjs-webhook), [Python + FastAPI](https://github.com/revenuedot/examples/tree/main/backend/python-fastapi-webhook) and [Go](https://github.com/revenuedot/examples/tree/main/backend/go-webhook).

If you set an `authorization_header`, also compare the `Authorization` header with it. The HMAC check is the stronger of the two, because it also proves the body was not changed.

## 4. Retries and delivery guarantees
- **Only HTTP 200 counts as delivered.** A 201, 204 or redirect is treated as a failure. RevenueCat documents the same rule for its [webhooks](https://www.revenuecat.com/docs/integrations/webhooks).
- **Timeout:** 60 seconds per attempt.
- **Schedule:** after a failure, RevenueDot retries after 5, 10, 20, 40 and 80 minutes (6 attempts in all), then marks the delivery `failed`.
- **At least once:** a delivery can arrive more than once, for example when your 200 is lost. Deduplicate on `event.id`.
- **Order is not guaranteed.** Use the timestamps in the event (`event_timestamp_ms`, `purchased_at_ms`, `expiration_at_ms`), or fetch the customer's current state with `GET /v1/subscribers/{app_user_id}` when order matters.
- **Every matching webhook gets its own delivery**, so two URLs each receive every event.

## 5. Test and debug
- **Send a test event:** dashboard **Send test event**, or `POST /v2/projects/{project_id}/integrations/webhooks/{id}/test`. It sends a purchase-shaped `TEST` event, signed like the others; filters do not apply.
- **Make real events with the Test Store:** `POST /v2/projects/{project_id}/test_purchases` with a `scenario` such as `renewal`, `cancel` or `refund` produces the matching events. See [Test Store](test-store.md).
- **Delivery log:** `GET /v2/projects/{project_id}/webhooks/{id}/deliveries?status=failed` shows each attempt's HTTP status, duration and error. Retry one now with `POST .../deliveries/{delivery_id}/retry`.
- **Health:** `GET /v2/projects/{project_id}/setup_health` counts deliveries in the last 24 hours and lists failing webhooks.
- **Local backend:** from a RevenueDot running in Docker, reach your laptop at `http://host.docker.internal:3000/...`.

See [Why are my webhooks not arriving?](../help/webhooks-not-arriving.md) for common causes.

## Related
- [Webhook events](../../api/webhook-events.md)
- [Subscriptions and events](../concepts/subscriptions-and-events.md)
- [REST API v2: webhook integrations](../../api/rest-v2.md)
