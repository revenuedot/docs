// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: paywalls (components), publishing, versions, media assets, fonts and the public asset URLs in the OpenAPI document.
// Docs: https://revenuedot.app/docs/api/rest-v2   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, ms, nms, nstr, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const R = "routes/v2/paywalls.ts";
const READ = ["project_configuration:offerings:read"];
const WRITE = ["project_configuration:offerings:read_write"];
const pw = { name: "paywall_id", in: "path", required: true, schema: str(), description: "Paywall id (pw...)." };
const anyObj = { type: "object", additionalProperties: true };
const nObj = { type: ["object", "null"], additionalProperties: true };

const version = obj({
  revision: { type: ["integer", "null"] }, components_config: nObj, default_locale: nstr(), components_localizations: { type: "object", additionalProperties: anyObj },
  automatically_scale_font_size: bool(), state_declarations: nObj,
}, ["revision", "components_config", "default_locale", "components_localizations", "automatically_scale_font_size", "state_declarations"]);
const paywall = obj({
  object: en(["paywall"]), id: str(), name: nstr(), offering_id: nstr("The offering whose SDK response carries this paywall."), created_at: ms("When it was created."),
  published_at: nms("When the current published version went live."), automatically_scale_font_size: bool(), revision: int("Bumps on every draft write; send it back to update."),
  offering: { ...ref("Offering"), description: "With `expand=offering`." }, components: { ...obj({ published: { oneOf: [version, { type: "null" }] }, draft: { oneOf: [version, { type: "null" }] } }), description: "With `expand=components`. `draft` is null when nothing changed since publishing." },
}, ["object", "id", "name", "offering_id", "created_at", "published_at", "automatically_scale_font_size", "revision"]);
const example = { object: "paywall", id: "pw1a2b3c4d5e6f7g8", name: "Go Pro", offering_id: "ofrngm2u3h89blc", created_at: 1790800901115, published_at: 1790801342625, automatically_scale_font_size: true, revision: 3 };
const versionOut = obj({ object: en(["paywall_version"]), id: str(), name: str(), revision: int(), created_at: ms("When it was taken."), components_config: nObj, components_localizations: nObj, default_locale: nstr(), automatically_scale_font_size: bool(), exit_offers: nObj, state_declarations: nObj, play_store_product_change_mode: nObj },
  ["object", "id", "name", "revision", "created_at", "components_config", "components_localizations", "default_locale", "automatically_scale_font_size", "exit_offers", "state_declarations", "play_store_product_change_mode"]);
const media = obj({
  object: en(["media_asset"]), id: str(), object_name: str("Append to `asset_base_url` to download it."), original_name: str(), original_size: int("Kilobytes."), original_width: { type: ["integer", "null"] }, original_height: { type: ["integer", "null"] },
  formats: nObj, alt_text: nstr(), is_decorative: bool(), asset_base_url: nstr(), asset_type: en(["image", "video"]), video_metadata: nObj, transcoding_status: nstr(),
}, ["object", "id", "object_name", "original_name", "original_size", "original_width", "original_height", "formats", "alt_text", "is_decorative", "asset_base_url", "asset_type", "video_metadata", "transcoding_status"]);
const font = obj({ object: en(["font"]), id: str(), name: str("PostScript name."), family_name: str(), style: en(["normal", "italic"]), weight: int(), url: str(), font_key: str("Use it in a paywall's `font_name`; the SDK finds the file through `ui_config.app.fonts`.") },
  ["object", "id", "name", "family_name", "style", "weight", "url", "font_key"]);
