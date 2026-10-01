// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: assembles the OpenAPI 3.1 document for the RevenueDot server (SDK endpoints, REST v1, REST v2, extensions, webhooks).
// Docs: https://revenuedot.app/docs/api   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { parameters, responses, schemas, securitySchemes } from "./components.mjs";
import { sdkPaths } from "./sdk.mjs";
import { extensionPaths, v2Paths } from "./v2.mjs";
import { v2MorePaths } from "./v2-more.mjs";
import { paywallPaths } from "./paywalls.mjs";
import { targetingPaths } from "./targeting.mjs";
import { chartPaths } from "./charts.mjs";
import { integrationPaths } from "./integrations.mjs";
import { webhooks } from "./webhooks.mjs";
import { v2RestPaths } from "./v2-rest.mjs";
import { lifecyclePaths } from "./lifecycle.mjs";
import { webPaths, webSchemas } from "./web.mjs";
import { adsPaths } from "./ads.mjs";
import { settingsPathsAll } from "./settings.mjs";

/**
 * Tags in reading order. `x-page` is the generated Markdown page (api/<page>.md) the tag's operations go to.
 */
export const TAGS = [
  ["Server", "sdk-endpoints", "Health and server info. No API key."],
  ["Customer info", "sdk-endpoints", "The customer's entitlements, subscriptions and one-time purchases, as the SDK decodes them into `CustomerInfo`."],
  ["Receipts", "sdk-endpoints", "Purchases, restores and syncs. RevenueDot verifies them with the store."],
  ["Offerings (SDK)", "sdk-endpoints", "What the paywall shows."],
  ["Identity", "sdk-endpoints", "`logIn` and aliases."],
  ["Attributes", "sdk-endpoints", "Customer attributes such as `$email`."],
  ["SDK support", "sdk-endpoints", "Endpoints the SDK calls for features RevenueDot answers minimally, so the SDK keeps working."],
  ["Web Billing", "sdk-endpoints", "Web checkout calls from the iOS SDK and purchases-js. The iOS SDK's paywall web checkout opens a Stripe Checkout on your own Stripe account ([web billing](../docs/guides/web-billing.md)). The purchases-js checkout for RevenueCat Billing (`rcb_` keys, Stripe Elements inside the SDK) is not available and answers an error the SDK shows as a failed purchase."],
  ["Subscriber tokens", "sdk-endpoints", "The SDK endpoints for one customer, authorized by a subscriber access token from `POST /v2/projects/{project_id}/apps/{app_id}/authenticate` instead of the app key. The RevenueCat SDKs call these paths in their internal token mode."],
  ["Auth sign-in", "sdk-endpoints", "Sign app users in with a Firebase or OpenID Connect ID token and get a subscriber access token for the `/v1/customer/*` paths, in the wire format of the RevenueCat SDKs' token login. See [Auth](../docs/guides/auth.md)."],
  ["Store notifications", "sdk-endpoints", "Where App Store Connect and Google Pub/Sub send server notifications."],
  ["Response signing", "sdk-endpoints", "Trusted Entitlements: the public key responses are signed with."],
  ["Customers (v1)", "rest-v1", "Secret-key customer operations."],
  ["Promotional entitlements (v1)", "rest-v1", "Grant and revoke access without a purchase."],
  ["Offering overrides (v1)", "rest-v1", "Show one customer a different offering."],
  ["Store actions (v1)", "rest-v1", "Refund, revoke, cancel, defer and extend through the store that sold the subscription."],
  ["Projects", "rest-v2", "Projects hold apps, the catalog, customers and webhooks."],
  ["Apps", "rest-v2", "One app per store, each with its public SDK key and store credentials."],
  ["Products", "rest-v2", "Store products."],
  ["Entitlements", "rest-v2", "The access your app checks, unlocked by products."],
  ["Offerings", "rest-v2", "Groups of packages the paywall shows."],
  ["Packages", "rest-v2", "One choice on the paywall, with one product per app."],
  ["Customers", "rest-v2", "Customers, their attributes, entitlements, subscriptions, purchases and events."],
  ["Subscriptions", "rest-v2", "Subscriptions across customers, and store actions on them."],
  ["Purchases", "rest-v2", "One-time purchases across customers."],
  ["Metrics", "rest-v2", "The dashboard overview numbers and revenue totals."],
  ["Charts", "rest-v2", "Every built-in chart (revenue, MRR, subscriptions, trials, conversion, LTV, churn, refunds, paywalls, ads) with RevenueCat's definitions."],
  ["In-app currencies", "rest-v2", "Currencies your app sells or rewards, their product grants and each customer's balance."],
  ["Audit log", "rest-v2", "Who changed what in a project."],
  ["Targeting", "rest-v2", "Audiences, and rules that pick the offering and placement offerings for each customer."],
  ["Experiments", "rest-v2", "Offering A/B tests and their results."],
  ["Paywalls", "rest-v2", "Paywall components the SDK renders, their publishing and versions, and the images and fonts they use."],
  ["Webhook integrations", "rest-v2", "Where events are sent."],
  ["Discounts", "rest-v2", "Web discounts for RevenueDot's web checkout, with RevenueCat's v2 discount operations and shapes. Each discount is a Stripe coupon and each code a Stripe promotion code in your own Stripe account. See [Web discounts](../docs/guides/web-discounts.md)."],
  ["Invoices", "rest-v2", "RevenueCat Billing invoices. Stripe issues the invoices for RevenueDot's web checkout, so these answer on purpose: the list is empty and a file is 404."],
  ["Collaborators", "rest-v2", "Dashboard users of the project."],
  ["Dashboard auth", "extensions", "Sign-up, sign-in, password reset, email confirmation, invites and account settings for the dashboard. The session cookie also authorizes REST API v2."],
  ["Members and invites", "extensions", "Invite people to a project by email, change their role, remove them. Dashboard session only."],
  ["Project settings", "extensions", "Project name, transfer behaviour, sandbox testing access, ownership and deletion. See [Project settings](../docs/guides/project-settings.md)."],
  ["Brand", "extensions", "Colour and gradient presets for the paywall editor and the SDKs' named colours."],
  ["Blocked customers", "extensions", "App user ids that lose access to paid features on every platform."],
  ["Verified Metrics", "extensions", "A public page with a project's aggregate production numbers, its settings, image and JSON."],
  ["Auth", "extensions", "Identity providers for Auth (Firebase, OpenID Connect), the project switch, a token tester, and signed-in identities with their balances for your backend. See [Auth](../docs/guides/auth.md)."],
  ["Store setup", "extensions", "Notification URLs, credential checks, setup health and App Store mass extensions."],
  ["API keys", "extensions", "Secret keys for the REST API."],
  ["Webhook deliveries", "extensions", "Delivery log, manual retry and test events."],
  ["Integrations", "extensions", "Every tool of RevenueCat's integration catalogue plus BigQuery: 32 that receive events, and the AdMob, Apple Search Ads, Intercom inbox and Zendesk connections: the catalogue, connect, test, the delivery log, retry and replay. See [Integrations](../docs/guides/integrations.md)."],
  ["Ads", "extensions", "The Ads Overview (ad revenue, impressions, eCPM and breakdowns from the SDK's ad events), rewarded ads verified on the server (AdMob's callback, reward rules, the rewards ledger, test rewards), the AdMob connection and Apple Search Ads campaign reporting. See [Ads](../docs/guides/ads.md)."],
  ["Data exports", "extensions", "Scheduled CSV or Parquet files of transactions, customers, subscriptions and events in Amazon S3, Cloudflare R2 or Google Cloud Storage."],
  ["Refund Control", "extensions", "Policies that answer Apple's refund requests with consumption information, the refund request log and its cards."],
  ["Retention", "extensions", "Customer Center cancel and refund offers, and Apple's Retention Messaging API (messages, defaults, the real-time call)."],
  ["Support", "extensions", "Customer Center tickets, the customer summary for help desk sidebars, and the Intercom inbox app's Canvas Kit endpoint. See [Support](../docs/guides/support-integrations.md)."],
  ["Win-back", "extensions", "Campaigns that email churned subscribers an offer, with tracked links and one-click unsubscribe."],
  ["Customer lists", "extensions", "Built-in customer lists, saved audiences, filters, summary cards and CSV export."],
  ["Event log", "extensions", "Every recorded event and money movement."],
  ["Test Store", "extensions", "Simulated purchases and lifecycles for development."],
  ["Dashboard data", "extensions", "Series and rows the dashboard shows."],
  ["Migration import", "extensions", "Bulk import from RevenueCat, used by the `revenuedot import` CLI."],
  ["Web billing", "extensions", "Sell on the web through your own Stripe account: web providers and the setup checklist, the web config (checkout look, success page, deep link scheme), web products created in Stripe, web discounts with RevenueDot's extra settings, and the project's web address and custom domain. See [Sell on the web with Stripe](../docs/guides/web-billing.md)."],
  ["Purchase links", "extensions", "A hosted checkout page for one offering. See [Purchase links](../docs/guides/purchase-links.md)."],
  ["Funnels", "extensions", "Multi-step web-to-app funnels: quiz, info, email, paywall and success steps, publishing, analytics and Build with AI. See [Funnels](../docs/guides/funnels.md)."],
  ["Hosted pages", "extensions", "The public pages RevenueDot serves for purchase links, funnels and redemption links, and the three calls those pages make. No API key. They live under `/pay` on the API host, at the root of `REVENUEDOT_PAY_URL` when it is a host of its own, and at the root of a verified custom domain."],
  ["OAuth for MCP clients", "extensions", "OAuth 2.1 with PKCE so MCP clients can connect to one project without copying a key."],
  ["Webhook events", "webhook-events", "What RevenueDot POSTs to your webhook URL."],
];

