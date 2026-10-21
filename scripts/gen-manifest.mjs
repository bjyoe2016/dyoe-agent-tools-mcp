// Dev-only: write manifest.json (MCPB bundle manifest, used by Smithery's stdio publishing and by
// Claude Desktop "Install extension") from package.json + catalog.json.
import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const cat = JSON.parse(fs.readFileSync("catalog.json", "utf8"));
const name = (p) => "dyoe_" + p.slice(1).replace(/[^a-z0-9]+/gi, "_").toLowerCase();
const manifest = {
  manifest_version: "0.3",
  name: pkg.name,
  display_name: "DYOE Trust Tools (x402)",
  version: pkg.version,
  description: pkg.description,
  long_description: "Each tool is one paid endpoint at agents.dyoeway.org, settled per call in USDC on Base via x402. " +
    "Without a wallet the server runs in free PREVIEW mode and returns the 402 payment requirements. With a dedicated, " +
    "low-balance wallet key it pays automatically, capped per call (default $0.10).",
  author: { name: "DYOE Way", url: "https://dyoeway.org" },
  repository: { type: "git", url: pkg.repository.url.replace(/^git\+/, "") },
  homepage: pkg.homepage,
  support: pkg.bugs.url,
  license: pkg.license,
  keywords: pkg.keywords,
  server: {
    type: "node",
    entry_point: "index.js",
    mcp_config: {
      command: "node",
      args: ["${__dirname}/index.js"],
      env: { WALLET_PRIVATE_KEY: "${user_config.wallet_private_key}", DYOE_MAX_PAYMENT_USD: "${user_config.max_payment_usd}" },
    },
  },
  tools: cat.routes.map((r) => ({ name: name(r.path), description: `${r.serviceName} (${r.price}). ${r.description}` })),
  user_config: {
    wallet_private_key: { type: "string", title: "Base wallet private key (optional)", sensitive: true, required: false, default: "",
      description: "A DEDICATED, low-balance Base wallet holding USDC. Leave empty for free preview mode (returns the 402 quote). Never use your main wallet." },
    max_payment_usd: { type: "number", title: "Max payment per call (USD)", required: false, default: 0.1, min: 0, max: 100,
      description: "Calls priced above this are refused locally. /review costs $15." },
  },
  compatibility: { platforms: ["darwin", "win32", "linux"], runtimes: { node: pkg.engines.node } },
};
fs.writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest.json: ${manifest.tools.length} tools`);