const templateOptions = obj({
  app_name: str(undefined, { maxLength: 80 }), accent_color: str("Hex colour."), background_color: str("Hex colour."), text_color: str("Hex colour."),
  terms_url: str(), privacy_url: str(), image_url: str("Hero image (feature_hero), for example a media asset URL."), image_width: int(), image_height: int(),
  locale: str("Locale of the strings, default en_US."),
});
const template = obj({
  object: en(["paywall_template"]), id: str(), name: str(), description: str(), screens: int("Pages before the plans: 1, or more for swipeable pages."),
  purchase_method: en(["in_app", "web"]), packages: int("Packages the layout shows."), tiers: int(), tags: arr(str()), evidence: str("The measured result the layout is built on."),
}, ["object", "id", "name", "description", "screens", "purchase_method", "packages", "tiers", "tags", "evidence"]);
const issue = obj({ path: str("JSON path, such as components_config.base.stack.components[2].font_weight."), message: str(), component_id: str("The component the problem is in.") }, ["path", "message"]);
const docProps = { components_config: anyObj, components_localizations: { type: "object", additionalProperties: anyObj }, default_locale: str() };
const upload = (types, max) => body(obj({ filename: str(undefined, { minLength: 1, maxLength: 255 }), content_type: en(types), file_data_base64: str("Base64 file bytes.", { minLength: 1, maxLength: max }) }, ["filename", "content_type", "file_data_base64"]));

