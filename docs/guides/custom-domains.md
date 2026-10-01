---
title: Where do my purchase links and funnels live, and can I use my own domain?
description: Hosted pages live at <pay base>/<project slug>/<page>, which is https://api.revenuedot.app/pay on Cloud and your server's /pay (or REVENUEDOT_PAY_URL) when self-hosted. A custom domain needs a CNAME, a TXT record and Verify; on Cloud, TLS is then added by hand.
---

# Where do my purchase links and funnels live, and can I use my own domain?

By default, every [purchase link](purchase-links.md), [funnel](funnels.md) and [redemption link](redemption-links.md) lives on RevenueDot's address: `<pay base>/<project slug>/<page slug>`. You can move them to a domain you own, such as `pay.yourapp.com`: add two DNS records, click **Verify**, and the pages answer at `https://pay.yourapp.com/<page slug>`. On RevenueDot Cloud there is one more step, done by the RevenueDot team by hand for now: adding the domain's TLS certificate.

Both settings are in **Project settings → Domains**.

## The default address
| Where RevenueDot runs | Pay base | Example page |
|---|---|---|
| RevenueDot Cloud | `https://api.revenuedot.app/pay` | `https://api.revenuedot.app/pay/scanner/spring-sale` |
| Self-hosted | `https://<your server>/pay` | `https://revenuedot.example.com/pay/scanner/spring-sale` |
| Self-hosted with `REVENUEDOT_PAY_URL` | The value you set | `https://pay.example.com/scanner/spring-sale` |

- **Project slug.** Each project gets one from its name, such as `scanner`. Change it under **Project address**; it must be unique on the server. Every link and funnel follows at once, and the old address stops working.
- **Redemption links** live at `<pay base>/r/<token>`, outside any project.
- **`REVENUEDOT_PAY_URL`** (self-hosted) moves every project's pages. With a path, such as `https://api.example.com/pay`, pages live under it. Without a path, such as `https://pay.example.com`, the server answers that host at its root: point the host at the same server.

```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/web_domain" -H "Authorization: Bearer $SECRET_KEY"
curl -s -X PUT "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/web_domain" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d '{"slug":"scanner"}'
```

## Use your own domain
Use a subdomain you own, such as `pay.yourapp.com`. A CNAME cannot sit on a bare domain such as `yourapp.com` at most DNS providers.

1. In **Project settings → Domains**, enter the domain and click **Save domain**. Or with the API:

   ```bash
   curl -s -X PUT "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/web_domain" -H "Authorization: Bearer $SECRET_KEY" \
     -H "Content-Type: application/json" -d '{"custom_domain":"pay.yourapp.com"}'
   ```
   ```json
   {"object":"web_domain","slug":"scanner","custom_domain":"pay.yourapp.com","status":"pending","dns":[{"type":"CNAME","name":"pay.yourapp.com","value":"api.revenuedot.app"},{"type":"TXT","name":"_revenuedot.pay.yourapp.com","value":"revenuedot-verify=k3m9q2x7z1c4v8b6n0p5w2e7"}],"…":"…"}
   ```

2. Add the two records at your DNS provider, with the values from `dns`:

   | Type | Name | Value | Why |
   |---|---|---|---|
   | CNAME | `pay.yourapp.com` | the CNAME target shown (on Cloud today, `api.revenuedot.app`) | Sends the traffic to RevenueDot |
   | TXT | `_revenuedot.pay.yourapp.com` | `revenuedot-verify=<token>` | Proves you own the domain |

   With Cloudflare DNS, set the CNAME to **DNS only** (grey cloud).

3. Click **Verify**, or:

   ```bash
   curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/web_domain/actions/verify" -H "Authorization: Bearer $SECRET_KEY"
   ```

   RevenueDot reads both records through Cloudflare's DNS-over-HTTPS resolver. When both match, `status` becomes `verified`. Otherwise it is `failed`, and `error` says which record is wrong and what DNS answered, such as "The TXT record _revenuedot.pay.yourapp.com must be … and was not found". DNS changes can take a few minutes. You can check 6 times a minute.

Once verified, the project's pages answer at the root of your domain:
- Pages: `https://pay.yourapp.com/<page slug>`
- Redemption links: `https://pay.yourapp.com/r/<token>`
- The calls the pages make: `https://pay.yourapp.com/api/...`

The `url` of every link and funnel switches to the new domain. The default address keeps working too. Send `{"custom_domain":null}` to remove it.

The domain serves these pages and nothing else. The API, sign-in and OAuth answer 404 there, so no RevenueDot session or login page ever lives on a domain you control.

**One verified domain belongs to one project.** Another project can type the same domain, but only the project that adds its TXT record can verify it, and a claim that is not verified never blocks you. Once your domain is verified, no other project can verify it.

## On RevenueDot Cloud: TLS is added by hand for now
Browsers need a TLS certificate for `pay.yourapp.com`. RevenueDot Cloud serves custom domains through Cloudflare for SaaS, and **adding a verified domain there is a manual step for now**. After your domain shows as verified, the RevenueDot team adds it and Cloudflare issues the certificate once the CNAME resolves. Until then, `https://pay.yourapp.com` does not load: keep sharing the default address. The dashboard shows this note next to the domain.

The CNAME target on Cloud may change when this step is automated. Always use the value the dashboard shows.

## Self-hosted servers
Your server answers a verified domain itself. You need:
- **DNS** pointing the domain at your server. By default the CNAME target is the pay host (the host of `REVENUEDOT_PAY_URL`, else your server's host). Set `REVENUEDOT_CUSTOM_DOMAIN_TARGET` to tell customers a different host, for example a load balancer's name.
- **TLS** for the domain at your reverse proxy, for example with Caddy's on-demand TLS or a certificate from Let's Encrypt.
- **The request's host** passed through to RevenueDot: the `Host` header, or `X-Forwarded-Host`. RevenueDot picks the project by host.

The default `docker-compose.yml` passes `REVENUEDOT_PAY_URL` and `REVENUEDOT_CUSTOM_DOMAIN_TARGET` from your `.env` to the container. See [Self-hosting](self-hosting.md).

## Related
- [Sell on the web with Stripe](web-billing.md)
- [Purchase links](purchase-links.md), [Funnels](funnels.md), [Redemption links](redemption-links.md)
- [Extensions: Web billing](../../api/extensions.md#web-billing)
