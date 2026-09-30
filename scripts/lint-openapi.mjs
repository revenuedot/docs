// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: validates api/openapi.yaml with two independent validators (Redocly lint and swagger-parser). Run: npm run lint:openapi
// Docs: https://revenuedot.app/docs/api   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";

const spec = fileURLToPath(new URL("../api/openapi.yaml", import.meta.url));
const config = fileURLToPath(new URL("./redocly.yaml", import.meta.url));
let failed = false;

try {
  const api = await SwaggerParser.validate(spec);
  console.log(`swagger-parser: valid OpenAPI ${api.openapi} (${Object.keys(api.paths).length} paths).`);
} catch (e) {
  failed = true;
  console.error(`swagger-parser: ${e.message}`);
}

const r = spawnSync("npx", ["--no-install", "redocly", "lint", spec, "--config", config, "--format", "stylish"], { encoding: "utf8" });
process.stdout.write(r.stdout);
process.stderr.write(r.stderr);
if (r.status !== 0) failed = true;

process.exit(failed ? 1 : 0);