export const paywallPaths = {
  [`${P}/paywalls`]: {
    get: op({ id: "listPaywalls", tag: "Paywalls", summary: "List paywalls", security: SECRET, source: R, scopes: READ, parameters: [project, ...page, { name: "expand", in: "query", schema: arr(en(["items.offering"])), style: "form", explode: true }],
      responses: { 200: ok("A page of paywalls.", listOf(paywall)), ...E(400, 404) } }),
    post: op({ id: "createPaywall", tag: "Paywalls", summary: "Create a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project],
      description: "Either `{ offering_id }` for an empty paywall on that offering, a full draft with `components_config` and `components_localizations`, or (RevenueDot extension) `{ template_id }` for a gallery template built with the offering's packages (see `GET /paywall_templates`). An offering has at most one paywall. Nothing reaches the SDK until it is published.",
      requestBody: body({ anyOf: [
        obj({ offering_id: str(), automatically_scale_font_size: bool() }, ["offering_id"]),
        obj({ offering_id: nstr(), name: nstr(), components_config: anyObj, components_localizations: { type: "object", additionalProperties: anyObj }, default_locale: str(), automatically_scale_font_size: bool() }, ["components_config", "components_localizations"]),
        obj({ offering_id: nstr(), name: nstr(), template_id: str("A gallery template id, such as trial_timeline."), template_options: templateOptions }, ["template_id"]),
      ] }, { offering_id: "ofrngm2u3h89blc", template_id: "trial_timeline", template_options: { app_name: "Scanner", accent_color: "#2563eb", terms_url: "https://example.com/terms", privacy_url: "https://example.com/privacy" } }),
      responses: { 201: ok("The paywall.", paywall, example), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/paywalls/{paywall_id}`]: {
    get: op({ id: "getPaywall", tag: "Paywalls", summary: "Get a paywall", security: SECRET, source: R, scopes: READ, parameters: [project, pw, { name: "expand", in: "query", schema: arr(en(["offering", "components"])), style: "form", explode: true }],
      responses: { 200: ok("The paywall.", paywall, example), ...E(400, 404) } }),
    patch: op({ id: "updatePaywall", tag: "Paywalls", summary: "Update a paywall's draft", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      description: "Send the `revision` you read. A different revision answers 409 so two editors never overwrite each other. The draft starts from the published version when there are no unpublished changes.",
      requestBody: body(obj({ revision: int(), components_config: anyObj, components_localizations: { type: "object", additionalProperties: anyObj }, default_locale: str(), offering_id: nstr(), name: nstr(), automatically_scale_font_size: bool(), exit_offers: nObj, state_declarations: nObj, play_store_product_change_mode: nObj }, ["revision"]), { revision: 3, components_localizations: { en_US: { headline: "Go Pro" } } }),
      responses: { 200: ok("The paywall.", paywall, example), ...v2Errors(400, 401, 403, 404, 409) } }),
    delete: op({ id: "deletePaywall", tag: "Paywalls", summary: "Delete a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      responses: { 200: ok("Deleted.", ref("Deleted"), { object: "paywall", id: "pw1a2b3c4d5e6f7g8", deleted_at: 1790801342625 }), ...E(404) } }),
  },
  [`${P}/paywalls/{paywall_id}/actions/publish`]: {
    post: op({ id: "publishPaywall", tag: "Paywalls", summary: "Publish a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      description: "The draft becomes what the SDK receives in `paywall_components` for the paywall's offering (and as a workflow in remote config). Needs an offering and unpublished changes, and the components must decode in the SDKs: otherwise 422 names the first problem (`POST /paywalls/validate` lists all). Locales missing a string are served the default locale's.", responses: { 200: ok("The paywall.", paywall, example), ...E(404, 422) } }),
  },
  [`${P}/paywalls/{paywall_id}/actions/unpublish`]: {
    post: op({ id: "unpublishPaywall", tag: "Paywalls", summary: "Unpublish a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      description: "The SDK stops receiving it. The content is kept as the draft.", responses: { 200: ok("The paywall.", paywall, example), ...E(404, 422) } }),
  },
  [`${P}/paywalls/{paywall_id}/actions/attach_offering`]: {
    post: op({ id: "attachPaywallOffering", tag: "Paywalls", summary: "Attach an offering to a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      requestBody: body(obj({ offering_id: str() }, ["offering_id"]), { offering_id: "ofrngm2u3h89blc" }), responses: { 200: ok("The paywall.", paywall, example), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/paywalls/{paywall_id}/actions/detach_offering`]: {
    post: op({ id: "detachPaywallOffering", tag: "Paywalls", summary: "Detach the offering from a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw], responses: { 200: ok("The paywall.", paywall, example), ...E(404) } }),
  },
  [`${P}/paywalls/{paywall_id}/actions/duplicate`]: {
    post: op({ id: "duplicatePaywall", tag: "Paywalls", summary: "Duplicate a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      description: "Copies the draft (default) or the published version into a new unpublished paywall, optionally on a new offering.",
      requestBody: body(obj({ name: str(), source_version: en(["draft", "published"]), offering: obj({ lookup_key: str(), display_name: str() }, ["lookup_key", "display_name"]) }), { source_version: "published", offering: { lookup_key: "summer", display_name: "Summer sale" } }, false),
      responses: { 201: ok("The new paywall.", paywall), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/paywalls/{paywall_id}/versions`]: {
    get: op({ id: "listPaywallVersions", tag: "Paywalls", summary: "List saved snapshots", security: SECRET, source: R, extension: true, scopes: READ, parameters: [project, pw, ...page],
      responses: { 200: ok("A page of snapshots (without their content).", listOf(obj({ object: en(["paywall_version"]), id: str(), name: str(), revision: int(), created_at: ms("When it was taken.") }, ["object", "id", "name", "revision", "created_at"]))), ...E(400, 404) } }),
    post: op({ id: "createPaywallVersion", tag: "Paywalls", summary: "Save a named snapshot", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 255 }) }, ["name"]), { name: "Before the summer test" }), responses: { 201: ok("The snapshot.", versionOut), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/paywalls/{paywall_id}/versions/{version_id}/actions/restore`]: {
    post: op({ id: "restorePaywallVersion", tag: "Paywalls", summary: "Restore a snapshot into the draft", security: SECRET, source: R, extension: true, scopes: WRITE, parameters: [project, pw, { name: "version_id", in: "path", required: true, schema: str() }],
      description: "The snapshot becomes the draft (the revision bumps). Publish to send it to apps.", responses: { 200: ok("The paywall with `components`.", paywall), ...E(404) } }),
  },
  [`${P}/paywalls/{paywall_id}/versions/{version_id}`]: {
    get: op({ id: "getPaywallVersion", tag: "Paywalls", summary: "Get a snapshot", security: SECRET, source: R, scopes: READ, parameters: [project, pw, { name: "version_id", in: "path", required: true, schema: str() }],
      responses: { 200: ok("The snapshot.", versionOut), ...E(404) } }),
  },
  [`${P}/paywalls/{paywall_id}/template`]: {
    get: op({ id: "getPaywallTemplate", tag: "Paywalls", summary: "Get the template form of a paywall", security: SECRET, source: R, extension: true, scopes: READ, parameters: [project, pw],
      description: "The dashboard's template form (headline, features, colours, package labels) that produced the draft, so the editor can reopen it. Null for paywalls made another way.",
      responses: { 200: ok("The form.", obj({ object: en(["paywall_template"]), paywall_id: str(), template: nObj }, ["object", "paywall_id", "template"])), ...E(404) } }),
    put: op({ id: "setPaywallTemplate", tag: "Paywalls", summary: "Store the template form of a paywall", security: SECRET, source: R, extension: true, scopes: WRITE, parameters: [project, pw],
      requestBody: body(obj({ template: nObj }, ["template"]), { template: { template: "classic", headline: "Unlock everything" } }),
      responses: { 200: ok("The form.", obj({ object: en(["paywall_template"]), paywall_id: str(), template: nObj }, ["object", "paywall_id", "template"])), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/paywall_templates`]: {
    get: op({ id: "listPaywallTemplates", tag: "Paywalls", summary: "List the template gallery", security: SECRET, source: R, extension: true, scopes: READ, parameters: [project],
      description: "The ten gallery layouts with the fields the dashboard filters on. Create a paywall from one with `POST /paywalls` and `template_id`. `icon_base_url` is where the built-in icons are served.",
      responses: { 200: ok("The templates.", obj({ object: en(["list"]), items: arr(template), next_page: nstr(), url: str(), icon_base_url: str() }, ["object", "items", "icon_base_url"])), ...E(404) } }),
  },
  [`${P}/paywalls/validate`]: {
    post: op({ id: "validatePaywall", tag: "Paywalls", summary: "Validate paywall components", security: SECRET, source: R, extension: true, scopes: READ, parameters: [project],
      description: "Checks components JSON the way the SDKs decode it, without saving: `errors` stop publishing (the SDK would fail or render it wrong), `warnings` do not. With `repair: true` it first fills missing required fields and inline texts (the same repair as the AI generator) and returns the repaired JSON and what it fixed. With `offering_id`, packages are checked against the offering.",
      requestBody: body(obj({ ...docProps, offering_id: nstr(), repair: bool() }, ["components_config", "components_localizations"]), { components_config: { base: { stack: { type: "stack", components: [{ type: "text", text: "Go Pro" }] } } }, components_localizations: {}, repair: true }),
      responses: { 200: ok("The result.", obj({ object: en(["paywall_validation"]), valid: bool(), errors: arr(issue), warnings: arr(issue), fixes: arr(str()), ...docProps }, ["object", "valid", "errors", "warnings"])), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/paywalls/ai`]: {
    get: op({ id: "getPaywallAi", tag: "Paywalls", summary: "Whether the AI generator is available", security: SECRET, source: R, extension: true, scopes: READ, parameters: [project],
      description: "RevenueDot Cloud uses GPT-6 Luna through the Vercel AI Gateway. A self-hosted server needs AI_GATEWAY_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY; without one, `available` is false.",
      responses: { 200: ok("The generator.", obj({ object: en(["paywall_ai"]), available: bool(), provider: nstr(), model: nstr(), max_prompt_length: int() }, ["object", "available", "provider", "model", "max_prompt_length"])), ...E(404) } }),
  },
  [`${P}/paywalls/generate`]: {
    post: op({ id: "generatePaywall", tag: "Paywalls", summary: "Generate a paywall with AI", security: SECRET, source: R, extension: true, scopes: WRITE, parameters: [project],
      description: "Designs a paywall with the language model and returns it without saving. The model first reads the prompt into a brief (plans, trial, benefits, look), then designs the paywall; a checker holds the design to the brief and sends problems back for up to two fixes. The result always passes validation. Save it with `POST /paywalls`. One generation every 5 seconds and 60 a day per project.",
      requestBody: body(obj({ prompt: str(undefined, { minLength: 3, maxLength: 2000 }), app_name: str(), brand_colors: arr(str()), offering_id: nstr(), locale: str() }, ["prompt"]), { prompt: "A calm sleep app, explain the 7-day trial, yearly first", app_name: "Calm", brand_colors: ["#0f766e"], offering_id: "ofrngm2u3h89blc" }),
      responses: { 200: ok("A paywall draft.", obj({
        object: en(["paywall_generation"]), name: nstr(), ...docProps,
        fixes: arr(str("What was changed automatically or in a fix round.")),
        warnings: arr(obj({ code: str(), severity: en(["error", "warning"]), message: str() }, ["code", "severity", "message"]), { description: "What the checker still flags in the result." }),
        notes: arr(str(), { description: "Notes for the developer, such as setting up the free trial in the stores." }),
        preview_trials: { type: "object", additionalProperties: { type: "string" }, description: "Packages that have the free trial the prompt asks for, with its ISO 8601 length (P7D)." },
        steps: arr(obj({ id: en(["brief", "packages", "draft", "check", "fix", "translate"]), status: en(["done", "skipped", "error"]), detail: nstr() }, ["id", "status", "detail"]), { description: "The steps the designer ran." }),
        provider: str("The provider that answered, e.g. Vercel AI Gateway."), model: str("The model that answered, e.g. openai/gpt-6-luna."),
      }, ["object", "components_config", "components_localizations", "default_locale", "fixes", "warnings", "notes", "preview_trials", "steps", "provider", "model"])), ...v2Errors(400, 401, 403, 404, 429, 502, 503) } }),
  },
  [`${P}/media_assets`]: {
    get: op({ id: "listMediaAssets", tag: "Paywalls", summary: "List images", security: SECRET, source: R, scopes: READ, parameters: [project, ...page], responses: { 200: ok("A page of images.", listOf(media)), ...E(400, 404) } }),
    post: op({ id: "createMediaAsset", tag: "Paywalls", summary: "Upload an image", security: SECRET, source: R, scopes: WRITE, parameters: [project],
      description: "Up to about 2 MB. Width and height are read from PNG, JPEG and WebP files. A project holds up to 200 assets.",
      requestBody: upload(["image/jpeg", "image/png", "image/avif", "image/heic", "image/heif", "image/webp"], 2796204), responses: { 201: ok("The image.", media), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/fonts`]: {
    get: op({ id: "listFonts", tag: "Paywalls", summary: "List fonts", security: SECRET, source: R, scopes: READ, parameters: [project, ...page], responses: { 200: ok("A page of fonts.", listOf(font)), ...E(400, 404) } }),
    post: op({ id: "createFont", tag: "Paywalls", summary: "Upload a font", security: SECRET, source: R, scopes: WRITE, parameters: [project],
      description: "A .ttf or .otf file. Its PostScript name, family, style and weight are read from the file.", requestBody: upload(["font/ttf", "font/otf"], 6990508), responses: { 201: ok("The font.", font), ...v2Errors(400, 401, 403, 404) } }),
  },
  "/assets/{project_id}/{object_name}": {
    get: op({ id: "getAsset", tag: "Paywalls", summary: "Download a paywall image or font", security: NONE, source: "routes/assets.ts",
      parameters: [project, { name: "object_name", in: "path", required: true, schema: str() }],
      description: "Public and cached for a year (`Cache-Control: immutable`, a strong `ETag`, 304 on `If-None-Match`): object names are random and never change content. The SDK reads `asset_base_url` + object name. On Cloud repeat downloads come from Cloudflare's edge cache.",
      responses: { 200: { description: "The file bytes with their content type." }, 404: ok("No such asset.", obj({ object: str(), type: str(), message: str() })) } }),
  },
  "/assets/icons/{file}": {
    get: op({ id: "getPaywallIcon", tag: "Paywalls", summary: "Download a built-in paywall icon", security: NONE, source: "routes/assets.ts", extension: true,
      parameters: [{ name: "file", in: "path", required: true, schema: str(), description: "`{name}.png` (96 × 96, white on transparent; the SDKs tint it), `.heic` and `.webp` names serve the same PNG, or `{name}.svg`." }],
      description: "The icons that icon and timeline components use (`base_url` + `formats.heic`). Cached for a year.",
      responses: { 200: { description: "The image." }, 404: ok("No such icon.", obj({ object: str(), type: str(), message: str() })) } }),
  },
};
