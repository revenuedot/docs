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
const upload = (types, max) => body(obj({ filename: str(undefined, { minLength: 1, maxLength: 255 }), content_type: en(types), file_data_base64: str("Base64 file bytes.", { minLength: 1, maxLength: max }) }, ["filename", "content_type", "file_data_base64"]));

export const paywallPaths = {
  [`${P}/paywalls`]: {
    get: op({ id: "listPaywalls", tag: "Paywalls", summary: "List paywalls", security: SECRET, source: R, scopes: READ, parameters: [project, ...page, { name: "expand", in: "query", schema: arr(en(["items.offering"])), style: "form", explode: true }],
      responses: { 200: ok("A page of paywalls.", listOf(paywall)), ...E(400, 404) } }),
    post: op({ id: "createPaywall", tag: "Paywalls", summary: "Create a paywall", security: SECRET, source: R, scopes: WRITE, parameters: [project],
      description: "Either `{ offering_id }` for an empty paywall on that offering, or a full draft with `components_config` and `components_localizations`. An offering has at most one paywall. Nothing reaches the SDK until it is published.",
      requestBody: body({ anyOf: [obj({ offering_id: str(), automatically_scale_font_size: bool() }, ["offering_id"]), obj({ offering_id: nstr(), name: nstr(), components_config: anyObj, components_localizations: { type: "object", additionalProperties: anyObj }, default_locale: str(), automatically_scale_font_size: bool() }, ["components_config", "components_localizations"])] }, { offering_id: "ofrngm2u3h89blc" }),
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
      description: "The draft becomes what the SDK receives in `paywall_components` for the paywall's offering. Needs an offering and unpublished changes.", responses: { 200: ok("The paywall.", paywall, example), ...E(404, 422) } }),
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
    post: op({ id: "createPaywallVersion", tag: "Paywalls", summary: "Save a named snapshot", security: SECRET, source: R, scopes: WRITE, parameters: [project, pw],
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 255 }) }, ["name"]), { name: "Before the summer test" }), responses: { 201: ok("The snapshot.", versionOut), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/paywalls/{paywall_id}/versions/{version_id}`]: {
    get: op({ id: "getPaywallVersion", tag: "Paywalls", summary: "Get a snapshot", security: SECRET, source: R, scopes: READ, parameters: [project, pw, { name: "version_id", in: "path", required: true, schema: str() }],
      responses: { 200: ok("The snapshot.", versionOut), ...E(404) } }),
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
      description: "Public and cached for a year: object names are random and never change content. The SDK reads `asset_base_url` + object name.",
      responses: { 200: { description: "The file bytes with their content type." }, 404: ok("No such asset.", obj({ object: str(), type: str(), message: str() })) } }),
  },
};
