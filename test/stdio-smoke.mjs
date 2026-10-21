// Free smoke test over real MCP stdio: list tools, check them against catalog.json, then make ONE
// unpaid call (/approve) and expect the 402 payment requirements. WALLET_PRIVATE_KEY is stripped
// from the child's env so nothing can be signed or paid.
import fs from "node:fs";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const catalog = JSON.parse(fs.readFileSync(new URL("../catalog.json", import.meta.url), "utf8"));
const env = { ...process.env }; delete env.WALLET_PRIVATE_KEY;
const transport = new StdioClientTransport({ command: process.execPath, args: [new URL("../index.js", import.meta.url).pathname], env, stderr: "pipe" });
const client = new Client({ name: "dyoe-smoke", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
assert.equal(tools.length, 22, `expected 22 tools, got ${tools.length}`);
for (const r of catalog.routes) {
  const name = "dyoe_" + r.path.slice(1).replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const t = tools.find((x) => x.name === name);
  assert.ok(t, `missing tool ${name}`);
  assert.ok(t.description.startsWith(r.description), `${name}: description differs from catalog`);
  assert.ok(t.title.includes(r.price), `${name}: title lacks price ${r.price}`);
  const req = Object.entries(r.query).filter(([, q]) => q.required).map(([k]) => k).sort();
  assert.deepEqual((t.inputSchema.required || []).slice().sort(), req, `${name}: required inputs differ`);
}
for (const t of tools) console.log(`  ${t.name.padEnd(22)} ${t.title}`);

const res = await client.callTool({ name: "dyoe_approve", arguments: { action: "pay invoice", counterparty: "stripe.com", amount: 250 } });
const out = JSON.parse(res.content[0].text);
assert.equal(out.payment_required, true, "unpaid call should return payment_required");
assert.equal(out.status, 402);
assert.equal(out.price_usd, 0.02, `/approve should quote $0.02, got ${out.price_usd}`);
console.log(`\nunpaid dyoe_approve -> HTTP ${out.status}, payment_required, quoted $${out.price_usd} on ${out.network}, x402Version ${out.x402Version}, payTo ${out.payTo}`);
await client.close();
console.log("stdio smoke: ok (22 tools match catalog.json; unpaid call returned 402; nothing paid)");
