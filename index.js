#!/usr/bin/env node
// dyoe-trust-mcp: the DYOE x402 tool shelf (agents.dyoeway.org) as an MCP stdio server.
//
// One MCP tool per live paid endpoint (22). Names, prices, descriptions and inputs come from
// catalog.json, generated from the seller's catalog.js, which the seller's test suite keeps equal
// to the live 402 challenges. The 402 is still the authority: every result reports the price the
// endpoint actually quoted.
//
// Payment model (the wallet never leaves this machine):
//   - No WALLET_PRIVATE_KEY: PREVIEW mode. Each call makes one UNPAID request and returns the x402
//     payment requirements (HTTP 402). Nothing is signed or spent.
//   - WALLET_PRIVATE_KEY set (a dedicated, low-balance Base wallet holding USDC): calls are paid via
//     x402-fetch, capped per call at DYOE_MAX_PAYMENT_USD (default 0.10). Tools priced above the cap
//     (e.g. /review at $15) are refused locally until the cap is raised deliberately.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PKG = JSON.parse(fs.readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"));
const CATALOG = JSON.parse(fs.readFileSync(fileURLToPath(new URL("./catalog.json", import.meta.url)), "utf8"));
const BASE = (process.env.DYOE_BASE_URL || CATALOG.origin).replace(/\/$/, "");
const KEY = process.env.WALLET_PRIVATE_KEY || "";
const MAX_USD = Number(process.env.DYOE_MAX_PAYMENT_USD || 0.10);
const usd = (s) => Number(String(s).replace(/[$,]/g, ""));

let payFetch = null;
async function payingFetch() {
  if (payFetch) return payFetch;
  const [{ wrapFetchWithPayment }, { privateKeyToAccount }] = await Promise.all([import("x402-fetch"), import("viem/accounts")]);
  payFetch = wrapFetchWithPayment(fetch, privateKeyToAccount(KEY), BigInt(Math.round(MAX_USD * 1e6)));
  return payFetch;
}

export const toolName = (p) => "dyoe_" + p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();

function inputSchema(query) {
  const shape = {};
  for (const [k, q] of Object.entries(query)) {
    let t = q.type === "number" ? z.number() : z.string();
    t = t.describe(`${q.description}${q.example != null ? ` (e.g. ${q.example})` : ""}`);
    shape[k] = q.required ? t : t.optional();
  }
  return shape;
}

function decode402(res, body) {
  const h = res.headers.get("payment-required");
  let v2 = null;
  if (h) { try { v2 = JSON.parse(Buffer.from(h, "base64").toString()); } catch {} }
  const accepts = (body && body.accepts) || (v2 && v2.accepts) || [];
  const a = accepts[0] || {};
  const amt = a.maxAmountRequired ?? a.amount;
  return { price_usd: amt != null ? Number(amt) / 1e6 : null, network: a.network, asset: a.asset, payTo: a.payTo, x402Version: body && body.x402Version, accepts };
}

const text = (o, isError = false) => ({ content: [{ type: "text", text: typeof o === "string" ? o : JSON.stringify(o, null, 2) }], ...(isError ? { isError: true } : {}) });

async function callRoute(route, args) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) if (v != null && v !== "") qs.set(k, String(v));
  const url = `${BASE}${route.path}${qs.toString() ? "?" + qs : ""}`;
  const price = usd(route.price);
  try {
    if (!KEY) {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      const raw = await res.text();
      let body; try { body = JSON.parse(raw); } catch { body = raw; }
      if (res.status === 402) {
        return text({
          payment_required: true, status: 402, tool: route.path, listed_price: route.price, ...decode402(res, body),
          how: "PREVIEW mode: no WALLET_PRIVATE_KEY is set, so nothing was paid. Set WALLET_PRIVATE_KEY to a dedicated, " +
               "low-balance Base wallet holding USDC to call this tool for real, or pay the 402 at the URL yourself.",
          url,
        });
      }
      return text({ status: res.status, body }, !res.ok);
    }
    if (price > MAX_USD) {
      return text(`Refused locally: ${route.path} costs ${route.price}, above DYOE_MAX_PAYMENT_USD=$${MAX_USD.toFixed(2)}. ` +
                  "Raise DYOE_MAX_PAYMENT_USD deliberately to allow it.", true);
    }
    const res = await (await payingFetch())(url, { method: "GET", headers: { accept: "application/json" } });
    const raw = await res.text();
    let body; try { body = JSON.parse(raw); } catch { body = raw; }
    const pr = res.headers.get("x-payment-response");
    let settlement = null; if (pr) { try { settlement = JSON.parse(Buffer.from(pr, "base64").toString()); } catch {} }
    return text({ status: res.status, charged: !!(settlement && settlement.success !== false), settlement, body }, !res.ok);
  } catch (e) {
    return text(`Error calling ${route.path}: ${e.message || e}`, true);
  }
}

export function buildServer() {
  const server = new McpServer({ name: "dyoe-trust", version: PKG.version });
  for (const r of CATALOG.routes) {
    server.registerTool(toolName(r.path), {
      title: `${r.serviceName} (${r.price})`,
      description: `${r.description} Price: ${r.price} USDC on Base per call, paid via x402.`,
      inputSchema: inputSchema(r.query),
      annotations: { title: `${r.serviceName} (${r.price})`, readOnlyHint: r.path !== "/review" && r.path !== "/approve", openWorldHint: true },
    }, async (args) => callRoute(r, args));
  }
  return server;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildServer().connect(new StdioServerTransport());
  console.error(`dyoe-trust-mcp ${PKG.version} (stdio): ${CATALOG.routes.length} tools, ${BASE}${KEY ? `, paying up to $${MAX_USD.toFixed(2)}/call` : " [PREVIEW: no wallet, nothing is paid]"}`);
}