const tags = () => TAGS.map(([name, page, description]) => ({ name, description, "x-page": page }));

export function buildDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "RevenueDot API",
      version: "0.1.0",
      summary: "Open-source, self-hostable backend for in-app purchases that works with the RevenueCat SDK.",
      description: [
        "RevenueDot is an open-source (AGPL-3.0), self-hostable backend for in-app purchases and subscriptions that works with the RevenueCat SDK.",
        "One server answers four APIs: the SDK endpoints the RevenueCat SDKs call (`/v1`, public app keys), REST API v1 (`/v1`, secret keys), REST API v2 (`/v2`, secret keys or a dashboard session) with RevenueDot extensions, and store notification endpoints.",
        "Paths, fields and error formats follow RevenueCat's public API so existing SDKs, backends and scripts keep working. Operations marked `x-revenuedot-extension` exist only in RevenueDot.",
        "RevenueDot is not affiliated with RevenueCat, Inc. Docs: https://revenuedot.app/docs",
      ].join("\n\n"),
      license: { name: "AGPL-3.0 (server); this document CC BY 4.0", identifier: "AGPL-3.0-only" },
      contact: { name: "RevenueDot", url: "https://github.com/revenuedot/revenuedot" },
    },
    servers: [
      { url: "https://api.revenuedot.app", description: "RevenueDot Cloud" },
      { url: "http://localhost:8787", description: "A local RevenueDot (docker compose up)" },
      { url: "https://{host}", description: "Your self-hosted RevenueDot", variables: { host: { default: "revenuedot.example.com" } } },
    ],
    tags: tags(),
    paths: { ...sdkPaths, ...v2Paths, ...v2MorePaths, ...v2RestPaths, ...paywallPaths, ...targetingPaths, ...chartPaths, ...integrationPaths, ...adsPaths, ...lifecyclePaths, ...webPaths, ...settingsPathsAll, ...extensionPaths },
    webhooks,
    components: { schemas: { ...schemas, ...webSchemas }, parameters, responses, securitySchemes },
    security: [{ secretApiKey: [] }],
    externalDocs: { description: "RevenueDot documentation", url: "https://github.com/revenuedot/docs" },
  };
}
