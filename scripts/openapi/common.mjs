// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: helpers and shared components for the OpenAPI document (api/openapi.yaml).
// Docs: https://revenuedot.app/docs/api   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
export const param = (name) => ({ $ref: `#/components/parameters/${name}` });
export const resp = (name) => ({ $ref: `#/components/responses/${name}` });

/** A JSON body or response with an optional example. */
export const json = (schema, example) => ({ content: { "application/json": { schema, ...(example !== undefined ? { example } : {}) } } });
export const ok = (description, schema, example) => ({ description, ...json(schema, example) });
export const body = (schema, example, required = true) => ({ required, ...json(schema, example) });

/** A list envelope of `item`. */
export const listOf = (item) => ({
  type: "object",
  required: ["object", "items", "next_page", "url"],
  properties: {
    object: { type: "string", const: "list" },
    items: { type: "array", items: item },
    next_page: { type: ["string", "null"], description: "Path of the next page, or null on the last page." },
    url: { type: "string", description: "Path of this list." },
  },
});

export const str = (description, extra = {}) => ({ type: "string", ...(description ? { description } : {}), ...extra });
export const nstr = (description, extra = {}) => ({ type: ["string", "null"], ...(description ? { description } : {}), ...extra });
export const int = (description, extra = {}) => ({ type: "integer", ...(description ? { description } : {}), ...extra });
export const nint = (description, extra = {}) => ({ type: ["integer", "null"], ...(description ? { description } : {}), ...extra });
export const num = (description, extra = {}) => ({ type: "number", ...(description ? { description } : {}), ...extra });
export const bool = (description, extra = {}) => ({ type: "boolean", ...(description ? { description } : {}), ...extra });
export const ms = (description) => ({ type: "integer", format: "int64", description: `${description} Epoch milliseconds.` });
export const nms = (description) => ({ type: ["integer", "null"], format: "int64", description: `${description} Epoch milliseconds, or null.` });
export const en = (values, description) => ({ type: "string", enum: values, ...(description ? { description } : {}) });
export const obj = (properties, required = [], extra = {}) => ({ type: "object", properties, ...(required.length ? { required } : {}), ...extra });
export const arr = (items, extra = {}) => ({ type: "array", items, ...extra });

/** Standard error responses for REST API v2 operations. */
export const v2Errors = (...codes) => Object.fromEntries(codes.map((c) => [String(c), resp(`V2Error${c}`)]));
/** Standard error responses for the SDK and REST v1 endpoints. */
export const v1Errors = (...codes) => Object.fromEntries(codes.map((c) => [String(c), resp(`V1Error${c}`)]));

export const SECRET = [{ secretApiKey: [] }, { dashboardSession: [] }];
export const SECRET_ONLY = [{ secretApiKey: [] }];
export const PUBLIC = [{ publicApiKey: [] }];
export const PUBLIC_OR_SECRET = [{ publicApiKey: [] }, { secretApiKey: [] }];
export const SESSION = [{ dashboardSession: [] }];
export const NONE = [];

/**
 * One operation. `source` is the server file that implements it: relative to apps/server/src for the core
 * (routes/v2/apps.ts), from the repo root for RevenueDot Enterprise (ee/server/orgs.ts). The drift check
 * reads it. `scopes` are the API v2 permissions the key needs. `extension` marks RevenueDot-only operations.
 */
export function op({ id, tag, summary, description, security, parameters, requestBody, responses, source, scopes, extension, deprecated }) {
  return {
    operationId: id,
    tags: [tag],
    summary,
    ...(description ? { description: description.trim() } : {}),
    ...(security ? { security } : {}),
    ...(parameters?.length ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    responses,
    ...(deprecated ? { deprecated: true } : {}),
    "x-source": source,
    ...(scopes ? { "x-scopes": scopes } : {}),
    ...(extension ? { "x-revenuedot-extension": true } : {}),
  };
}
