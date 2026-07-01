// dyoeGuard — the one-line trust layer for autonomous payments.
//
// Wrap your x402 paying fetch. Before ANY payment settles, DYOE verifies the payee;
// scam/avoid counterparties are blocked, and you can require human approval above a
// $ threshold. Turn an unguarded agent into a guarded one in a single line:
//
//   import { wrapFetchWithPayment } from "x402-fetch";
//   import { dyoeGuard } from "dyoe-agent-tools-mcp/guard";
//
//   const pay   = wrapFetchWithPayment(fetch, account);   // your normal x402 fetch
//   const safe  = dyoeGuard(pay);                          // ← one line. now every payee is verified.
//   await safe("https://some-seller.example/thing");      // blocked automatically if it's a scam
//
// The guard pays $0.01 per verify from the same wallet, and skips checking DYOE itself.

const DEFAULT_BASE = "https://agents.dyoeway.org";

export function dyoeGuard(payingFetch, opts = {}) {
  const {
    base = DEFAULT_BASE,
    blockVerdicts = ["avoid"],     // verdicts that hard-block the payment
    warnVerdicts = ["caution"],    // verdicts that trigger onWarn but proceed
    failClosed = false,            // if DYOE is unreachable: true = block, false = allow
    onWarn,                        // (attestation) => void  — called on a warn verdict
    onBlock,                       // (attestation) => void  — called before throwing on a block
  } = opts;

  const dyoeHost = new URL(base).host;

  return async function guardedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url;
    let host;
    try {
      host = new URL(url).host;
    } catch {
      return payingFetch(input, init); // not a URL we can parse — pass through
    }

    // Never guard calls to DYOE itself (avoids infinite recursion on the verify call).
    if (host === dyoeHost) return payingFetch(input, init);

    // Verify the payee before paying (costs $0.01, settled by the same wallet).
    let attestation = null;
    try {
      const res = await payingFetch(`${base}/verify?target=${encodeURIComponent(host)}`);
      attestation = await res.json();
    } catch (e) {
      if (failClosed) throw new Error(`dyoeGuard: verification unavailable, blocking payment to ${host} (${e.message})`);
      // fail-open: proceed unguarded
      return payingFetch(input, init);
    }

    const verdict = attestation?.verdict || "unknown";
    if (blockVerdicts.includes(verdict)) {
      if (onBlock) try { onBlock(attestation); } catch {}
      const err = new Error(
        `dyoeGuard BLOCKED payment to ${host}: verdict="${verdict}" trust_score=${attestation?.trust_score}. ` +
        `Signed attestation available; override via opts.blockVerdicts.`
      );
      err.attestation = attestation;
      throw err;
    }
    if (warnVerdicts.includes(verdict) && onWarn) {
      try { onWarn(attestation); } catch {}
    }

    // Cleared — make the real payment.
    return payingFetch(input, init);
  };
}

// Optional helper: ask DYOE whether a specific action needs human approval, and (if so)
// block until a human decides. Use for high-stakes/irreversible actions, not every call.
export async function requireApproval(payingFetch, { action, counterparty, amount, base = DEFAULT_BASE, pollMs = 5000, timeoutMs = 600000 } = {}) {
  const q = new URLSearchParams({ action: action || "", counterparty: counterparty || "", amount: String(amount ?? "") });
  const first = await (await payingFetch(`${base}/approve?${q}`)).json();
  if (first.decision !== "pending_human") return first; // approved / denied outright
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollMs));
    const s = await (await fetch(first.status_url)).json();
    if (s.status && s.status !== "pending") return { ...first, decision: s.status, authorization: s.authorization };
  }
  return { ...first, decision: "timeout" };
}
