# DYOE Agent Tools — MCP Server

Pay-per-call tools for AI agents, settled in **USDC on Base** via the [x402](https://www.x402.org) protocol. Trust checks, due-diligence, commerce signals, market data — plus the one thing nobody else sells: a **human-verified approval layer**.

> **The trust layer of the agent economy.** In a world of anonymous autonomous agents, intelligence is commodity and *trust* is the scarcity. These tools let an agent verify who it's about to trust or pay — and, when it matters, get a **real human** to sign off.

Live API: **https://agents.dyoeway.org** · Discovery manifest: [`/.well-known/x402.json`](https://agents.dyoeway.org/.well-known/x402.json)

📜 **Open protocol:** [Credential Spec](./SPEC.md) — verify any DYOE credential yourself, no permission needed.
🔎 **How we decide trust:** [Trust Methodology](./TRUST-METHODOLOGY.md) — our scoring, approvals, and how we handle mistakes.

## What's inside (16 tools)

| Tool | Price | What it does |
|---|---|---|
| `trust_check` | $0.01 | Scam/fraud/phishing/rug-risk verdict on any site, business, wallet or endpoint |
| `guardian_approve` | $3.00 | **Human-verified** approval of an agent action (a real person signs off) |
| `intel_dossier` | $0.10 | Full due-diligence dossier on a company/site in one call |
| `site_audit` | $0.05 | Trust + SEO + contactability audit, scored 0–100 |
| `merchant_trust` | $0.05 | Is this online store safe to buy from? |
| `token_intel` | $0.05 | Trust-vetted token data — price **+** scam/rug read on the project |
| `extract_text` · `extract_contacts` · `page_metadata` | $0.01 | Web extraction for research & enrichment agents |
| `crypto_price` · `crypto_market` · `crypto_trending` · `crypto_movers` | $0.01 | Market data for trading agents |
| `fx_rate` · `weather` · `wiki_summary` | $0.01 | Currency, weather & Wikipedia utilities |

## Install

Add to your MCP client config (e.g. Claude Desktop / Cursor):

```json
{
  "mcpServers": {
    "dyoe-agent-tools": {
      "command": "npx",
      "args": ["-y", "dyoe-agent-tools-mcp"],
      "env": {
        "WALLET_PRIVATE_KEY": "0x<your-funded-base-burner-wallet-private-key>"
      }
    }
  }
}
```

## 💳 Paying with x402

Each call spends USDC on **Base mainnet**, automatically, via x402 — no API keys, no subscriptions.

- **`WALLET_PRIVATE_KEY`** — a Base wallet that holds a little USDC. Payments are gasless for you (the facilitator covers gas).
- ⚠️ **Use a dedicated, low-balance burner wallet — never your primary.** The key stays on **your** machine and signs payments locally; it never leaves your device and is never sent to any registry or to DYOE.
- **No wallet?** The server still runs in **free PREVIEW mode** — it returns each tool's price quote instead of calling, so you can explore before funding a wallet.

## Links

- Live storefront & manifest: https://agents.dyoeway.org
- Built by [DYOE Way](https://dyoeway.org)

## License

MIT
