#!/usr/bin/env node
// DYOE Agent Tools — MCP server.
// Exposes the DYOE x402 tool shelf (trust, due-diligence, commerce & data) to any
// MCP-capable agent (Claude, Cursor, etc.). Each call pays the tool's x402 price in
// USDC on Base, automatically, from a wallet the OPERATOR supplies (WALLET_PRIVATE_KEY).
//
// SECURITY: the wallet key never leaves your machine — this server runs locally (stdio)
// and signs payments client-side. Use a dedicated, low-balance Base "burner" wallet.
// With no key set, the server still runs in FREE/PREVIEW mode (returns the 402 quote).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { wrapFetchWithPayment } from "x402-fetch";
import { privateKeyToAccount } from "viem/accounts";

const BASE = process.env.DYOE_BASE_URL || "https://agents.dyoeway.org";
const KEY = process.env.WALLET_PRIVATE_KEY; // funded, low-balance Base burner wallet
const payFetch = KEY ? wrapFetchWithPayment(fetch, privateKeyToAccount(KEY)) : fetch;

async function call(path) {
  try {
    const res = await payFetch(`${BASE}${path}`, { method: "GET" });
    const data = await res.json();
    if (res.status === 402 && !KEY) {
      return { content: [{ type: "text", text:
        "PREVIEW (no wallet configured). This tool costs USDC on Base via x402.\n" +
        "Set WALLET_PRIVATE_KEY (a funded, low-balance Base burner wallet) to call it for real.\n\n" +
        "402 quote:\n" + JSON.stringify(data, null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error calling ${path}: ${err.message || err}` }], isError: true };
  }
}

const q = (o) => Object.entries(o).filter(([, v]) => v != null && v !== "")
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

// The DYOE shelf — descriptions lead with what agents search; prices stated per call.
const TOOLS = [
  { name: "trust_check", title: "Trust Check ($0.01)",
    desc: "Is this counterparty safe? Scam, fraud, phishing & rug-risk check before an agent trusts or pays any website, business, wallet, or endpoint. Returns verdict (safe/caution/avoid), trust_score, domain age & red_flags. The trust tollbooth of the agent economy. Costs $0.01 USDC on Base.",
    input: { target: z.string().describe("Domain/URL/wallet to verify, e.g. example.com") },
    path: (a) => `/verify?${q({ target: a.target })}` },
  { name: "guardian_approve", title: "Guardian — Human-Verified Approval ($3.00)",
    desc: "HUMAN-VERIFIED approval for an agent action. Before an agent pays, signs, or acts for its human, a REAL PERSON signs off when it matters (plus automated trust + policy). Returns approved / pending_human / denied. The human-in-the-loop accountability layer agents can't get anywhere else. Costs $3.00 USDC on Base.",
    input: { action: z.string().describe("What the agent wants to do"),
             counterparty: z.string().describe("Domain/entity involved"),
             amount: z.string().optional().describe("USD amount, if any") },
    path: (a) => `/approve?${q({ action: a.action, counterparty: a.counterparty, amount: a.amount })}` },
  { name: "intel_dossier", title: "Intel Dossier ($0.10)",
    desc: "Full due-diligence dossier on any company or website in ONE call: what they do, legitimacy + trust verdict, domain age, contacts, social presence, scam red flags. Counterparty research & background checks for agents — one call instead of ten. Costs $0.10 USDC on Base.",
    input: { target: z.string().describe("Company domain to research, e.g. stripe.com") },
    path: (a) => `/intel?${q({ target: a.target })}` },
  { name: "site_audit", title: "Site Audit ($0.05)",
    desc: "Is this website legit and trustworthy? Full trust + SEO + contactability audit scored 0-100 with a legitimacy verdict and prioritized fixes. Due diligence in one call. Costs $0.05 USDC on Base.",
    input: { url: z.string().describe("Website URL to audit") },
    path: (a) => `/audit?${q({ url: a.url })}` },
  { name: "merchant_trust", title: "Merchant Trust ($0.05)",
    desc: "Is this online store safe to buy from? Scam/fraud check + trust verdict (safe/caution/avoid) + store signals (checkout, returns, payment methods) — counterparty trust for shopping & commerce agents before they pay. Costs $0.05 USDC on Base.",
    input: { url: z.string().describe("Store URL") },
    path: (a) => `/merchant?${q({ url: a.url })}` },
  { name: "token_intel", title: "Token Intel — Trust-Vetted ($0.05)",
    desc: "TRUST-VETTED token intelligence — price + market data PLUS a scam/rug-risk read on the project behind the coin (legit site? brand-new domain? red flags?). Only DYOE fuses market data with trust. Costs $0.05 USDC on Base.",
    input: { symbol: z.string().describe("Coin symbol, e.g. btc") },
    path: (a) => `/token?${q({ symbol: a.symbol })}` },
  { name: "extract_text", title: "Extract Page Text ($0.01)",
    desc: "Extract clean main text content from any web page (no nav/ads) — for research & summarizing agents. Costs $0.01 USDC on Base.",
    input: { url: z.string().describe("Page URL") }, path: (a) => `/extract?${q({ url: a.url })}` },
  { name: "extract_contacts", title: "Extract Contacts ($0.01)",
    desc: "Extract emails, phone numbers & social links from any website — lead enrichment & prospecting for agents. Costs $0.01 USDC on Base.",
    input: { url: z.string().describe("Website URL") }, path: (a) => `/contacts?${q({ url: a.url })}` },
  { name: "page_metadata", title: "Page Metadata ($0.01)",
    desc: "Extract title, description, OpenGraph image, favicon & canonical from any URL — link previews & summaries. Costs $0.01 USDC on Base.",
    input: { url: z.string().describe("Page URL") }, path: (a) => `/metadata?${q({ url: a.url })}` },
  { name: "crypto_price", title: "Crypto Price ($0.01)",
    desc: "Live crypto price + 24h change, market cap & volume for any coin — for trading agents. Costs $0.01 USDC on Base.",
    input: { symbol: z.string().describe("Coin symbol, e.g. eth") }, path: (a) => `/crypto?${q({ symbol: a.symbol })}` },
  { name: "crypto_market", title: "Crypto Market Overview ($0.01)",
    desc: "Global crypto market overview — total market cap, 24h change, BTC/ETH dominance. Costs $0.01 USDC on Base.",
    input: {}, path: () => `/market` },
  { name: "crypto_trending", title: "Trending Coins ($0.01)",
    desc: "The coins trending right now — for trading & research agents. Costs $0.01 USDC on Base.",
    input: {}, path: () => `/trending` },
  { name: "crypto_movers", title: "Top Movers ($0.01)",
    desc: "Top gainers & losers (24h) across the top 100 coins — for trading agents. Costs $0.01 USDC on Base.",
    input: {}, path: () => `/movers` },
  { name: "fx_rate", title: "Currency Conversion ($0.01)",
    desc: "Currency conversion + live exchange rate (ECB data). Costs $0.01 USDC on Base.",
    input: { from: z.string().describe("From currency, e.g. USD"), to: z.string().describe("To currency, e.g. EUR"),
             amount: z.string().optional().describe("Amount, default 1") },
    path: (a) => `/fx?${q({ from: a.from, to: a.to, amount: a.amount })}` },
  { name: "weather", title: "Weather ($0.01)",
    desc: "Current conditions + 3-day forecast for any city — for travel & planning agents. Costs $0.01 USDC on Base.",
    input: { city: z.string().describe("City, e.g. Atlanta") }, path: (a) => `/weather?${q({ city: a.city })}` },
  { name: "wiki_summary", title: "Wikipedia Summary ($0.01)",
    desc: "Factual summary of any topic from Wikipedia — for research agents. Costs $0.01 USDC on Base.",
    input: { topic: z.string().describe("Topic, e.g. Bitcoin") }, path: (a) => `/wiki?${q({ topic: a.topic })}` },
];

const server = new McpServer({ name: "dyoe-agent-tools", version: "1.0.0" });
for (const t of TOOLS) {
  server.registerTool(t.name, { title: t.title, description: t.desc, inputSchema: t.input },
    async (args) => call(t.path(args || {})));
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`DYOE Agent Tools MCP server running (stdio) — ${TOOLS.length} tools, base ${BASE}${KEY ? "" : " [PREVIEW: no wallet]"}`);
