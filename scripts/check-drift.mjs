// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: fails when api/openapi.yaml and the server's route files disagree (paths, methods, source files, field names).
// Docs: https://revenuedot.app/docs/api   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
//
// Usage: npm run check:drift                      (server checkout at ../revenuedot)
//        REVENUEDOT_SERVER_DIR=/path/to/revenuedot npm run check:drift
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVER = resolve(process.env.REVENUEDOT_SERVER_DIR ?? join(ROOT, "..", "revenuedot"));
const SRC = join(SERVER, "apps/server/src");
if (!existsSync(SRC)) {
  console.error(`Server source not found at ${SRC}. Clone https://github.com/revenuedot/revenuedot next to this repo or set REVENUEDOT_SERVER_DIR.`);
  process.exit(2);
}

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
});
// entry.node.ts only adds the dashboard fallback (`app.get("*")`) in Docker.
const files = walk(SRC).filter((f) => !f.endsWith("entry.node.ts"));
const text = new Map(files.map((f) => [relative(SRC, f), readFileSync(f, "utf8")]));

// ---- 1. Routes in the code ------------------------------------------------------------------------------------------
const globalConsts = new Map();
for (const src of text.values()) for (const m of src.matchAll(/export\s+const\s+([A-Z][A-Z0-9_]*)\s*=\s*"(\/[^"]*)"/g)) globalConsts.set(m[1], m[2]);

