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
import { webhooks } from "./webhooks.mjs";

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
  ["Web Billing", "sdk-endpoints", "Web checkout calls from the iOS SDK and purchases-js. RevenueDot takes no web payments, so a checkout answers an error the SDK shows as a failed purchase."],
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
  ["Collaborators", "rest-v2", "Dashboard users of the project."],
  ["Dashboard auth", "extensions", "Sign-up, sign-in, password reset, email confirmation, invites and account settings for the dashboard. The session cookie also authorizes REST API v2."],
  ["Members and invites", "extensions", "Invite people to a project by email, change their role, remove them. Dashboard session only."],
  ["Project settings", "extensions", "Project name, transfer behaviour and deletion."],
  ["Store setup", "extensions", "Notification URLs, credential checks, setup health and App Store mass extensions."],
  ["API keys", "extensions", "Secret keys for the REST API."],
  ["Webhook deliveries", "extensions", "Delivery log, manual retry and test events."],
  ["Event log", "extensions", "Every recorded event and money movement."],
  ["Test Store", "extensions", "Simulated purchases and lifecycles for development."],
  ["Dashboard data", "extensions", "Series and rows the dashboard shows."],
  ["Migration import", "extensions", "Bulk import from RevenueCat, used by the `revenuedot import` CLI."],
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
    paths: { ...sdkPaths, ...v2Paths, ...v2MorePaths, ...paywallPaths, ...targetingPaths, ...chartPaths, ...extensionPaths },
    webhooks,
    components: { schemas, parameters, responses, securitySchemes },
    security: [{ secretApiKey: [] }],
    externalDocs: { description: "RevenueDot documentation", url: "https://github.com/revenuedot/docs" },
  };
}
