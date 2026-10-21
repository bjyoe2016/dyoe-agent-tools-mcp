// Dev-only (not published): regenerate catalog.json from the seller's catalog.js, which
// tests/catalog-consistency.test.mjs in the seller repo keeps equal to the live 402s.
// Usage: node scripts/sync-catalog.mjs /path/to/x402-sandbox
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repo = path.resolve(process.argv[2] || "../x402-live");
const { ROUTES, ORIGIN } = await import(pathToFileURL(path.join(repo, "catalog.js")).href);
const routes = ROUTES.map((r) => ({
  path: r.path, price: r.price, serviceName: r.serviceName, description: r.description, tags: r.tags,
  query: Object.fromEntries(Object.entries(r.query).map(([k, q]) => [k, { type: q.type, description: q.description, example: q.example, required: !!q.required }])),
}));
fs.writeFileSync("catalog.json", JSON.stringify({ origin: ORIGIN, generatedFrom: "catalog.js (seller repo)", generatedAt: new Date().toISOString().slice(0, 10), routes }, null, 2) + "\n");
console.log(`catalog.json: ${routes.length} tools from ${repo}`);