// Mounted routers: r.route("/prefix", someRoutes(deps)) prefixes every route of the file that defines someRoutes.
const definedIn = new Map();
for (const [file, src] of text) for (const m of src.matchAll(/export\s+function\s+(\w+)\s*\(/g)) definedIn.set(m[1], file);
const prefixOf = new Map();
for (const src of text.values()) {
  for (const m of src.matchAll(/\.route\(\s*"([^"]*)"\s*,\s*(\w+)\(/g)) {
    const file = definedIn.get(m[2]);
    if (file && m[1] !== "/") prefixOf.set(file, m[1].replace(/\/$/, ""));
  }
}

// Loop variables that expand a template (the archive/unarchive loops).
const LOOP_VALUES = { action: ["archive", "unarchive"] };

const norm = (p) => p.replace(/:[A-Za-z_]+/g, "{}").replace(/\{[^}]+\}/g, "{}");
const codeRoutes = new Map(); // "METHOD /path" -> Set(files)
for (const [file, src] of text) {
  const consts = new Map(globalConsts);
  for (const m of src.matchAll(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*"(\/[^"]*)"/g)) consts.set(m[1], m[2]);
  const calls = [
    ...[...src.matchAll(/\b(?:r|app)\.(get|post|delete|put|patch)\(\s*(`[^`]*`|"[^"]*"|[A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => [m[1], m[2]]),
    ...[...src.matchAll(/\bstoreAction\(\s*("[^"]*")/g)].map((m) => ["post", m[1]]),
  ];
  for (const [method, arg] of calls) {
    let paths;
    if (arg.startsWith('"')) paths = [arg.slice(1, -1)];
    else if (arg.startsWith("`")) {
      paths = [arg.slice(1, -1)];
      for (const [name, values] of Object.entries(LOOP_VALUES)) {
        if (paths[0].includes(`\${${name}}`)) paths = values.map((v) => paths[0].replaceAll(`\${${name}}`, v));
      }
      paths = paths.map((p) => p.replace(/\$\{(\w+)\}/g, (_, n) => {
        if (!consts.has(n)) throw new Error(`${file}: cannot resolve \${${n}} in ${arg}`);
        return consts.get(n);
      }));
    } else {
      if (!consts.has(arg)) continue; // a handler variable, not a path
      paths = [consts.get(arg)];
    }
    for (let p of paths) {
      if (p.includes("*")) continue;
      p = (prefixOf.get(file) ?? "") + p;
      const key = `${method.toUpperCase()} ${norm(p)}`;
      if (!codeRoutes.has(key)) codeRoutes.set(key, new Set());
      codeRoutes.get(key).add(file);
    }
  }
}

// ---- 2. Operations in the spec --------------------------------------------------------------------------------------
const spec = parse(readFileSync(join(ROOT, "api/openapi.yaml"), "utf8"));
const METHODS = ["get", "post", "put", "patch", "delete"];
const specOps = new Map();
for (const [path, item] of Object.entries(spec.paths)) {
  for (const m of METHODS) if (item[m]) specOps.set(`${m.toUpperCase()} ${norm(path)}`, { path, method: m, op: item[m], shared: item.parameters ?? [] });
}

const problems = [];
for (const key of codeRoutes.keys()) if (!specOps.has(key)) problems.push(`In the code but not in api/openapi.yaml: ${key} (${[...codeRoutes.get(key)].join(", ")})`);
for (const [key, { op }] of specOps) {
  if (!codeRoutes.has(key)) { problems.push(`In api/openapi.yaml but not in the code: ${key} (${op.operationId})`); continue; }
  const src = op["x-source"];
  if (!src) problems.push(`${op.operationId}: no x-source`);
  else if (!codeRoutes.get(key).has(src)) problems.push(`${op.operationId}: x-source is ${src}, but the route is defined in ${[...codeRoutes.get(key)].join(", ")}`);
}

// ---- 3. Field names exist in the code -------------------------------------------------------------------------------
const allCode = [...text.values(), ...walk(join(SERVER, "packages/core/src")).map((f) => readFileSync(f, "utf8"))].join("\n");
const has = (hay, word) => new RegExp(`(^|[^A-Za-z0-9_$])${word.replace(/[$]/g, "\\$")}([^A-Za-z0-9_]|$)`).test(hay);
const resolveRef = (s) => {
  let n = s;
  while (n?.$ref) n = n.$ref.split("/").slice(1).reduce((o, k) => o[k], spec);
  return n;
};
function propNames(schema, depth = 0, out = [], seen = new Set()) {
  const s = resolveRef(schema);
  if (!s || typeof s !== "object" || seen.has(s)) return out;
  seen.add(s);
  for (const [k, v] of Object.entries(s.properties ?? {})) { out.push({ name: k, depth }); propNames(v, depth + 1, out, seen); }
  for (const key of ["allOf", "oneOf", "anyOf"]) for (const x of s[key] ?? []) propNames(x, depth, out, seen);
  if (s.items) propNames(s.items, depth + 1, out, seen);
  if (s.additionalProperties && typeof s.additionalProperties === "object") propNames(s.additionalProperties, depth + 1, out, seen);
  return out;
}
let fieldsChecked = 0;
for (const { op, shared } of specOps.values()) {
  const own = text.get(op["x-source"]) ?? "";
  // Pagination and expand parameters are read by shared helpers in routes/v2/common.ts.
  const ownOrCommon = own + (text.get("routes/v2/common.ts") ?? "");
  const params = [...shared, ...(op.parameters ?? [])].map(resolveRef).filter((p) => p.in === "query");
  for (const p of params) {
    fieldsChecked++;
    if (!has(ownOrCommon, p.name)) problems.push(`${op.operationId}: query parameter "${p.name}" does not appear in ${op["x-source"]}`);
  }
  const schema = op.requestBody?.content?.["application/json"]?.schema;
  for (const { name, depth } of schema ? propNames(schema) : []) {
    fieldsChecked++;
    if (depth === 0 ? !has(own, name) : !has(allCode, name)) problems.push(`${op.operationId}: request field "${name}" does not appear in ${depth === 0 ? op["x-source"] : "the server code"}`);
  }
}
for (const [name, schema] of Object.entries(spec.components.schemas)) {
  for (const { name: field } of propNames(schema)) {
    fieldsChecked++;
    if (!has(allCode, field)) problems.push(`components.schemas.${name}: field "${field}" does not appear in the server code`);
  }
}
for (const [type, item] of Object.entries(spec.webhooks ?? {})) {
  if (!has(allCode, `"${type}"`.slice(1, -1))) problems.push(`webhooks.${type}: event type does not appear in the server code`);
  for (const { name } of propNames(item.post.requestBody.content["application/json"].schema)) {
    fieldsChecked++;
    if (!has(allCode, name)) problems.push(`webhooks.${type}: field "${name}" does not appear in the server code`);
  }
}

if (problems.length) {
  console.error(`Drift between api/openapi.yaml and ${SERVER}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`No drift: ${codeRoutes.size} routes in the code match ${specOps.size} operations in api/openapi.yaml; ${fieldsChecked} field names found in the code.`);
