<!-- mcp-name: io.github.bjyoe2016/dyoe-trust-mcp -->
# dyoe-trust-mcp

MCP server for **DYOE**, the trust layer for AI agents. It gives Claude, Cursor or any MCP client 22 pay-per-call tools
from [agents.dyoeway.org](https://agents.dyoeway.org): scam and fraud checks, payment pre-flight, wallet screening,
policy approval and human sign-off, contact extraction, company research, and data tools. Every call settles in
**USDC on Base via [x402](https://x402.org)**. You need no account or API key.

- **Free preview by default.** Without a wallet, each tool makes one unpaid request and returns the x402 payment
  requirements (HTTP 402: price, network, payTo). Nothing is signed or spent.
- **Paid mode.** Set `WALLET_PRIVATE_KEY` to a **dedicated, low-balance** Base wallet holding USDC. The key stays on
  your machine (stdio) and signs each payment locally. Each call is capped at `DYOE_MAX_PAYMENT_USD`
  (default `0.10`). Tools priced above the cap (`dyoe_review`, $15) are refused until you raise it.

## Install

### Claude Desktop
Add this to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`,
Windows: `%APPDATA%\Claude\claude_desktop_config.json`), then restart Claude:
```json
{
  "mcpServers": {
    "dyoe": {
      "command": "npx",
      "args": ["-y", "dyoe-trust-mcp"],
      "env": {
        "WALLET_PRIVATE_KEY": "",
        "DYOE_MAX_PAYMENT_USD": "0.10"
      }
    }
  }
}
```
Leave `WALLET_PRIVATE_KEY` empty for preview mode. The `.mcpb` bundle from the GitHub releases also installs with one
click (Settings > Extensions).

### Cursor
Add this to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):
```json
{
  "mcpServers": {
    "dyoe": {
      "command": "npx",
      "args": ["-y", "dyoe-trust-mcp"],
      "env": { "WALLET_PRIVATE_KEY": "", "DYOE_MAX_PAYMENT_USD": "0.10" }
    }
  }
}
```

### Smithery
```bash
npx -y @smithery/cli mcp add bjyoe2016/dyoe-trust-mcp --client claude   # or --client cursor
```

### Any MCP client
```bash
npx -y dyoe-trust-mcp          # stdio
```

## Tools (22)
Prices are what the endpoint charges per call. The live 402 is the authority, and every result reports the price it quoted.

| Tool | Price | What it does |
|---|---|---|
| `dyoe_verify` | $0.01 | DYOE Trust Check: Check whether a website, business, or wallet is a scam before an agent trusts or pays it — fraud, phishing and rug-risk screening. Returns verdict (safe/caution/avoid), trust_score, domain age, red_flags. Input: ?target=domain |
| `dyoe_transaction` | $0.10 | DYOE Payment Pre-Flight: Vet an entire payment before an agent sends money: is the counterparty site legit, is the payee wallet sanctioned or disposable, is the amount within policy. Returns proceed/caution/stop, reasons, and a signed attestation — one go/no-go instead of three calls. Input: ?domain=merchant.com&wallet=0x...&amount=500 |
| `dyoe_wallet` | $0.05 | DYOE Wallet Screening: Screen a crypto wallet address before an agent sends funds to it: OFAC sanctions check, on-chain footprint (empty or disposable address), human-vouch overlay. Returns verdict (safe/caution/avoid), sanctioned flag, on-chain activity, red_flags. Input: ?address=0x... |
| `dyoe_approve` | $0.02 | DYOE Policy Authorization: Approve or deny an agent action instantly against a human-set policy — no waiting. Returns a signed decision receipt; anything over the policy line escalates to a human. Input: ?action=&counterparty=&amount= (counterparty required) |
| `dyoe_review` | $15.00 | DYOE Human Sign-Off: Get a named human to review an agent action against a checklist and sign off on it. Poll /api/task?id=<id> for the signed receipt. Priced on the amount at stake. Input: ?action=&counterparty=&amount= (counterparty required) |
| `dyoe_contacts` | $0.01 | DYOE Contact Extraction: Extract public business emails, phone numbers, and social profiles from a website. Batch-safe contact enrichment for autonomous agents. Input: website URL. Returns structured JSON. |
| `dyoe_intel` | $0.10 | DYOE Company Research: Research a company or website in one call: what they do, legitimacy verdict, domain age, how to reach them, social presence, scam red flags — background checks for agents. Sources disclosed, not a black box: RDAP registry domain age, HTTPS reachability, on-page contact signals, DYOE human-vouch registry. Input: ?target=domain |
| `dyoe_merchant` | $0.05 | DYOE Store Safety Check: Is this online store safe to buy from? Scam/fraud check + trust verdict (safe/caution/avoid) + store signals (checkout, returns, payment methods) — counterparty trust for shopping & commerce agents before they pay. Input: ?url= |
| `dyoe_audit` | $0.05 | DYOE Website Audit: Score any website 0-100 for legitimacy, trust, SEO and contactability — due diligence on a company in one call. Returns a verdict plus prioritized fixes. Input: ?url=domain |
| `dyoe_reputation` | $0.05 | DYOE Reputation History: Look up the track record of any domain or wallet: how many times it has been assessed, verdict history, times flagged, first and last seen, a reputation score and a signed credential — a credit score for counterparties. Computed only from DYOE's own logged prior assessments; thin history is labeled as such. Input: ?target= |
| `dyoe_credential_org` | $0.10 | DYOE Org Credential: Issue a signed, independently verifiable credential that a business domain passed a trust check — returns verdict, trust_score and domain_age. Input: ?domain= |
| `dyoe_token` | $0.05 | DYOE Token Intelligence: Look up a token's price and market data plus a scam and rug-risk read on the project behind the coin — market data and counterparty trust in one call. Input: ?symbol= |
| `dyoe_extract` | $0.01 | DYOE Text Extraction: Extract clean main text content from any web page (no nav/ads) — for research & summarizing agents. Input: ?url= |
| `dyoe_metadata` | $0.01 | DYOE Page Metadata: Extract title, description, OpenGraph image, favicon & canonical from any URL — link previews & summaries. Input: ?url= |
| `dyoe_crypto` | $0.01 | DYOE Crypto Price: Live crypto price + 24h change, market cap & volume for any coin — for trading agents. Input: ?symbol=btc |
| `dyoe_market` | $0.01 | DYOE Crypto Market: Global crypto market overview — total market cap, 24h change, BTC/ETH dominance. Input: (none) |
| `dyoe_trending` | $0.01 | DYOE Trending Coins: The coins trending right now — for trading & research agents. Input: (none) |
| `dyoe_movers` | $0.01 | DYOE Top Movers: Top gainers & losers (24h) across the top 100 coins — for trading agents. Input: (none) |
| `dyoe_fx` | $0.01 | DYOE Currency Conversion: Currency conversion + live exchange rate (ECB data). Input: ?from=USD&to=EUR&amount=100 |
| `dyoe_weather` | $0.01 | DYOE Weather: Current conditions + 3-day forecast for any city — for travel & planning agents. Input: ?city=Atlanta |
| `dyoe_wiki` | $0.01 | DYOE Topic Summary: Factual summary of any topic from Wikipedia — for research agents. Input: ?topic=Bitcoin |
| `dyoe_destination` | $0.05 | DYOE Destination Intel: Get what a trip-planning agent needs before it books, in one call: weather and 3-day forecast, local currency with live FX from USD, and a scam check on the booking site before it pays. Input: ?city=Athens&date=2026-11-20&currency=EUR&booking=hotel-site.com&budget=1500 |

## Configuration
| Variable | Default | Meaning |
|---|---|---|
| `WALLET_PRIVATE_KEY` | unset | A dedicated, low-balance Base wallet holding USDC. Unset = free preview (402 quotes only). |
| `DYOE_MAX_PAYMENT_USD` | `0.10` | Per-call cap. Calls priced above it are refused locally. |
| `DYOE_BASE_URL` | `https://agents.dyoeway.org` | Override the API origin (testing). |

## Safety
- Use a burner wallet with a few dollars of USDC, never your main wallet.
- The server signs only x402 payments for the tool you call, up to the per-call cap.
- `dyoe_approve` and `dyoe_review` act on your behalf: they record an approval request with DYOE.

## License
MIT
